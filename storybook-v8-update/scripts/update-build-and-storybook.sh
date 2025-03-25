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
log_message "Cloning monorepo-drupal..." "📥"
if rm -rf monorepo-drupal; then
    log_message "Removed existing monorepo-drupal directory" "🗑️"
fi
# Tag before we next update.
if git clone git@github.com:civictheme/monorepo-drupal.git; then
    log_message "Successfully cloned monorepo-drupal" "✅"
else
    log_message "Failed to clone monorepo-drupal" "❌"
    exit 1
fi

NEW_CIVIC_DIR="$(pwd)/monorepo-drupal/web/themes/contrib/civictheme"
log_message "SUBTHEME_DIRECTORY: $SUBTHEME_DIRECTORY" "📁"
log_message "NEW_CIVIC_DIR: $NEW_CIVIC_DIR" "📁"

# Step 3: Remove old files
log_message "Removing old files from subtheme..." "🗑️"
for file in ".storybook" "webpack" "dist" ".components-civictheme" "components_combined" "patches" "gulpfile.js" "package-lock.json" "package.json" ".nvmrc"; do
    if rm -rf "$SUBTHEME_DIRECTORY/${file:?}"; then
        log_message "Removed $file" "✅"
    else
        log_message "Failed to remove $file" "⚠️"
    fi
done

# Step 4: Add new files
log_message "Adding new files to subtheme..." "📝"
if rsync -a "$NEW_CIVIC_DIR/civictheme_starter_kit/.storybook/" "$SUBTHEME_DIRECTORY/.storybook/"; then
    log_message "Copied .storybook directory" "✅"
else
    log_message "Failed to copy .storybook directory" "❌"
fi

for file in "package.json" "package-lock.json" "build.js" "vite.config.js" ".nvmrc"; do
    if cp -Rf "$NEW_CIVIC_DIR/civictheme_starter_kit/$file" "$SUBTHEME_DIRECTORY/$file"; then
        log_message "Copied $file" "✅"
    else
        log_message "Failed to copy $file" "❌"
    fi
done

# Step 5: Remove pulled repo
log_message "Cleaning up..." "🧹"
if rm -rf monorepo-drupal; then
    log_message "Removed monorepo-drupal" "✅"
else
    log_message "Failed to remove monorepo-drupal" "⚠️"
fi

# Step 6: List stories that need updating
log_message "Finding stories that need to be updated..." "🔍"
echo "--------------------------------------------------------" | tee -a "$LOG_FILE"
log_message "The following stories need to be updated:" "📚"
echo "--------------------------------------------------------" | tee -a "$LOG_FILE"
find "$SUBTHEME_DIRECTORY/components" -name "*.stories.js" | tee -a "$LOG_FILE"
