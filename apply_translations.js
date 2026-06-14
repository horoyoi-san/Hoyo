const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const translations = {
  changeRelic: "Change relic",
  characterPage: "Character",
  clearFile: "Clear File",
  clickOrDragFreesr: "Click or drag FreeSR JSON here",
  clickOrDragJson: "Click or drag JSON file here",
  configExportedSuccessfully: "Config exported successfully!",
  configureConnection: "Configure your private server connection settings",
  confirmImport: "Confirm Import",
  connectPs: "Connect PS",
  connectionType: "Connection Type",
  convertedJsonDownloaded: "Converted JSON downloaded",
  convertedDataNoRelics: "Converted data does not contain relics/characters",
  databaseCleared: "Database cleared successfully!",
  databaseExported: "Database exported successfully!",
  databaseImported: "Database imported successfully!",
  deleteRelic: "Delete relic",
  downloadConfig: "Download Config",
  downloadConvertedJson: "Download Converted JSON",
  downloadConfigJson: "Download config.json",
  downloadYourConfig: "Download your configuration for use with FreeSR",
  enhancedState: "Enhanced State",
  enterUid: "Enter UID...",
  equipLightcone: "Equip Lightcone",
  equipLightconeDesc: "Equip a lightcone to enhance your character's abilities",
  exportFullDatabase: "Export Full Database",
  failedToClearDatabase: "Failed to clear database.",
  failedToExport: "Failed to export",
  failedToExportConfig: "Failed to export config",
  failedToExportDatabase: "Failed to export database.",
  failedToImportData: "Failed to import data",
  failedToProcessImport: "Failed to process imported data",
  fileParsedSuccessfully: "File parsed successfully",
  filterByCharacter: "Filter by character...",
  filterBySet: "Filter by set...",
  firstNode: "First Node",
  firstNodeEnemies: "First node enemies",
  freesrJsonParsed: "FreeSR JSON parsed successfully",
  fullDatabaseExported: "Full database exported!",
  importDatabase: "Import Database",
  importFromFreeSR: "Import from FreeSR",
  importFromMihomo: "Import from Mihomo",
  importFromConfigJson: "Import from config.json (Reversed Rooms)",
  invalidJsonFile: "Invalid JSON file",
  invalidJsonFormat: "Invalid JSON format",
  invalidDatabaseFormat: "Invalid database format.",
  livePreview: "Live Preview",
  mainStat: "Main Stat",
  manageLocalData: "Manage your local data storage",
  maxAll: "Max All",
  noLightconeEquipped: "No Lightcone Equipped",
  noActiveSetBonuses: "No active set bonuses.",
  noCharacterSetsFound: "No character sets found.",
  noFileLoaded: "No file loaded",
  noRelicSetsFound: "No relic sets found.",
  noRelicsFound: "No relics found.",
  onlyCharactersDisplayed: "Only characters currently displayed in your in-game Profile Showcase can be imported.",
  passiveStatGain: "Passive Stat Gain",
  quickView: "Quick View",
  randomRolls: "Random Rolls",
  randomStats: "Random Stats",
  relicHasBeenAdded: "Relic has been added.",
  relicHasBeenUpdated: "Relic has been updated.",
  search: "Search...",
  secondNode: "Second Node",
  secondNodeEnemies: "Second node enemies",
  selectCharactersToRestore: "Select Characters to Restore",
  selectTypeAndSet: "Select a Type and Set to see preview",
  selectNodeOnMap: "Select a node on the map",
  selectRelicToEquip: "Select a relic to equip to the character.",
  selectRelicSet: "Select relic set",
  selectType: "Select type",
  skillsMap: "Skills Map",
  skipped: "Skipped",
  superimpose: "Superimpose",
  supportedFormatJson: "Supported format: .json",
  supportedFormatConfig: "Supported format: config.json",
  thirdNodeEnemies: "Third node enemies",
  battleModeComingSoon: "This battle mode configuration will be added in a future update.",
  replaceDataWarning: "This will replace all your current data with the imported data. Are you sure you want to proceed?",
  totalRelics: "Total Relics",
  toughness: "Toughness",
  uploadFreesrJson: "Upload your FreeSR JSON export file to convert and import it.",
  uploadConfigJson: "Upload your configuration JSON file to restore characters.",
  useCycleCount: "Use cycle count?",
  useTurbulenceBuff: "Use turbulence buff?",
  validCharacters: "Valid Characters",
  weakness: "Weakness",
  configJsonLoaded: "config.json loaded",
  toViewAndEditDetails: "to view and edit details."
};

const mapEntries = Object.entries(translations).sort((a,b) => b[1].length - a[1].length);

const files = getAllFiles(srcDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  let changed = false;

  for (const [key, text] of mapEntries) {
    const escapedText = text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // 1. Replace >text<
    const tagRegex = new RegExp(`>(\\s*)${escapedText}(\\s*)<`, 'g');
    if (tagRegex.test(content)) {
      content = content.replace(tagRegex, `>$1{t("${key}")}$2<`);
      changed = true;
    }

    // 2. Replace placeholder="text"
    const placeholderRegex = new RegExp(`placeholder="${escapedText}"`, 'g');
    if (placeholderRegex.test(content)) {
      content = content.replace(placeholderRegex, `placeholder={t("${key}")}`);
      changed = true;
    }

    // 3. Replace toast.xxx("text")
    const toastRegex = new RegExp(`(toast\\.(?:success|error|loading)\\(\\s*)"${escapedText}"`, 'g');
    if (toastRegex.test(content)) {
      content = content.replace(toastRegex, `$1t("${key}")`);
      changed = true;
    }

    // 4. Props like label="text"
    const propRegex = new RegExp(`([a-zA-Z0-9_]+)="${escapedText}"`, 'g');
    if (propRegex.test(content)) {
        content = content.replace(propRegex, (match, propName) => {
            if (['className', 'id', 'href', 'src', 'alt', 'value', 'name', 'type'].includes(propName)) return match;
            changed = true;
            return `${propName}={t("${key}")}`;
        });
    }
  }

  if (changed) {
    if (!content.includes('useTranslation')) {
      const importStatement = `\nimport { useTranslation } from "@/src/hooks/use-translation.hook";`;
      if (content.startsWith('"use client";') || content.startsWith("'use client';")) {
          content = content.replace(/(['"]use client['"];?)/, `$1\n${importStatement}`);
      } else {
          content = importStatement + '\n' + content;
      }
    }

    if (!content.includes('const { t } = useTranslation()')) {
      // Find component body
      // Looking for a { that follows an arrow function or normal function
      // that is likely a React component (starts with capital letter)
      
      const functionRegex = /(const\s+[A-Z]\w*\s*=\s*(?:\([^)]*\)\s*=>\s*\{|function\s*\([^)]*\)\s*\{)|export\s+default\s+function(?:\s+[A-Z]\w*)?\s*\([^)]*\)\s*\{|function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)/;
      
      const match = functionRegex.exec(content);
      if (match) {
        const insertPos = match.index + match[0].length;
        content = content.slice(0, insertPos) + '\n  const { t } = useTranslation();' + content.slice(insertPos);
      } else {
        console.log('Could not find component start in', file);
      }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
}
