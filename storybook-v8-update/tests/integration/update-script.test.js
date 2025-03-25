/**
 * Integration test for the build and storybook update script
 * 
 * This test creates a test fixture subtheme, runs the update script against it,
 * and verifies that the expected changes are made.
 */

const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { execSync } = require('child_process');

// Setup paths
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const TEST_SUBTHEME_NAME = 'test_subtheme';
const TEST_SUBTHEME_DIR = path.join(FIXTURES_DIR, TEST_SUBTHEME_NAME);

// Files expected to be removed by the script
const EXPECTED_REMOVED_FILES = [
  '.storybook',
  'webpack',
  'dist',
  '.components-civictheme',
  'components_combined',
  'patches',
  'gulpfile.js',
  'package-lock.json',
  'package.json',
  '.nvmrc'
];

// Files expected to be added by the script
const EXPECTED_ADDED_FILES = [
  '.storybook',
  'package.json',
  'package-lock.json',
  'build.js',
  'vite.config.js',
  '.nvmrc'
];

/**
 * Creates a test fixture subtheme with the necessary files
 */
async function setupTestFixture() {
  console.log('Setting up test fixture...');
  
  // Create test directory structure
  await fs.mkdir(FIXTURES_DIR, { recursive: true });
  await fs.mkdir(TEST_SUBTHEME_DIR, { recursive: true });
  
  // Create components directory
  await fs.mkdir(path.join(TEST_SUBTHEME_DIR, 'components'), { recursive: true });
  
  // Create info.yml file
  const infoYmlContent = `name: Test Subtheme
type: theme
base theme: civictheme
description: 'Test subtheme for script integration tests'`;
  
  await fs.writeFile(path.join(TEST_SUBTHEME_DIR, `${TEST_SUBTHEME_NAME}.info.yml`), infoYmlContent);
  
  // Create test story file
  const storyContent = `import { text, boolean } from '@storybook/addon-knobs';
export default { title: 'Test Component' };
export const Default = () => {
  const content = text('Content', 'Default content');
  const isActive = boolean('Active', false);
  return '<div>' + content + '</div>';
};`;
  
  await fs.mkdir(path.join(TEST_SUBTHEME_DIR, 'components', 'test-component'), { recursive: true });
  await fs.writeFile(
    path.join(TEST_SUBTHEME_DIR, 'components', 'test-component', 'test-component.stories.js'),
    storyContent
  );
  
  // Create files that should be removed
  for (const file of EXPECTED_REMOVED_FILES) {
    if (file.endsWith('/')) {
      await fs.mkdir(path.join(TEST_SUBTHEME_DIR, file), { recursive: true });
    } else {
      await fs.writeFile(path.join(TEST_SUBTHEME_DIR, file), 'Test content');
    }
  }
}

/**
 * Cleans up the test fixture
 */
async function cleanupTestFixture() {
  try {
    await fs.rm(FIXTURES_DIR, { recursive: true, force: true });
    console.log('Test fixture cleaned up.');
  } catch (error) {
    console.error('Error cleaning up test fixture:', error);
  }
}

/**
 * Runs the update script against the test fixture
 */
function runUpdateScript() {
  console.log('Running update script...');
  
  // Create a modified version of the script for testing
  const originalScriptPath = path.resolve(__dirname, '../../scripts/update-build-and-storybook.sh');
  const testScriptPath = path.resolve(__dirname, './test-update-script.sh');
  
  // Read the original script
  const originalScript = execSync(`cat ${originalScriptPath}`, { encoding: 'utf8' });
  
  // Modify the script to skip the monorepo clone and use a mock instead
  let testScript = originalScript.replace(
    /# Step 2: Pull the civictheme-monorepo[\s\S]*?fi\n\nNEW_CIVIC_DIR=/g,
    `# Step 2: Using mock monorepo\nlog_message "Using mock monorepo" "📥"\nNEW_CIVIC_DIR=`
  );
  
  // Create the test script file
  fsSync.writeFileSync(testScriptPath, testScript);
  execSync(`chmod +x ${testScriptPath}`);
  
  // Set up a mock monorepo directory
  const mockMonorepoDir = path.resolve(__dirname, './mock-monorepo/web/themes/contrib/civictheme/civictheme_starter_kit');
  execSync(`mkdir -p ${mockMonorepoDir}/.storybook`);
  execSync(`mkdir -p ${mockMonorepoDir}`);
  
  // Create mock files in the monorepo
  for (const file of EXPECTED_ADDED_FILES) {
    if (file === '.storybook') {
      execSync(`echo "Mock storybook config" > ${mockMonorepoDir}/.storybook/main.js`);
    } else {
      execSync(`echo "Mock content for ${file}" > ${mockMonorepoDir}/${file}`);
    }
  }
  
  // Run the modified script with the test subtheme
  execSync(`SUBTHEME_DIRECTORY=${TEST_SUBTHEME_DIR} ${testScriptPath}`, {
    stdio: 'inherit'
  });
}

/**
 * Verifies that the expected changes were made to the test fixture
 */
async function verifyChanges() {
  console.log('Verifying changes...');
  let errors = 0;
  
  // Check for added files
  for (const file of EXPECTED_ADDED_FILES) {
    try {
      await fs.access(path.join(TEST_SUBTHEME_DIR, file));
      console.log(`✅ Found expected added file: ${file}`);
    } catch (error) {
      console.error(`❌ Missing expected added file: ${file}`);
      errors++;
    }
  }
  
  // Check for original info.yml and components
  try {
    await fs.access(path.join(TEST_SUBTHEME_DIR, `${TEST_SUBTHEME_NAME}.info.yml`));
    console.log(`✅ Preserved info.yml file`);
  } catch (error) {
    console.error(`❌ Missing info.yml file`);
    errors++;
  }
  
  try {
    await fs.access(path.join(TEST_SUBTHEME_DIR, 'components', 'test-component', 'test-component.stories.js'));
    console.log(`✅ Preserved component story files`);
  } catch (error) {
    console.error(`❌ Missing component story files`);
    errors++;
  }
  
  if (errors === 0) {
    console.log('✅ All expected changes were verified');
    return true;
  } else {
    console.error(`❌ Found ${errors} errors in verification`);
    return false;
  }
}

/**
 * Main test function
 */
async function runTest() {
  try {
    await setupTestFixture();
    runUpdateScript();
    const success = await verifyChanges();
    await cleanupTestFixture();
    
    if (success) {
      console.log('✅ Integration test passed');
      process.exit(0);
    } else {
      console.error('❌ Integration test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running test:', error);
    await cleanupTestFixture();
    process.exit(1);
  }
}

// Run the test
runTest();