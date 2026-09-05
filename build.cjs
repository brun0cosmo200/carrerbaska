const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const name of fs.readdirSync(root)) {
  if (/\.(html|css|js|webmanifest)$/.test(name) || ['img', 'audio'].includes(name)) {
    fs.cpSync(path.join(root, name), path.join(output, name), { recursive: true });
  }
}
console.log('Build estático pronto em dist/');
