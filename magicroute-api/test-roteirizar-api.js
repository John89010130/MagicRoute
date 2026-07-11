const http = require('http');
const qs = require('querystring');

const postData = qs.stringify({
  IDEmpresa: '1',
  IDLote: '109',
  OtimizarRota: '1',
  HoraSaida: '11:00',
  TempoAtendimento: '15'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/entregas/roteirizar',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'x-api-key': 'minha-chave-secreta-123'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => { console.log(`BODY: ${body}`); });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
