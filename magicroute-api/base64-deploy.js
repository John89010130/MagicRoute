const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'routes', 'entregas.routes.js');
const fileContent = fs.readFileSync(filePath, 'utf8');
const base64 = Buffer.from(fileContent).toString('base64');

console.log('BASE64 LENGTH:', base64.length);
fs.writeFileSync(path.join(__dirname, 'deploy-entregas.sh'), `echo "${base64}" | base64 -d > /magicroute-api/dist/routes/entregas.routes.js && pm2 restart magicroute-api\n`);
console.log('Script deploy-entregas.sh gerado com sucesso!');
