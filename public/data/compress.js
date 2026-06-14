const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Use the current folder where this file is located
const directoryPath = __dirname;

// Read the list of all files in the folder
const files = fs.readdirSync(directoryPath);

files.forEach(file => {
// Filter to include only .json files
if (file.endsWith('.json')) {
const inputFile = path.join(directoryPath, file);
const outputFile = path.join(directoryPath, `${file}.br`);

console.log(`⏳ Compressing file: ${file} ...`);

try {
// Read and compress file
const jsonBuffer = fs.readFileSync(inputFile);
const compressedData = zlib.brotliCompressSync(jsonBuffer, {
params: {
[zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Highest level compression
},
});

// Create .json.br file
fs.writeFileSync(outputFile, compressedData);
console.log(`✅ Success! File: ${file}.br`);
} catch (error) {
console.error(`❌ Error with file ${file}:`, error);
}
}
});

console.log('🎉 All JSON files successfully compressed!');