import { parse, stringify } from 'yaml';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
const NEW_CIVIC_DIR = `${import.meta.dirname}/monorepo-drupal/web/themes/contrib/civictheme`;
const SUBTHEME_DIRECTORY = '/Volumes/web/sites/civictheme-monorepo/web/themes/custom/dss';
const THEME_NAME = path.basename(SUBTHEME_DIRECTORY);

// ------------------------------------------------------------ INFO FILE
function createInfoYml() {
  const fromYmlContent = fs.readFileSync(`${NEW_CIVIC_DIR}/civictheme_starter_kit/civictheme_starter_kit.info.yml`, 'utf8');
  const fromYml = parse(fromYmlContent);

  const toYmlContent = fs.readFileSync(`${SUBTHEME_DIRECTORY}/${THEME_NAME}.info.yml`, 'utf8');
  const toYml = parse(toYmlContent);

  const mergeYml = { ...toYml };

  mergeYml['libraries-override'] = fromYml['libraries-override'];

  fs.writeFileSync(`${SUBTHEME_DIRECTORY}/${THEME_NAME}.info.yml`, stringify(mergeYml));
}
// ------------------------------------------------------------ LIBRARIES FILE
function createLibrariesYml() {
  const fromYmlContent = fs.readFileSync(`${NEW_CIVIC_DIR}/civictheme_starter_kit/civictheme_starter_kit.libraries.yml`, 'utf8');
  const fromYml = parse(fromYmlContent);

  const toYmlContent = fs.readFileSync(`${SUBTHEME_DIRECTORY}/${THEME_NAME}.libraries.yml`, 'utf8');
  const toYml = parse(toYmlContent);

  const mergeYml = { ...toYml };

  mergeYml['global'] = fromYml['global'];
  mergeYml['css-variables'] = fromYml['css-variables'];

  fs.writeFileSync(`${SUBTHEME_DIRECTORY}/${THEME_NAME}.libraries.yml`, stringify(mergeYml));
}
// ------------------------------------------------------------ PACKAGE JSON FILE
function updatePackageJson() {
  const fromJsonContent = fs.readFileSync(`${NEW_CIVIC_DIR}/civictheme_starter_kit/package.json`, 'utf8');
  const fromJson = JSON.parse(fromJsonContent);

  const toJsonContent = fs.readFileSync(`${SUBTHEME_DIRECTORY}/package.json`, 'utf8');
  const toJson = JSON.parse(toJsonContent);

  const mergeJson = { ...toJson };

  mergeJson.devDependencies['@storybook/addon-essentials'] = fromJson.devDependencies['@storybook/addon-essentials'];
  mergeJson.devDependencies['@storybook/addon-links'] = fromJson.devDependencies['@storybook/addon-links'];
  mergeJson.devDependencies['@storybook/html-vite'] = fromJson.devDependencies['@storybook/html-vite'];
  mergeJson.devDependencies['@storybook/manager-api'] = fromJson.devDependencies['@storybook/manager-api'];
  mergeJson.devDependencies['@storybook/theming'] = fromJson.devDependencies['@storybook/theming'];
  mergeJson.devDependencies['storybook'] = fromJson.devDependencies['storybook'];
  mergeJson.devDependencies['vite'] = fromJson.devDependencies['vite'];
  mergeJson.devDependencies['vite-plugin-twig-drupal'] = fromJson.devDependencies['vite-plugin-twig-drupal'];

  fs.writeFileSync(`${SUBTHEME_DIRECTORY}/package.json`, JSON.stringify(mergeJson, null, 2));
}
// ------------------------------------------------------------ REPLACE

function updateTwigNamespacing(twigFiles, namespaceMap) {
  for (const filePath of twigFiles) {
    const fileData = fs.readFileSync(filePath, 'utf8');
    const matches = fileData.matchAll(/@(base|atoms|molecules|organisms)\/([^/]+)\/([^/]+)\.twig/gi);
    const matchesArray = Array.from(matches).reverse();
    let updateData = fileData;

    matchesArray.forEach(match => {
      const idx = match.index;
      const str = match[0];
      const twigName = match[3];
      const namespace = namespaceMap[twigName] || 'civictheme';
      updateData = updateData.substring(0, idx) + namespace + ':' + twigName + updateData.substring(idx + str.length);
    });

    fs.writeFileSync(filePath, updateData, 'utf8');
  }
}

function getComponentNamespace() {
  const getComponentName = (component) => component.split('/').pop().split('.').shift();

  const coreComponents = globSync(`**/*.twig`, { cwd: path.resolve(SUBTHEME_DIRECTORY, '.components-civictheme') }).sort();
  const subComponents = globSync(`**/*.twig`, { cwd: path.resolve(SUBTHEME_DIRECTORY, 'components') }).sort();
  const newComponents = subComponents.filter(component => !coreComponents.includes(component));
  const overriddenComponents = subComponents.filter(component => coreComponents.includes(component));
  const componentToNamespace = {};
  coreComponents.forEach(component => componentToNamespace[getComponentName(component)] = 'civictheme');
  newComponents.forEach(component => componentToNamespace[getComponentName(component)] = THEME_NAME);
  return {
    newComponents: newComponents.map(i => `${path.resolve(SUBTHEME_DIRECTORY, 'components')}/${i}`),
    overriddenComponents: overriddenComponents.map(i => `${path.resolve(SUBTHEME_DIRECTORY, 'components')}/${i}`),
    componentToNamespace,
  };
}

function update() {
  const { componentToNamespace } = getComponentNamespace();

  createInfoYml();
  createLibrariesYml();
  updatePackageJson();

  updateTwigNamespacing(globSync(`${SUBTHEME_DIRECTORY}/components/**/*.twig`), componentToNamespace);
  updateTwigNamespacing(globSync(`${SUBTHEME_DIRECTORY}/templates/**/*.twig`), componentToNamespace);
}
update();
