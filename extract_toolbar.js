const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const htmlPath = path.join(__dirname, 'dashboard.html');

// 1. Get original dashboard.html from git
const originalHtml = execSync('git show HEAD:dashboard.html').toString();

// 2. Extract .mail-main-toolbar
const startMarker = '<div class="mail-main-toolbar">';
const endMarker = '                    </div>\n\n                    <div class="mail-split-view">';
const startIndex = originalHtml.indexOf(startMarker);
const endIndex = originalHtml.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find mail-main-toolbar in original HTML");
    process.exit(1);
}

// We want to extract the mail-main-toolbar completely.
// Since the endMarker is the split-view div, the main toolbar ends just before that.
// Let's grab the whole substring up to the start of endMarker, but actually `</div>` closes the `mail-panel-body`.
// Let's just grab up to the newline before endMarker.
// Actually, `mail-main-toolbar` closes with a `</div>`, then `mail-panel-body` closes with `</div>`.
const originalToolbarSection = originalHtml.substring(startIndex, endIndex);

// 3. Read current dashboard.html
let currentHtml = fs.readFileSync(htmlPath, 'utf8');

// 4. Find where to insert it. We should insert it before `</div>\n                    <div class="mail-split-view">`
// Wait, my current HTML might look like:
// ... format toolbar ...
// </div>
// <div class="mail-split-view">
// (or similar)
const insertMarker = '<div class="mail-split-view">';
const insertIndex = currentHtml.indexOf(insertMarker);

if (insertIndex === -1) {
    console.error("Could not find insert marker in current HTML");
    process.exit(1);
}

// We need to look before `insertMarker` for the `</div>` that closes `mail-panel-body`.
// Currently my html has:
// ... formatToolbar content ...
// </div>
//                     <div class="mail-split-view">
// Wait, my replacement ended with `</div>`. And my node script did:
// `const newHtml = html.substring(0, startIndex) + replacement + '\n' + html.substring(replaceEnd);`
// In update_toolbar_v2.js, I replaced up to the second `</div>` before `<div class="mail-split-view">`.
// Let me look at the exact current HTML right before `mail-split-view`.
console.log("Current HTML around insert point:");
console.log(currentHtml.substring(insertIndex - 100, insertIndex + 50));

// I will just save the extracted toolbar to a scratch file and then I can use replace_file_content or another node script to inject it precisely.
fs.writeFileSync('C:\\Users\\inweo\\.gemini\\antigravity-ide\\brain\\16100c74-7f8d-49f0-9b53-d260f2befb7f\\scratch\\extracted_toolbar.html', originalToolbarSection);
console.log("Extracted toolbar to scratch file.");

