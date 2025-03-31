cd scripts

# Variables required for steps 1-3
export SUBTHEME_DIRECTORY="/path/to/subtheme/"

# Update Storybook config
bash ./step1-update-storybook.sh

# Update info.yml, libraries.yml, package.json, and update twig files with SDC namespace
node ./step2-update-twig.mjs

# Remove pulled repo
bash ./step3-remove-monorepo.sh

# Variables required for steps 4-5
export ANTHROPIC_API_KEY="KEY"
export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
export CIVICTHEME_UIKIT_PATH="$SUBTHEME_DIRECTORY"

# Use Anthropic to generate JSON schemas from twig files, and convert to SDC YML files.
node ./step4-generate-component-json-schema.mjs
node ./step5-generate-sdc-component-schema.mjs

# Move YAML files back into subtheme components
bash ./step6-move-yml.sh
