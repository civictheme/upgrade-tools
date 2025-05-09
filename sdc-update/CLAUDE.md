# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands
- Start: `npm run start` - runs the SDC update script
- Test: `npm run test` - runs Jest tests
- Lint: `npm run lint` - lints JavaScript files using ESLint

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

## Code Architecture
- `scripts/` - Contains the core update scripts
  - `step1-update-storybook.sh` - Updates Storybook configuration
  - `step2-update-twig.mjs` - Updates theme files and adds SDC namespacing
  - `step3-remove-monorepo.sh` - Cleanup script
  - `step4-generate-component-json-schema.mjs` - Uses Claude AI to generate JSON schemas
  - `step5-generate-sdc-component-schema.mjs` - Converts JSON schemas to SDC YAML
  - `step6-move-yml.sh` - Moves YAML files to the subtheme components directory
  - `lib/` - Contains shared utilities
    - `components.js` - Component file management utilities
    - `llm-handler.js` - Claude AI integration

## Development Notes
- The project uses ES modules (type: "module" in package.json)
- Jest is configured to use experimental VM modules for ES module support
- The tool is being updated to add a more user-friendly CLI interface using inquirer