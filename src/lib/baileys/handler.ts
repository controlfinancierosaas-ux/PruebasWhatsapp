import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { supabaseAdmin } from '../supabase';
import { generateAIResponse } from '../openrouter';

export const handleMessage = async (sock: WASocket, msg: WAMessage) => {
  const remoteJid = msg.key.remoteJid;
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  const phone = remoteJid?.split('@')[0];

  if (!phone || !content) return;

  // 1. Get or create conversation
  let { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!conversation) {
    const { data: newConv } = await supabaseAdmin
      .from('conversations')
      .insert({ phone, name: msg.pushName || phone, mode: 'AI' })
      .select()
      .single();
    conversation = newConv;
  }

  // 2. Save user message
  await supabaseAdmin.from('messages').insert({
    conversation_id: conversation.id,
    role: 'user',
    content: content
  });

  await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

  // 3. If mode is AI, generate and send response
  if (conversation.mode === 'AI') {
    const aiResponse = await generateAIResponse(conversation.id, content);
    if (aiResponse) {
      await sock.sendMessage(remoteJid!, { text: aiResponse });
      
      // Save AI message
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: aiResponse
      });
    }
  }
};
