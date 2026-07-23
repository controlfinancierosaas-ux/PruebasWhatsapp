import http from 'http';
import { initWhatsApp } from '../src/lib/baileys/client';

const PORT = process.env.PORT || 3000;

// Dummy server for Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running\n');
});

server.listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT}`);
  
  // Start WhatsApp Bot
  initWhatsApp().catch(err => {
    console.error('Failed to start WhatsApp bot:', err);
    process.exit(1);
  });
});
