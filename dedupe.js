const fs = require('fs');
const content = fs.readFileSync('src/lib/translations.ts', 'utf8');

// Find the start and end of the object
const startIdx = content.indexOf('{');
const endIdx = content.lastIndexOf('}');
if (startIdx === -1 || endIdx === -1) {
  console.log('Object not found');
  process.exit(1);
}

const objText = content.substring(startIdx, endIdx + 1);

// We can just parse it using eval since we know it's a simple object
let obj;
try {
  obj = eval('(' + objText + ')');
} catch (e) {
  console.log('Eval error', e);
  process.exit(1);
}

const newContent = 'export const thTranslations: Record<string, string> = {\n' +
  Object.keys(obj).map(k => {
    const keyStr = (k.includes('-') || k.includes(' ') || k === 'true damage' || k === 'elemental damage' || k === 'follow-up') ? '"' + k + '"' : k;
    return '  ' + keyStr + ': ' + JSON.stringify(obj[k]);
  }).join(',\n') + '\n};\n';

fs.writeFileSync('src/lib/translations.ts', newContent, 'utf8');
console.log('Fixed duplicates in translations.ts');
