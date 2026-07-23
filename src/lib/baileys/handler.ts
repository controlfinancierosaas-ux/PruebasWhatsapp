import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { supabaseAdmin } from '../supabase';
import { generateAIResponse } from '../openrouter';

export const handleMessage = async (sock: WASocket, msg: WAMessage) => {
  const remoteJid = msg.key.remoteJid;
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  const phone = remoteJid?.split('@')[0];

  if (!phone || !content) return;

  console.log(`[Message] From: ${phone}, Content: ${content}`);

  // 1. Get or create conversation
  let { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('phone', phone)
    .single();

  if (!conversation) {
    console.log(`[Conversation] Creating new conversation for ${phone}`);
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

  // 3. Check Global AI Status
  const { data: settings } = await supabaseAdmin
    .from('connection_state')
    .select('global_ai_enabled')
    .eq('id', 1)
    .single();
  
  const isGlobalAIEnabled = settings?.global_ai_enabled ?? true;
  console.log(`[AI Status] Global: ${isGlobalAIEnabled}, Chat Mode: ${conversation.mode}`);

  // 4. If global AI is enabled AND conversation mode is AI, generate response
  if (isGlobalAIEnabled && conversation.mode === 'AI') {
    console.log(`[AI] Generating response for ${phone}...`);
    const aiResponse = await generateAIResponse(conversation.id, content);
    
    if (aiResponse) {
      console.log(`[AI] Response generated: ${aiResponse.substring(0, 50)}...`);
      await sock.sendMessage(remoteJid!, { text: aiResponse });
      
      // Save AI message
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: aiResponse
      });
    } else {
      console.error(`[AI] Failed to generate response for ${phone}`);
    }
  } else {
    console.log(`[AI] Skipped (Global: ${isGlobalAIEnabled}, Chat: ${conversation.mode})`);
  }
};
