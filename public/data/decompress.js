const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Use the current folder where this file is located
const directoryPath = __dirname;

// Read the list of all files in the folder
const files = fs.readdirSync(directoryPath);

files.forEach(file => {
// Filter out only files ending in .json.br
if (file.endsWith('.json.br')) {
const inputFile = path.join(directoryPath, file);
// Remove .br to get the original filename (e.g., moc.json.br becomes moc.json)
const outputFile = path.join(directoryPath, file.replace('.br', ''));

console.log(`⏳ Decompressing file: ${file} ...`);

try {
// Read the compressed file and decompress it
const compressedBuffer = fs.readFileSync(inputFile);
const decompressedData = zlib.brotliDecompressSync(compressedBuffer);

// Create a .json file back
fs.writeFileSync(outputFile, decompressedData);
console.log(`✅ Success! File returned as: ${file.replace('.br', '')}`);
} catch (error) {
console.error(`❌ An error occurred with file ${file}:`, error);
}
}
});

console.log('🎉 All files have been successfully decompressed back to JSON!');