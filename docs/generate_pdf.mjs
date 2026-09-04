import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, 'panduan_penggunaan.html');
const pdfPath = path.join(__dirname, 'Buku_Panduan_Triwara_POS.pdf');
const brainPdfPath = path.join('/home/shadowxz/.gemini/antigravity-cli/brain/07c8af89-f240-4247-bc21-03d86621a9a2', 'Buku_Panduan_Triwara_POS.pdf');

async function generatePDF() {
  console.log('Generating PDF from:', htmlPath);

  // Serve the docs directory with a simple HTTP server so images load properly
  const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, decodeURIComponent(req.url.replace(/^\//, '')));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
      else if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (filePath.endsWith('.jpg')) res.setHeader('Content-Type', 'image/jpeg');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  await new Promise((resolve) => server.listen(8099, resolve));
  console.log('Doc server listening on http://localhost:8099');

  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    'http://localhost:8099/panduan_penggunaan.html'
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const list = await new Promise((res, rej) => {
    http.get('http://localhost:9223/json', (r) => {
      let data = '';
      r.on('data', (chunk) => (data += chunk));
      r.on('end', () => res(JSON.parse(data)));
    }).on('error', rej);
  });

  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise((resolve) => (ws.onopen = resolve));
  await send('Page.enable');
  await send('DOM.enable');

  console.log('Rendering document & preparing high-quality A4 PDF...');
  await new Promise((r) => setTimeout(r, 2000));

  const pdfResult = await send('Page.printToPDF', {
    landscape: false,
    displayHeaderFooter: false,
    printBackground: true,
    paperWidth: 8.27, // A4 width in inches
    paperHeight: 11.69, // A4 height in inches
    marginTop: 0.4,
    marginBottom: 0.4,
    marginLeft: 0.4,
    marginRight: 0.4,
    preferCSSPageSize: true
  });

  const pdfBuffer = Buffer.from(pdfResult.data, 'base64');
  fs.writeFileSync(pdfPath, pdfBuffer);
  fs.writeFileSync(brainPdfPath, pdfBuffer);

  console.log(`✅ PDF Generated Successfully!`);
  console.log(`📁 Saved to: ${pdfPath}`);
  console.log(`📁 Artifact copy: ${brainPdfPath}`);
  console.log(`📊 File Size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  ws.close();
  chrome.kill();
  server.close();
  process.exit(0);
}

generatePDF().catch((err) => {
  console.error('PDF Generation Error:', err);
  process.exit(1);
});
