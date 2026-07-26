import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { supabaseAdmin } from '../supabase';
import { generateAIResponse } from '../openrouter';

export const handleMessage = async (sock: WASocket, msg: WAMessage) => {
  const remoteJid = msg.key.remoteJid;
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  
  if (!remoteJid || !content) return;

  // 1. Identificar el "phone" (ID interno) y tratar de resolver el "real_phone"
  const internalId = remoteJid.split('@')[0];
  let realPhone = internalId;

  // Si el ID es muy largo (típico de un LID/ID interno de WhatsApp), intentamos resolverlo
  if (internalId.length > 15 || remoteJid.endsWith('@lid')) {
    console.log(`[Resolution] Detecting technical ID: ${internalId}. Attempting to resolve...`);
    
    // Intentamos obtener información del contacto desde WhatsApp
    try {
      const results = await sock.onWhatsApp(internalId);
      if (results && results.length > 0) {
        const result = results[0];
        if (result && result.jid && result.jid !== remoteJid) {
          realPhone = result.jid.split('@')[0];
          console.log(`[Resolution] Successfully mapped ${internalId} to real phone: ${realPhone}`);
        }
      }
    } catch (e) {
      console.log(`[Resolution] Failed to resolve LID via onWhatsApp: ${e}`);
    }
  }

  console.log(`[Message] From: ${internalId} (Real: ${realPhone}), Content: ${content}`);

  // 2. Get or create conversation
  let { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('phone', internalId)
    .maybeSingle();

  if (!conversation) {
    console.log(`[Conversation] Creating new conversation for ${internalId}`);
    const { data: newConv } = await supabaseAdmin
      .from('conversations')
      .insert({ 
        phone: internalId, 
        real_phone: realPhone,
        name: msg.pushName || realPhone || internalId, 
        mode: 'AI' 
      })
      .select()
      .single();
    conversation = newConv;
  } else if (conversation.real_phone !== realPhone) {
    // Si ya existía pero no tenía el real_phone, lo actualizamos
    await supabaseAdmin
      .from('conversations')
      .update({ real_phone: realPhone })
      .eq('id', conversation.id);
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
    const dynamicPrompt = botConfig.generateSystemPrompt();

    // Si el prompt está vacío, el bot está en modo "lavado de cerebro" (limpio)
    if (!dynamicPrompt) {
      console.log(`[AI] Bot is unconfigured/neutral. Skipping response.`);
      return;
    }

    console.log(`[AI] Generating response for ${internalId}...`);
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
      console.error(`[AI] Failed to generate response for ${internalId}`);
    }
  } else {
    console.log(`[AI] Skipped (Global: ${isGlobalAIEnabled}, Chat: ${conversation.mode})`);
  }
};
