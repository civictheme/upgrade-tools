# 🧩 CivicTheme SDC Update Tool

This tool automates the process of updating CivicTheme subthemes to use Single Directory Components (SDC). It provides an interactive CLI interface to guide you through the update process.

![CivicTheme SDC Update Tool](https://shields.io/badge/CivicTheme-SDC%20Update%20Tool-blue)

## ✨ Features

## 🚀 Quick Start

1. Clone this repository
2. Install dependencies: `npm install`
3. Run the application: `npm start`
4. Follow the interactive prompts to configure and run the update

## 📋 Prerequisites

- Node.js 22 or higher
- An Anthropic API key for accessing Claude AI services
- A valid CivicTheme subtheme
- Updated to CivicTheme 1.10.0

## ⚙️ Configuration

The tool requires the following configuration:

- **Subtheme Directory** - The path to your CivicTheme subtheme
- **Anthropic API Key** - Your Anthropic API key for accessing Claude AI services
- **Anthropic Model** (optional) - The Claude model to use (defaults to claude-sonnet-4-20250514)

Configuration is stored in a `.env` file in the project root directory.

## 🔄 Update Process

The update process consists of the following steps:

1. Prior to running this, update `CivicTheme` to 1.10.0 and complete this process (see)
2. **Update Storybook configuration** - Updates Storybook configuration files to match latest CivicTheme version
2. **Update theme files** - Updates theme files (info.yml, libraries.yml, package.json) and adds SDC namespacing to Twig templates
3. **Clean up temporary files** - Removes temporary files from the update process
4. **Generate JSON schemas** - Uses Claude AI to analyze Twig templates and generate JSON schemas
5. **Convert schemas to YAML** - Converts the JSON schemas to SDC YAML format
6. **Move files to subtheme** - Moves the generated SDC YAML files back into the subtheme components directory

## Usage

Run the interactive update tool:

```bash
npm run update-storybook
```

## ⚠️ Important Warnings

### Before Running the Tool

- **COMMIT YOUR CHANGES**: Make sure all your work is committed to version control
- **BACKUP YOUR FILES**: Create a backup of your sub-theme directory
- **TEST ENVIRONMENT**: Always run this locally or on a test server.

### File Modifications

This tool will modify or replace:
- `package.json` dependencies and scripts
- `build.js` dev compilation tools
- `.storybook` configuration files
- `component` structure - component namespaces will be changed, schema files created, CSS will be compiled 
to component directories 

## Troubleshooting

### Check the logs if any errors in running

Every step of this update script is logged in `.logs`. Review this log for any unexpected results or breaks in the
update script.

### Site is now breaking after rendering

There is an error in 1 or more of your components. You will need to check logs to see which component 
is throwing an error.

This is likely to happen so please note that this script just brings you much closer to completing the update
but will not complete it completely.

Recommend installing [SDC Devel](https://www.drupal.org/project/sdc_devel) and running the drush command
to check for errors within your component and manually fixing. Note this is also a style tool and will
uncover many warnings that do not affect the functionality of your site, start by fixing the errors
that are breaking your site first.

### Support

The script is provided as-is and is not guaranteed to work flawlessly, welcome contributions and
debugging and test cases. Please let us know how these scripts go and whether they helped or hindered
your update.

More debugging notes are appreciated in this README.md so if you have tips please let us know in 
#civictheme-designsystem.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
