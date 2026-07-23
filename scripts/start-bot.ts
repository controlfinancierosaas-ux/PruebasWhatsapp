import http from 'http';
import { initWhatsApp } from '../src/lib/baileys/client';

const PORT = process.env.PORT || 3000;

// Validate Environment Variables
const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY'
];

requiredEnv.forEach(env => {
  if (!process.env[env]) {
    console.error(`FATAL: Missing environment variable ${env}`);
    process.exit(1);
  }
});

// Dummy server for Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running\n');
});

server.listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT}`);
  
  console.log('Starting WhatsApp Bot initialization...');
  // Start WhatsApp Bot
  initWhatsApp().catch(err => {
    console.error('CRITICAL: Failed to start WhatsApp bot:', err);
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});
