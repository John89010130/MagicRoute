const http = require('http');

const data = JSON.stringify({
  IDEmpresa: '1',
  IDLote: '101',
  OtimizarRota: '1',
  HoraSaida: '08:00'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/entregas/roteirizar',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-api-key': 'minha-chave-secreta-123'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
