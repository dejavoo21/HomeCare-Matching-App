const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 7005;
const DIST = path.join(__dirname, 'dist');

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  
  if (!ext || ext === '.html') {
    filePath = path.join(DIST, 'index.html');
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': getMimeType(ext) });
      res.end(content); 
    }
  });
});

function getMimeType(ext) {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
  return types[ext] || 'application/octet-stream';
}

server.listen(PORT, () => console.log(`Server on port ${PORT}`));
