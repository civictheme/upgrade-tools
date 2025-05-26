# 🧩 CivicTheme SDC Update Tool

This tool automates the process of updating CivicTheme subthemes to use Single Directory Components (SDC). It provides an interactive CLI interface to guide you through the update process.

![CivicTheme SDC Update Tool](https://shields.io/badge/CivicTheme-SDC%20Update%20Tool-blue)

## ✨ Features

## 🚀 Quick Start

1. Clone this repository
2. Install dependencies: `npm install`
3. Run the application: `npm start`
4. Follow the interactive prompts to configure and run the update

## 📋 Requirements

- Node.js 22 or higher
- A valid CivicTheme subtheme directory
- An Anthropic API key for accessing Claude AI services

## ⚙️ Configuration

The tool requires the following configuration:

- **Subtheme Directory** - The path to your CivicTheme subtheme
- **Anthropic API Key** - Your Anthropic API key for accessing Claude AI services
- **Anthropic Model** (optional) - The Claude model to use (defaults to claude-sonnet-4-20250514)

Configuration is stored in a `.env` file in the project root directory.

## 🔄 Update Process

The update process consists of the following steps:

1. **Update Storybook configuration** - Updates Storybook configuration files to match latest CivicTheme version
2. **Update theme files** - Updates theme files (info.yml, libraries.yml, package.json) and adds SDC namespacing to Twig templates
3. **Clean up temporary files** - Removes temporary files from the update process
4. **Generate JSON schemas** - Uses Claude AI to analyze Twig templates and generate JSON schemas
5. **Convert schemas to YAML** - Converts the JSON schemas to SDC YAML format
6. **Move files to subtheme** - Moves the generated SDC YAML files back into the subtheme components directory

## 📝 Logs

Logs are stored in the `.logs` directory in the project root. Each run of the application creates a new log file with a timestamp in the filename. Log rotation is automatically managed to prevent too many files from accumulating.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
