import fs from 'fs';
const p = JSON.parse(fs.readFileSync('./package.json','utf8'));
console.log('deps:', Object.keys(p.dependencies).join(', '));
console.log('next:', p.dependencies?.next ? 'YES' : 'NO');
console.log('pg:', p.dependencies?.pg ? 'YES' : 'NO');
