const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dashboard.html');
const scratchPath = 'C:\\Users\\inweo\\.gemini\\antigravity-ide\\brain\\16100c74-7f8d-49f0-9b53-d260f2befb7f\\scratch\\toolbar.html';

let html = fs.readFileSync(htmlPath, 'utf8');
const replacement = fs.readFileSync(scratchPath, 'utf8');

const startMarker = '<div class="email-composer-toolbar" id="formatToolbar" style="display: none;">';
const endMarker = '                    <div class="mail-split-view">';

const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

// The end index should be right before the `<div class="mail-split-view">`, but there's a closing `</div>` for the toolbar and `</div>` for the main toolbar container before it.
// Let's replace the whole block between startMarker and endMarker, but we need to keep the closing `</div>` for the container if it's outside our replacement.
// Our replacement scratch file has:
// `<div class="email-composer-toolbar" id="formatToolbar" style="display: none;">` ... `</div>`
// We should replace from `<div class="email-composer-toolbar" id="formatToolbar"` to the `</div>` that closes it.
// In the original file, it looks like:
// 2528:                             </button>
// 2529:                         </div>
// 2530:                     </div>
// 2531:
// 2532:                     <div class="mail-split-view">
// Our replacement will provide up to `</div>` (the closing of formatToolbar).
// So we should replace from `startIndex` to the `</div>` just before `</div>\n\n                    <div class="mail-split-view">`.
// To be safe, let's just find the `</div>\n                    </div>\n\n                    <div class="mail-split-view">`
// Wait, the index of `<div class="mail-split-view">` is `endIndex`.
// We will go backwards to find the second `</div>`.

let replaceEnd = html.lastIndexOf('</div>', endIndex - 1);
replaceEnd = html.lastIndexOf('</div>', replaceEnd - 1) + 6; 

const newHtml = html.substring(0, startIndex) + replacement + '\n' + html.substring(replaceEnd);

fs.writeFileSync(htmlPath, newHtml);
console.log("HTML Updated successfully!");
