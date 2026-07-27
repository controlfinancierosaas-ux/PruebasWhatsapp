import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { supabaseAdmin } from '../supabase';
import { generateAIResponse, detectHandoffIntent } from '../openrouter';
import { botConfig } from '../bot-config';
import { notifyAdminHandoff } from '../notifications';

export const handleMessage = async (sock: WASocket, msg: WAMessage) => {
  const remoteJid = msg.key.remoteJid;
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  
  if (!remoteJid || !content) return;

  // 1. Identificar el "phone" (ID interno) y tratar de resolver el "real_phone"
  const internalId = remoteJid.split('@')[0];
  let realPhone = internalId;

  if (internalId.length > 15 || remoteJid.endsWith('@lid')) {
    try {
      const results = await sock.onWhatsApp(internalId);
      if (results && results.length > 0) {
        const result = results[0];
        if (result && result.jid && result.jid !== remoteJid) {
          realPhone = result.jid.split('@')[0];
        }
      }
    } catch (e) {}
  }

  console.log(\`[Message] From: \${internalId}, Content: \${content}\`);

  // 2. Get or create conversation
  let { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('phone', internalId)
    .maybeSingle();

  if (!conversation) {
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
  }

  if (!conversation) return;

  // 3. Save user message
  await supabaseAdmin.from('messages').insert({
    conversation_id: conversation.id,
    role: 'user',
    content: content
  });

  await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

  // 4. Check Global AI Status
  const { data: settings } = await supabaseAdmin
    .from('connection_state')
    .select('global_ai_enabled')
    .eq('id', 1)
    .single();
  
  const isGlobalAIEnabled = settings?.global_ai_enabled ?? true;

  // 5. IF in HUMAN mode, stop here (unless it's a specific reactivate command, but that's handled in dashboard)
  if (conversation.mode === 'HUMAN') {
    console.log(\`[AI] Skipped - Conversation is in HUMAN mode for \${internalId}\`);
    return;
  }

  // 6. Intent Detection (Talk to human / Frustration)
  const shouldTransfer = await detectHandoffIntent(content);

  if (shouldTransfer) {
    console.log(\`[Handoff] Intent detected for \${internalId}. Transferring...\`);
    await performHandoff(sock, conversation, remoteJid);
    return;
  }

  // 7. If global AI is enabled AND conversation mode is AI, generate response
  if (isGlobalAIEnabled && conversation.mode === 'AI') {
    const config = botConfig.getConfig();
    const dynamicPrompt = botConfig.generateSystemPrompt();

    // Si el prompt está vacío, el bot está en modo "lavado de cerebro" (limpio)
    if (!dynamicPrompt || dynamicPrompt.trim() === "") {
      console.log(\`[AI] Bot is unconfigured/neutral. Prompting for data and transferring.\`);
      await handleUnconfiguredFlow(sock, conversation, remoteJid);
      return;
    }

    try {
      const aiResponse = await generateAIResponse(conversation.id, content);
      
      if (aiResponse) {
        await sock.sendMessage(remoteJid!, { text: aiResponse });
        
        // Save AI message
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: aiResponse
        });
      } else {
        throw new Error('Empty AI response');
      }
    } catch (e) {
      console.error(\`[AI] Error generating response for \${internalId}:\`, e);
      await handleUnconfiguredFlow(sock, conversation, remoteJid, true);
    }
  } else {
    console.log(\`[AI] Skipped (Global: \${isGlobalAIEnabled}, Chat: \${conversation.mode})\`);
  }
};

/**
 * Handles the transfer to a human agent
 */
async function performHandoff(sock: WASocket, conversation: any, remoteJid: string) {
  const config = botConfig.getConfig();
  const handoverMsg = config.handover_message || 'Entendido. He silenciado mis respuestas automáticas. En un momento te atenderá un compañero (asesor).';

  // 1. Send handover message to user
  await sock.sendMessage(remoteJid, { text: handoverMsg });

  // 2. Update conversation mode to HUMAN
  await supabaseAdmin
    .from('conversations')
    .update({ mode: 'HUMAN' })
    .eq('id', conversation.id);

  // 3. Notify Admin
  const userPhone = conversation.real_phone || conversation.phone;
  await notifyAdminHandoff(sock, conversation.id, userPhone);
}

/**
 * Handles flow when bot is not configured or fails
 */
async function handleUnconfiguredFlow(sock: WASocket, conversation: any, remoteJid: string, isError: boolean = false) {
  const apology = isError 
    ? "Lo siento, estoy teniendo dificultades técnicas para procesar tu solicitud."
    : "¡Hola! Mi sistema aún no ha sido configurado completamente.";
    
  const requestInfo = "\\n\\nPara que un asesor humano pueda ayudarte mejor, por favor indícame tu *Nombre completo* y *Correo electrónico*. En breve te contactaremos.";
  
  await sock.sendMessage(remoteJid, { text: apology + requestInfo });

  // Even if they haven't sent the data yet, we mark it as HUMAN so the admin sees it and can follow up
  await supabaseAdmin
    .from('conversations')
    .update({ mode: 'HUMAN' })
    .eq('id', conversation.id);

  const userPhone = conversation.real_phone || conversation.phone;
  await notifyAdminHandoff(sock, conversation.id, userPhone);
}
