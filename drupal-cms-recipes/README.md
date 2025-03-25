## CivicTheme Drupal CMS Recipes

This is an in development repository of recipes to get CivicTheme enabled and setup in Drupal CMS

### Installation and setup

1. Install CivicTheme `composer require 'drupal/civictheme:^1.10'`
2. Run the recipes in the following order:
   - `civictheme_drupal_cms__preinstall`
   - `civictheme_drupal_cms`
   - `civictheme_drupal_cms__default_content`

These recipes should be installed with drush I have found I have had to include the full path
for drush to find these recipes and so within ddev this has looked like:

- `drush recipe /var/www/html/recipes/civictheme_preinstall`
- `drush recipe /var/www/html/recipes/civictheme_drupal_cms`
- `drush recipe /var/www/html/recipes/civictheme_drupal_cms__default_content`

Your Drupal CMS should now be setup to use CivicTheme and have default content installed to demonstrate.

This is an in-development recipe and so things will change, if you use please let us know if any
issues and we would love contributions to better them.

### Current known issues

Running the `civictheme_drupal_cms` without running the preinstall recipe leads to the following issue:

```
In DiscoveryTrait.php line 53:
                                                                                                                                                                            
  The "civictheme_three_columns" plugin does not exist. Valid plugin IDs for Drupal\Core\Layout\LayoutPluginManager are: layout_twocol_section, layout_threecol_section, l  
  ayout_fourcol_section, layout_onecol, layout_twocol, layout_twocol_bricks, layout_threecol_25_50_25, layout_threecol_33_34_33, navigation_layout, layout_builder_blank    
                                       
```

Installing the theme with the preinstall recipe and then installing the theme with all the config in a separate
recipe fixes this bug.

Not installing the default content leads to the menu blocks and other blocks not being setup. Recommend
installing default content to ensure it all works as expected.
