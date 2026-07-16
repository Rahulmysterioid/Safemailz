const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dashboard.html');
const scratchPath = 'C:\\Users\\inweo\\.gemini\\antigravity-ide\\brain\\16100c74-7f8d-49f0-9b53-d260f2befb7f\\scratch\\toolbar_v3.html';

let html = fs.readFileSync(htmlPath, 'utf8');
const replacement = fs.readFileSync(scratchPath, 'utf8');

const startMarker = '<div class="email-composer-toolbar" id="formatToolbar"';
const startIndex = html.indexOf(startMarker);

if (startIndex === -1) {
    console.error("Format toolbar start marker not found");
    process.exit(1);
}

// Simple parser to find the matching closing </div>
let i = startIndex;
let depth = 0;
let endIndex = -1;

while (i < html.length) {
    if (html.substring(i, i + 4) === '<div') {
        depth++;
        i += 4;
    } else if (html.substring(i, i + 5) === '</div') {
        depth--;
        if (depth === 0) {
            endIndex = i + 5; // Include the '</div'
            break;
        }
        i += 5;
    } else {
        i++;
    }
}

if (endIndex === -1) {
    console.error("Could not find closing div");
    process.exit(1);
}

// Find the `>` to fully close the `</div>` tag.
while (html[endIndex] !== '>' && endIndex < html.length) {
    endIndex++;
}
endIndex++; // Include the `>`

const newHtml = html.substring(0, startIndex) + replacement + html.substring(endIndex);

fs.writeFileSync(htmlPath, newHtml);
console.log("HTML Updated successfully!");
