/**
 * @file
 * Logger module for SDC update tool.
 *
 * Provides functions for console and file logging with enhanced features.
 */
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

// Log levels with emoji indicators for better visibility
export const LOG_LEVELS = {
  DEBUG: 0,  // 🔍 Detailed debugging information
  INFO: 1,   // ℹ️ General information
  SUCCESS: 2, // ✅ Operation completed successfully
  WARNING: 3, // ⚠️ Warning (non-critical issues)
  ERROR: 4    // ❌ Error (critical issues)
};

// Default log directory
const LOG_DIR = '.logs';
let currentLogFile = null;

// Maximum number of log files to keep
const MAX_LOG_FILES = 10;

/**
 * Initialize the logger
 *
 * Creates log directory if it doesn't exist and sets up the log file.
 * Also manages log rotation to prevent too many files from accumulating.
 *
 * @returns {Promise<void>}
 */
export async function initLogger() {
  // Create log directory if it doesn't exist
  try {
    await fs.access(LOG_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(LOG_DIR, { recursive: true });
    } else {
      throw error;
    }
  }

  // Create log filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  currentLogFile = path.join(LOG_DIR, `sdc-update-${timestamp}.log`);

  // Handle log rotation
  await rotateLogFiles();

  // Create a header for the log file
  const header = [
    '='.repeat(80),
    '  CivicTheme SDC Update Tool - Log Session',
    `  Started: ${now.toLocaleString()}`,
    '='.repeat(80),
    ''
  ].join('\n');

  // Write the header to the log file
  try {
    await fs.writeFile(currentLogFile, header, 'utf8');
  } catch (error) {
    console.error(chalk.red(`Failed to create log file: ${error.message}`));
  }

  // Write initial log entry
  await log(LOG_LEVELS.INFO, 'Logger initialized');
}

/**
 * Rotate log files to keep only the latest MAX_LOG_FILES files
 *
 * @returns {Promise<void>}
 */
async function rotateLogFiles() {
  try {
    // Get all log files
    const files = await fs.readdir(LOG_DIR);
    const logFiles = files
      .filter(file => file.startsWith('sdc-update-') && file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(LOG_DIR, file),
        stats: null
      }));

    // Get stats for each file
    for (const file of logFiles) {
      try {
        file.stats = await fs.stat(file.path);
      } catch {
        // Skip files that can't be accessed
        file.stats = { mtime: new Date(0) };
      }
    }

    // Sort by modification time (newest first)
    logFiles.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    // Delete older files if there are too many
    if (logFiles.length > MAX_LOG_FILES) {
      for (let i = MAX_LOG_FILES; i < logFiles.length; i++) {
        try {
          await fs.unlink(logFiles[i].path);
        } catch (error) {
          console.error(chalk.red(`Failed to delete old log file ${logFiles[i].name}: ${error.message}`));
        }
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error during log rotation: ${error.message}`));
  }
}

/**
 * Log a message to the console and log file
 *
 * @param {number} level - The log level (from LOG_LEVELS)
 * @param {string} message - The message to log
 * @param {boolean} consoleOnly - Whether to log only to console (not to file)
 * @returns {Promise<void>}
 */
export async function log(level, message, consoleOnly = false) {
  // Format the message for the console with emojis
  let consoleMessage;
  const timestamp = new Date().toISOString();

  // Get emoji and colored prefix based on level
  const { emoji, colorFunc, levelName } = getLogLevelInfo(level);

  // Format console message with emoji
  consoleMessage = colorFunc(`${emoji} [${levelName}] ${message}`);

  // Log to console
  console.log(consoleMessage);

  // Log to file if not console-only
  if (!consoleOnly && currentLogFile) {
    // Format the message for the log file
    const fileMessage = `${timestamp} [${levelName}] ${message}\n`;

    try {
      // Append to log file
      await fs.appendFile(currentLogFile, fileMessage, 'utf8');
    } catch (error) {
      console.error(chalk.red(`Failed to write to log file: ${error.message}`));
    }
  }
}

/**
 * Get emoji, color function, and level name for a given log level
 *
 * @param {number} level - The log level (from LOG_LEVELS)
 * @returns {Object} Object with emoji, color function, and level name
 */
function getLogLevelInfo(level) {
  switch (level) {
    case LOG_LEVELS.DEBUG:
      return {
        emoji: '🔍',
        colorFunc: chalk.gray,
        levelName: 'DEBUG'
      };
    case LOG_LEVELS.INFO:
      return {
        emoji: 'ℹ️',
        colorFunc: chalk.blue,
        levelName: 'INFO'
      };
    case LOG_LEVELS.SUCCESS:
      return {
        emoji: '✅',
        colorFunc: chalk.green,
        levelName: 'SUCCESS'
      };
    case LOG_LEVELS.WARNING:
      return {
        emoji: '⚠️',
        colorFunc: chalk.yellow,
        levelName: 'WARNING'
      };
    case LOG_LEVELS.ERROR:
      return {
        emoji: '❌',
        colorFunc: chalk.red,
        levelName: 'ERROR'
      };
    default:
      return {
        emoji: '📝',
        colorFunc: chalk.white,
        levelName: 'UNKNOWN'
      };
  }
}

/**
 * Get the current log file path
 *
 * @returns {string|null} The current log file path or null if no file is set
 */
export function getCurrentLogFilePath() {
  return currentLogFile;
}

/**
 * Log a debug message
 *
 * @param {string} message - The message to log
 * @param {boolean} consoleOnly - Whether to log only to console (not to file)
 * @returns {Promise<void>}
 */
export async function debug(message, consoleOnly = false) {
  return log(LOG_LEVELS.DEBUG, message, consoleOnly);
}

/**
 * Log an info message
 *
 * @param {string} message - The message to log
 * @param {boolean} consoleOnly - Whether to log only to console (not to file)
 * @returns {Promise<void>}
 */
export async function info(message, consoleOnly = false) {
  return log(LOG_LEVELS.INFO, message, consoleOnly);
}

/**
 * Log a success message
 *
 * @param {string} message - The message to log
 * @param {boolean} consoleOnly - Whether to log only to console (not to file)
 * @returns {Promise<void>}
 */
export async function success(message, consoleOnly = false) {
  return log(LOG_LEVELS.SUCCESS, message, consoleOnly);
}

/**
 * Log a warning message
 *
 * @param {string} message - The message to log
 * @param {boolean} consoleOnly - Whether to log only to console (not to file)
 * @returns {Promise<void>}
 */
export async function warning(message, consoleOnly = false) {
  return log(LOG_LEVELS.WARNING, message, consoleOnly);
}

/**
 * Log an error message
 *
 * @param {string} message - The message to log
 * @param {boolean} consoleOnly - Whether to log only to console (not to file)
 * @returns {Promise<void>}
 */
export async function error(message, consoleOnly = false) {
  return log(LOG_LEVELS.ERROR, message, consoleOnly);
}

export default {
  LOG_LEVELS,
  initLogger,
  log,
  debug,
  info,
  success,
  warning,
  error,
  getCurrentLogFilePath
};
