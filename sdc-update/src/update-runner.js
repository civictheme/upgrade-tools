/**
 * @file
 * Update runner for SDC update tool.
 *
 * Wraps the original update scripts with logging and error handling.
 */
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import logger from './lib/logger.js';
import { loadConfig, validateConfig } from './lib/config.js';

const execFileAsync = promisify(execFile);

const UPDATE_STEPS = [
  {
    id: 'step1',
    name: 'Update Storybook configuration',
    emoji: '📚',
    script: './scripts/step1-update-storybook.sh',
    description: 'Updates Storybook configuration files to match latest CivicTheme version',
    detail: 'This step updates the Storybook configuration to be compatible with Single Directory Components'
  },
  {
    id: 'step2',
    name: 'Update theme files and add SDC namespacing',
    emoji: '🏷️',
    script: './scripts/step2-update-twig.mjs',
    description: 'Updates info.yml, libraries.yml, package.json, and adds SDC namespacing to Twig templates',
    detail: 'Modifies theme files to support SDC structure and adds proper namespacing to Twig templates'
  },
  {
    id: 'step3',
    name: 'Clean up temporary files',
    emoji: '🧹',
    script: './scripts/step3-remove-monorepo.sh',
    description: 'Removes pulled repository files after update',
    detail: 'Cleans up any temporary files created during the update process'
  },
  {
    id: 'step4',
    name: 'Generate JSON schemas from Twig templates',
    emoji: '🧠',
    script: './scripts/step4-generate-component-json-schema.mjs',
    description: 'Uses Claude AI to analyze Twig templates and generate JSON schemas',
    detail: 'Analyzes component templates with Claude AI to create JSON schemas that define component properties'
  },
  {
    id: 'step5',
    name: 'Convert JSON schemas to SDC YAML',
    emoji: '🔄',
    script: './scripts/step5-generate-sdc-component-schema.mjs',
    description: 'Converts JSON schemas to SDC YAML format',
    detail: 'Transforms the JSON schemas to Drupal SDC YAML format for component definition'
  },
  {
    id: 'step6',
    name: 'Move generated YAML files to subtheme',
    emoji: '📦',
    script: './scripts/step6-move-yml.sh',
    description: 'Moves the generated SDC YAML files back into the subtheme components directory',
    detail: 'Places all generated component definition files in the correct location within your subtheme'
  }
];

/**
 * Show a progress bar for the update process
 *
 * @param {number} current - Current step number (1-based)
 * @param {number} total - Total number of steps
 * @param {string} stepName - Name of the current step
 * @returns {string} Formatted progress bar string
 */
function progressBar(current, total, stepName) {
  const barWidth = 40;
  const progress = Math.min(current / total, 1);
  const filledWidth = Math.round(barWidth * progress);
  const emptyWidth = barWidth - filledWidth;

  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  const percentage = Math.round(progress * 100);

  return `${filled}${empty} ${percentage}% | Step ${current}/${total}: ${stepName}`;
}

/**
 * Run a script and capture its output with detailed logging
 *
 * @param {string} scriptPath - Path to the script to run
 * @param {Object} env - Environment variables to pass to the script
 * @param {Object} stepInfo - Information about the current step
 * @returns {Promise<{stdout: string, stderr: string}>} - Script output
 */
async function runScript(scriptPath, env = {}, stepInfo = {}) {
  const { stepNumber, totalSteps } = stepInfo;

  try {
    // Log script execution
    await logger.info(`Executing script: ${scriptPath}`);

    // Check if script exists
    try {
      await fs.access(scriptPath);
      await logger.debug(`Script exists: ${scriptPath}`);
    } catch (error) {
      await logger.error(`Script not found: ${scriptPath}`);
      throw new Error(`Script not found: ${scriptPath}`);
    }

    // Determine if script is executable or needs an interpreter
    const isJsModule = scriptPath.endsWith('.mjs');
    const isShellScript = scriptPath.endsWith('.sh');

    let command;
    let args = [];

    if (isJsModule) {
      command = 'node';
      args = [scriptPath];
      await logger.debug(`Running as Node.js module: ${command} ${args.join(' ')}`);
    } else if (isShellScript) {
      command = 'bash';
      args = [scriptPath];
      await logger.debug(`Running as shell script: ${command} ${args.join(' ')}`);
    } else {
      await logger.error(`Unsupported script type: ${scriptPath}`);
      throw new Error(`Unsupported script type: ${scriptPath}`);
    }

    // Merge process.env with provided env variables
    const scriptEnv = { ...process.env, ...env };
    await logger.debug(`Script environment prepared with ${Object.keys(env).length} custom variables`);

    // Print updating progress message
    if (stepNumber && totalSteps) {
      process.stdout.write(chalk.yellow(`\r${progressBar(stepNumber, totalSteps, 'Running script...')}`));
    }

    // Run the script
    const startTime = Date.now();
    const { stdout, stderr } = await execFileAsync(command, args, {
      env: scriptEnv,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for larger outputs
    });
    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(2);

    await logger.info(`Script execution completed in ${executionTime} seconds`);

    // Clear the progress message
    if (stepNumber && totalSteps) {
      process.stdout.write('\r' + ' '.repeat(100) + '\r');
    }

    return { stdout, stderr, executionTime };
  } catch (error) {
    // Clear the progress message
    if (stepNumber && totalSteps) {
      process.stdout.write('\r' + ' '.repeat(100) + '\r');
    }

    if (error.code === 'ENOENT') {
      await logger.error(`Script not found: ${scriptPath}`);
      throw new Error(`Script not found: ${scriptPath}`);
    }

    // If script execution failed, include stdout and stderr in the error
    if (error.stdout || error.stderr) {
      await logger.error(`Script execution failed: ${error.message}`);
      await logger.debug(`Script stdout: ${error.stdout || 'empty'}`);
      await logger.debug(`Script stderr: ${error.stderr || 'empty'}`);

      error.message = `Script execution failed: ${error.message}\nStdout: ${error.stdout || ''}\nStderr: ${error.stderr || ''}`;
    }

    throw error;
  }
}

/**
 * Run the SDC update process with enhanced progress reporting
 *
 * @returns {Promise<void>}
 */
export async function runUpdate() {
  try {
    await logger.info('Starting SDC update process');
    console.log(chalk.blue('\n🚀 Starting SDC update process\n'));

    // Validate configuration
    const configStatus = await validateConfig();
    if (!configStatus.valid) {
      await logger.error(`Invalid configuration: ${configStatus.message}`);
      throw new Error(`Invalid configuration: ${configStatus.message}`);
    }

    // Load configuration
    const config = await loadConfig();
    await logger.info(`Loaded configuration for subtheme: ${config.subthemeDirectory}`);

    // Create environment variables for scripts
    const scriptEnv = {
      SUBTHEME_DIRECTORY: config.subthemeDirectory,
      ANTHROPIC_API_KEY: config.anthropicApiKey,
      ANTHROPIC_MODEL: config.anthropicModel,
      CIVICTHEME_UIKIT_PATH: config.subthemeDirectory
    };

    // Display update plan header
    console.log(chalk.blue('\n📋 Update Plan:'));
    for (const [index, step] of UPDATE_STEPS.entries()) {
      const stepNumber = index + 1;
      console.log(chalk.white(`  ${step.emoji} [${stepNumber}/${UPDATE_STEPS.length}] ${step.name}`));
    }
    console.log(''); // Empty line for spacing

    // Initialize metrics
    const metrics = {
      startTime: Date.now(),
      stepTimes: []
    };

    for (const [index, step] of UPDATE_STEPS.entries()) {
      const stepNumber = index + 1;
      const stepStartTime = Date.now();

      console.log(chalk.yellow(`\n${step.emoji} [${stepNumber}/${UPDATE_STEPS.length}] ${step.name}`));
      console.log(chalk.white(step.detail || step.description));

      await logger.info(`Starting step ${stepNumber}/${UPDATE_STEPS.length}: ${step.name}`);
      await logger.debug(`Step details: ${step.detail || step.description}`);

      try {
        const { stdout, stderr, executionTime } = await runScript(step.script, scriptEnv, {
          stepNumber,
          totalSteps: UPDATE_STEPS.length
        });

        if (stdout) {
          await logger.debug(`Step ${stepNumber} stdout: ${stdout}`);

          if (stdout.length < 500) {
            console.log(chalk.gray(stdout));
          } else {
            console.log(chalk.gray(`Script output (${stdout.length} characters) - see log file for details`));
          }
        }

        if (stderr) {
          await logger.warning(`Step ${stepNumber} stderr: ${stderr}`);
          console.log(chalk.yellow(`Warning output: ${stderr.substring(0, 200)}${stderr.length > 200 ? '...' : ''}`));
        }

        const stepEndTime = Date.now();
        const stepDuration = (stepEndTime - stepStartTime) / 1000;
        metrics.stepTimes.push({ step: step.name, duration: stepDuration });

        console.log(chalk.green(`✅ Step ${stepNumber} completed successfully (${stepDuration.toFixed(2)}s)`));
        await logger.success(`Step ${stepNumber} completed successfully in ${stepDuration.toFixed(2)} seconds`);
      } catch (error) {
        console.error(chalk.red(`❌ Step ${stepNumber} failed: ${error.message}`));
        await logger.error(`Step ${stepNumber} failed: ${error.message}`);
        throw new Error(`Step ${stepNumber} failed: ${error.message}`);
      }
    }

    const totalTime = (Date.now() - metrics.startTime) / 1000;
    await logger.info(`Total execution time: ${totalTime.toFixed(2)} seconds`);

    // Log step timing information
    await logger.info('Step timing breakdown:');
    for (const stepMetric of metrics.stepTimes) {
      await logger.info(`- ${stepMetric.step}: ${stepMetric.duration.toFixed(2)}s (${(stepMetric.duration / totalTime * 100).toFixed(1)}%)`);
    }

    console.log(chalk.green('\n✅ SDC update process completed successfully!'));
    console.log(chalk.blue(`⏱️  Total time: ${totalTime.toFixed(2)} seconds`));
    console.log(chalk.gray(`📝 Full logs available at: ${logger.getCurrentLogFilePath() || 'unknown'}\n`));

    await logger.success('SDC update process completed successfully');
  } catch (error) {
    console.error(chalk.red(`\n❌ Error running SDC update: ${error.message}\n`));
    await logger.error(`Error running SDC update: ${error.message}`);
    throw error;
  }
}

export default {
  runUpdate
};
