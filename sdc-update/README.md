# SDC Update

This script automates the process of updating CivicTheme subthemes to use Single Directory Components (SDC). It performs the following steps:

1. Updates Storybook configuration files to match latest CivicTheme version
2. Updates theme files (info.yml, libraries.yml, package.json) and adds SDC namespacing to Twig templates
3. Cleans up temporary files from update process
4. Uses Claude AI to analyze Twig templates and generate JSON schemas, then converts these to SDC YAML format
5. Moves the generated SDC YAML files back into the subtheme components directory

The script requires configuration of paths and API keys - see Quick Start section below for setup instructions.

## Quick Start

The following variables are required:

- SUBTHEME_DIRECTORY  - The path to your subtheme
- ANTHROPIC_API_KEY   - The key to access the anthropic api
