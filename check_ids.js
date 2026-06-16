const fs = require('fs');
const html = fs.readFileSync('dashboard.html', 'utf8');

const match1 = html.match(/function setMailSection\([\s\S]*?function/);
const match2 = html.match(/function applyEmailFilter\([\s\S]*?function/);

let ids = [];
let re = /getElementById\('([^']+)'\)/g;
let m;
if(match1) { while(m = re.exec(match1[0])) ids.push(m[1]); }
if(match2) { while(m = re.exec(match2[0])) ids.push(m[1]); }

console.log('IDs used in JS:', [...new Set(ids)]);

let missing = [];
ids.forEach(id => {
  if(!html.includes('id=\"' + id + '\"') && !html.includes('id=\'' + id + '\'')) {
    missing.push(id);
  }
});
console.log('Missing IDs:', [...new Set(missing)]);
