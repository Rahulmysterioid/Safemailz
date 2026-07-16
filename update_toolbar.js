const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dashboard.html');
const scratchPath = 'C:\\Users\\inweo\\.gemini\\antigravity-ide\\brain\\16100c74-7f8d-49f0-9b53-d260f2befb7f\\scratch\\toolbar.html';

let html = fs.readFileSync(htmlPath, 'utf8');
const replacement = fs.readFileSync(scratchPath, 'utf8');

const startMarker = '<!-- Compose Formatting Toolbar (shown when composing, hidden otherwise) -->';
const endMarker = '<!-- To Row -->';

const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const newHtml = html.substring(0, startIndex) + replacement + '\n' + ' '.repeat(20) + html.substring(endIndex);

fs.writeFileSync(htmlPath, newHtml);
console.log("HTML Updated successfully!");
