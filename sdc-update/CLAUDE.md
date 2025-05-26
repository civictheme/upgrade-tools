# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands
- Start: `npm run start` - runs the SDC update script with interactive CLI
- Test: `npm run test` - runs Jest tests with experimental VM modules
- Test (watch mode): `npm run test:watch` - runs Jest tests in watch mode
- Test app: `npm run test:app` - runs the test script in scripts/test.mjs
- Lint: `npm run lint` - lints JavaScript files using ESLint
- Lint (fix): `npm run lint:fix` - lints JavaScript files and fixes issues automatically

## Project Overview
This is a tool to automate upgrading CivicTheme Drupal subthemes to use Single Directory Components (SDC). The tool:

1. Updates Storybook configuration files 
2. Updates theme files with SDC namespacing
3. Uses Claude AI to analyze Twig templates and generate JSON schemas
4. Converts these schemas to SDC YAML format
5. Moves the generated files back to the subtheme

## Key Configuration
The tool requires:
- `SUBTHEME_DIRECTORY` - Path to the CivicTheme subtheme being upgraded
- `ANTHROPIC_API_KEY` - API key for Claude AI integration
- `ANTHROPIC_MODEL` - Model to use (defaults to claude-3-5-sonnet-20241022)

Configuration is stored in a `.env` file in the project root.

## Code Architecture
- `src/` - Contains the main application code
  - `index.mjs` - Entry point with main application loop and CLI interface
  - `wizard.mjs` - Configuration wizard for interactive setup
  - `update-runner.mjs` - Orchestrates the execution of update scripts
  - `lib/` - Core utility modules
    - `config.mjs` - Configuration management for .env file
    - `logger.mjs` - Logging system for console and file output
    - `validator.mjs` - Validation utilities for subtheme directory

- `scripts/` - Contains the core update scripts
  - `step1-update-storybook.sh` - Updates Storybook configuration
  - `step2-update-twig.mjs` - Updates theme files and adds SDC namespacing
  - `step3-remove-monorepo.sh` - Cleanup script
  - `step4-generate-component-json-schema.mjs` - Uses Claude AI to generate JSON schemas
  - `step5-generate-sdc-component-schema.mjs` - Converts JSON schemas to SDC YAML
  - `step6-move-yml.sh` - Moves YAML files to the subtheme components directory
  - `lib/` - Contains shared utilities
    - `components.mjs` - Component file management utilities
    - `llm-handler.mjs` - Claude AI integration with rate limiting

## Workflow Architecture
The application follows this workflow:
1. User starts the application with `npm start`
2. Main menu provides options to configure or run the update
3. Configuration wizard validates and saves settings
4. Update runner executes the six update scripts in sequence
5. Each step is logged to console and log file
6. At the end, a summary of the process is displayed

## Development Notes
- The project uses ES modules (type: "module" in package.json)
- All JavaScript files use .mjs extension
- Node.js 22+ is required (specified in engine field)
- Jest is configured to use experimental VM modules for ES module support
- The tool includes a user-friendly CLI interface using inquirer
- Logs are stored in the `.logs` directory with timestamped filenames
- The LLM integration includes rate limiting to prevent API throttling
- Error handling is implemented at multiple levels for robustness
- ESLint is configured with flat config format (eslint.config.mjs)