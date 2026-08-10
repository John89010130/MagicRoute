const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'index.js');
const fileContent = fs.readFileSync(filePath, 'utf8');
const base64 = Buffer.from(fileContent).toString('base64');

fs.writeFileSync(path.join(__dirname, 'deploy-index.sh'), `echo "${base64}" | base64 -d > /magicroute-api/dist/index.js && pm2 restart magicroute-api\n`);
console.log('Script deploy-index.sh gerado com sucesso! Tamanho:', base64.length);
