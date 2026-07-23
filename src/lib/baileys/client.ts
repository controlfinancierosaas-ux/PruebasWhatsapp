import makeWASocket, { 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  useMultiFileAuthState, 
  Browsers, 
  WAMessage, 
  MessageUpsertType 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { useSupabaseAuth } from './auth-adapter';
import { supabaseAdmin } from '../supabase';
import { handleMessage } from './handler';
import QRCode from 'qrcode';

const logger = pino({ level: 'info' });

export const initWhatsApp = async () => {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useSupabaseAuth('main-session');

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger,
    browser: Browsers.macOS('Desktop'),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrBase64 = await QRCode.toDataURL(qr);
      await supabaseAdmin.from('connection_state').update({ 
        status: 'qr', 
        qr_string: qrBase64,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
      
      await supabaseAdmin.from('connection_state').update({ 
        status: 'disconnected',
        updated_at: new Date().toISOString()
      }).eq('id', 1);

      if (shouldReconnect) {
        initWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('opened connection');
      await supabaseAdmin.from('connection_state').update({ 
        status: 'connected', 
        qr_string: null,
        phone: sock.user?.id.split(':')[0],
        updated_at: new Date().toISOString()
      }).eq('id', 1);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }: { messages: WAMessage[], type: MessageUpsertType }) => {
    if (type === 'notify') {
      for (const msg of messages) {
        if (!msg.key.fromMe) {
          await handleMessage(sock, msg);
        }
      }
    }
  });

  // Outbox Polling
  setInterval(async () => {
    const { data: pending } = await supabaseAdmin
      .from('outbox')
      .select('*')
      .eq('sent', false);

    if (pending && pending.length > 0) {
      for (const item of pending) {
        try {
          await sock.sendMessage(`${item.phone}@s.whatsapp.net`, { text: item.content });
          await supabaseAdmin.from('outbox').update({ sent: true }).eq('id', item.id);
          
          // Insert into messages table as human message
          await supabaseAdmin.from('messages').insert({
            conversation_id: item.conversation_id,
            role: 'human',
            content: item.content
          });
        } catch (error) {
          console.error('Error sending outbox message:', error);
        }
      }
    }
  }, 2000);

  return sock;
};
