const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const srcDir = path.join(__dirname, 'firefly_srtools_1.0', 'data');
const destDir = path.join(__dirname, 'public', 'data');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const filesToExtract = ['moc.json.br', 'pf.json.br', 'as.json.br', 'peak.json.br', 'monster.json.br'];

for (const file of filesToExtract) {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file.replace('.br', ''));

  if (fs.existsSync(srcPath)) {
    const compressedData = fs.readFileSync(srcPath);
    const decompressedData = zlib.brotliDecompressSync(compressedData);
    fs.writeFileSync(destPath, decompressedData);
    console.log(`Extracted ${file} to ${destPath}`);
  } else {
    console.log(`File not found: ${srcPath}`);
  }
}
