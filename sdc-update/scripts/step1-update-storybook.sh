#!/bin/bash

# Create .logs directory if it doesn't exist
mkdir -p .logs

# Create a log file with timestamp
LOG_FILE=".logs/update-$(date '+%Y%m%d-%H%M%S').log"

# Function to log messages
log_message() {
    local message="$1"
    local emoticon="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Log to file
    echo "[$timestamp] $message" >> "$LOG_FILE"

    # Log to STDOUT with emoticon
    echo "$emoticon $message"
}

# Step 1: Check variables
if [ -z "$SUBTHEME_DIRECTORY" ]; then
    log_message "Error: SUBTHEME_DIRECTORY is empty. Please set variable to the location of the subtheme in the site to upgrade." "❌"
    exit 1
elif [ ! -d "$SUBTHEME_DIRECTORY" ]; then
    log_message "Error: $SUBTHEME_DIRECTORY does not exist. Please check the location of the subtheme in the site to upgrade." "❌"
    exit 1
fi

# Step 2: Pull the civictheme-monorepo
if [ -d "monorepo-drupal" ]; then
    log_message "monorepo-drupal directory already exists, skipping clone" "✔️"
else
    log_message "Cloning monorepo-drupal..." "📥"
    # Tag before we next update.
    if git clone -b 1.11.0 git@github.com:civictheme/monorepo-drupal.git; then
        log_message "Successfully cloned monorepo-drupal" "✅"
    else
        log_message "Failed to clone monorepo-drupal" "❌"
        exit 1
    fi
fi

NEW_CIVIC_DIR="$(pwd)/monorepo-drupal/web/themes/contrib/civictheme"
log_message "SUBTHEME_DIRECTORY: $SUBTHEME_DIRECTORY" "📁"
log_message "NEW_CIVIC_DIR: $NEW_CIVIC_DIR" "📁"

# Step 2.5: Run npm install in the cloned civictheme directory to generate components
log_message "Running npm install in civictheme directory to generate components..." "📦"
cd "$NEW_CIVIC_DIR" || exit 1
if npm install; then
    log_message "Successfully ran npm install in civictheme directory" "✅"
else
    log_message "Failed to run npm install in civictheme directory" "❌"
    exit 1
fi
cd - > /dev/null || exit 1

# Step 3: Remove old files
log_message "Removing old files from subtheme..." "🗑️"
for file in "node_modules" "package-lock.json"; do
    if rm -rf "$SUBTHEME_DIRECTORY/${file:?}"; then
        log_message "Removed $file" "✅"
    else
        log_message "Failed to remove $file" "⚠️"
    fi
done

# Step 4: Add new files
for file in ".storybook/preview.js" ".storybook/sdc-plugin.js" "build.js" "vite.config.js"; do
    if cp -Rf "$NEW_CIVIC_DIR/civictheme_starter_kit/$file" "$SUBTHEME_DIRECTORY/$file"; then
        log_message "Copied $file" "✅"
    else
        log_message "Failed to copy $file" "❌"
    fi
done
