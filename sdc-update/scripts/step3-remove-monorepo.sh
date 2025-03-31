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

# Remove pulled repo
log_message "Cleaning up..." "🧹"
if rm -rf monorepo-drupal; then
    log_message "Removed monorepo-drupal" "✅"
else
    log_message "Failed to remove monorepo-drupal" "❌"
fi
