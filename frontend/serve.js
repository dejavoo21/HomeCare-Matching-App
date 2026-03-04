const express = require('express');
const path = require('path');

const app = express();
const port = 7005;
const distDir = path.join(__dirname, 'dist');

// Serve static files
app.use(express.static(distDir));

// SPA fallback: serve index.html for all unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${port}/`);
});
