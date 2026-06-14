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
const extractedTexts = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find text between JSX tags like >Text<
  const tagRegex = />([^<>{]+)</g;
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && /[a-zA-Z]/.test(text) && text.length > 1) {
      // Ignore if it's already using {t("...")} or just variables
      // Also ignore simple symbols or short letters.
      extractedTexts.add(text);
    }
  }

  // Find placeholder="..."
  const placeholderRegex = /placeholder="([^"]+)"/g;
  while ((match = placeholderRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && /[a-zA-Z]/.test(text)) {
      extractedTexts.add(text);
    }
  }
  
  // Find toast.success("...")
  const toastRegex = /toast\.(success|error|loading)\("([^"]+)"\)/g;
  while ((match = toastRegex.exec(content)) !== null) {
    const text = match[2].trim();
    if (text && /[a-zA-Z]/.test(text)) {
      extractedTexts.add(text);
    }
  }
}

// Convert to array and filter out known non-translatable strings or already translated
const excludeList = [
  "FreeSR", "Hoyolab", "Mihomo", "Enka", "UID", "JSON", "Relic", "URL"
];

const results = Array.from(extractedTexts)
  .map(t => t.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim())
  .filter(t => t.length > 2 && !excludeList.includes(t))
  .sort();

fs.writeFileSync('extracted_strings.txt', results.join('\n'));
console.log('Extracted', results.length, 'strings');
