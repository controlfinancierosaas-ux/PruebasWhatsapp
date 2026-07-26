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
import { botConfig } from '../bot-config';

const logger = pino({ level: 'info' });

export const initWhatsApp = async () => {
  // Initialize bot settings in memory and setup realtime sync
  await botConfig.init();

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
      console.log('New QR code received');
      const qrBase64 = await QRCode.toDataURL(qr);
      await supabaseAdmin.from('connection_state').upsert({ 
        id: 1,
        status: 'qr', 
        qr_string: qrBase64,
        updated_at: new Date().toISOString()
      });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);
      
      if (statusCode === DisconnectReason.loggedOut) {
        await supabaseAdmin.from('connection_state').upsert({ 
          id: 1,
          status: 'disconnected',
          phone: null,
          qr_string: null,
          updated_at: new Date().toISOString()
        });
      }

      if (shouldReconnect) {
        initWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('Connection opened successfully');
      await supabaseAdmin.from('connection_state').upsert({ 
        id: 1,
        status: 'connected', 
        qr_string: null,
        phone: sock.user?.id.split(':')[0],
        updated_at: new Date().toISOString()
      });
    }
  });

  // Watchdog to detect manual logout from DB
  setInterval(async () => {
    const { data } = await supabaseAdmin.from('connection_state').select('status').eq('id', 1).single();
    if (data?.status === 'disconnected' && sock.user) {
      console.log('Manual disconnect detected from DB. Logging out WhatsApp session...');
      await sock.logout();
    }
  }, 10000);

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
    // Only poll if socket is connected
    if (!sock.user) return;

    const { data: pending } = await supabaseAdmin
      .from('outbox')
      .select('*')
      .eq('sent', false)
      .eq('status', 'pending');

    if (pending && pending.length > 0) {
      for (const item of pending) {
        try {
          console.log(`[Outbox] Sending message to ${item.phone}...`);
          
          // 1. Resolve conversation_id if missing
          let conversationId = item.conversation_id;
          if (!conversationId) {
            const { data: conv } = await supabaseAdmin
              .from('conversations')
              .select('id')
              .eq('phone', item.phone)
              .maybeSingle();
            
            if (conv) {
              conversationId = conv.id;
            } else {
              // Create conversation if it doesn't exist
              const { data: newConv } = await supabaseAdmin
                .from('conversations')
                .insert({ phone: item.phone, name: item.phone, mode: 'HUMAN' })
                .select()
                .single();
              conversationId = newConv?.id;
            }
          }

          // 2. Send message
          const sentMsg = await sock.sendMessage(`${item.phone}@s.whatsapp.net`, { text: item.content });
          
          // 3. Mark as sent and link conversation_id
          await supabaseAdmin.from('outbox').update({ 
            sent: true,
            status: 'sent',
            conversation_id: conversationId,
            sent_at: new Date().toISOString(),
            whatsapp_message_id: sentMsg?.key.id
          }).eq('id', item.id);
          
          // 4. Record in messages history
          if (conversationId) {
            await supabaseAdmin.from('messages').insert({
              conversation_id: conversationId,
              role: 'human',
              content: item.content
            });
            
            await supabaseAdmin.from('conversations').update({ 
              last_message_at: new Date().toISOString() 
            }).eq('id', conversationId);
          }
        } catch (error: any) {
          console.error('[Outbox] Error sending message:', error);
          await supabaseAdmin.from('outbox').update({ 
            status: 'error',
            error_message: error.message || String(error)
          }).eq('id', item.id);
        }
      }
    }
  }, 3000);

  return sock;
};
