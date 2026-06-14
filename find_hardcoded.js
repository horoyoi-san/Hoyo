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

const files = getAllFiles(srcDir);
const found = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find text like >Text<
  const textRegex = />([^<>{]+)</g;
  let match;
  while ((match = textRegex.exec(content)) !== null) {
    const text = match[1].trim();
    // Exclude purely symbolic or numeric text, empty text, short text that is just punctuation
    if (text && text.length > 1 && /[a-zA-Z]/.test(text) && !text.includes('import ') && !text.includes('export ')) {
        // Also check if it's already translated using something like >{t("key")}<
        // Since we extracted > text < we need to see what it is
        found.add(text);
    }
  }

  // Find placeholder="Text"
  const placeholderRegex = /placeholder="([^"]+)"/g;
  while ((match = placeholderRegex.exec(content)) !== null) {
      if (/[a-zA-Z]/.test(match[1])) {
          found.add(match[1]);
      }
  }
}

fs.writeFileSync('remaining_hardcoded.txt', Array.from(found).sort().join('\n'), 'utf8');
console.log('Saved to remaining_hardcoded.txt');
