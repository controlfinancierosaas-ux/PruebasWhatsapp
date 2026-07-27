import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { supabaseAdmin } from '../supabase';
import { generateAIResponse, detectHandoffIntent } from '../openrouter';
import { botConfig } from '../bot-config';
import { notifyAdminHandoff } from '../notifications';
import { notifyAdminUnconfiguredLead } from '../notifications';

export const handleMessage = async (sock: WASocket, msg: WAMessage) => {
  const remoteJid = msg.key.remoteJid;
  const content = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
  
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

  console.log(`[Message] From: ${internalId}, Content: ${content}`);

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
    content
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
    console.log(`[AI] Skipped - Conversation is in HUMAN mode for ${internalId}`);
    return;
  }

  // 6. Si estamos en modo CAPTURING_DATA, manejar la captura paso a paso
  // IMPORTANTE: se verifica ANTES de cualquier intento de comunicación con la IA
  // (ni siquiera detección de intención) para no interferir con la captura NAME -> EMAIL -> PHONE.
  if (conversation.mode === 'CAPTURING_DATA') {
    await handleCapturingData(sock, conversation, remoteJid, content);
    return;
  }

  // 7. Intent Detection (Talk to human / Frustration)
  const shouldTransfer = await detectHandoffIntent(content);

  if (shouldTransfer) {
    console.log(`[Handoff] Intent detected for ${internalId}. Transferring...`);
    await performHandoff(sock, conversation, remoteJid);
    return;
  }

  // 8. Si global AI está habilitado Y modo AI, generar respuesta
  if (isGlobalAIEnabled && conversation.mode === 'AI') {
    const dynamicPrompt = botConfig.generateSystemPrompt();

    // Si el prompt está vacío, el bot está en modo "lavado de cerebro" (limpio)
    if (!dynamicPrompt || dynamicPrompt.trim() === '') {
      console.log(`[AI] Bot is unconfigured/neutral. Starting data capture flow.`);
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
      console.error(`[AI] Error generating response for ${internalId}:`, e);
      await handleUnconfiguredFlow(sock, conversation, remoteJid, true);
    }
  } else {
    console.log(`[AI] Skipped (Global: ${isGlobalAIEnabled}, Chat: ${conversation.mode})`);
  }
};

/**
 * Maneja la captura de datos paso a paso cuando el bot no está configurado o falla.
 * Flujo: NAME -> EMAIL -> PHONE -> Notificar admin y pasar a HUMAN
 */
async function handleUnconfiguredFlow(sock: WASocket, conversation: any, remoteJid: string, isError: boolean = false) {
  const config = botConfig.getConfig();
  
  const apology = isError 
    ? 'Lo siento, estoy teniendo dificultades técnicas para procesar tu solicitud.'
    : '¡Hola! Aún no he sido configurado completamente.';
  
  // Mensaje inicial pidiendo SOLO el nombre
  const greeting = config.unconfigured_greeting || '¡Hola! Aún no he sido configurado completamente.';

  await sock.sendMessage(remoteJid, { 
    text: `${apology}\n\nPara que un asesor humano te contacte, necesito algunos datos.\n\n*¿Cuál es tu nombre completo?*` 
  });

  // Marcar conversación en modo CAPTURING_DATA e iniciar en paso NAME
  await supabaseAdmin
    .from('conversations')
    .update({ 
      mode: 'CAPTURING_DATA',
      capture_step: 'NAME',
      capture_name: null,
      capture_email: null,
      capture_phone: null
    })
    .eq('id', conversation.id);
}

/**
 * Maneja cada paso de la captura de datos verificando el estado desde la BD en cada paso.
 * NAME -> EMAIL -> PHONE -> Notify Admin -> HUMAN
 */
async function handleCapturingData(sock: WASocket, conversation: any, remoteJid: string, userContent: string) {
  // Consultar estado ACTUAL desde la BD para evitar estados desincronizados
  const { data: currentConv } = await supabaseAdmin
    .from('conversations')
    .select('capture_step, capture_name, capture_email, capture_phone')
    .eq('id', conversation.id)
    .single();

  if (!currentConv) return;

  const step = currentConv.capture_step;
  const userInput = userContent.trim();

  // --- Paso NAME ---
  if (step === 'NAME') {
    if (!userInput || userInput.length < 2) {
      await sock.sendMessage(remoteJid, { 
        text: 'Por favor, indícame tu *nombre completo* para continuar.' 
      });
      return;
    }

    await supabaseAdmin
      .from('conversations')
      .update({ 
        capture_name: userInput,
        capture_step: 'EMAIL' 
      })
      .eq('id', conversation.id);

    await sock.sendMessage(remoteJid, { 
      text: `Gracias, ${userInput.split(' ')[0]}.\n\nAhora indícame tu *correo electrónico* para contactarte.` 
    });
    return;
  }

  // --- Paso EMAIL ---
  if (step === 'EMAIL') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userInput)) {
      await sock.sendMessage(remoteJid, { 
        text: 'El formato del correo no parece válido. Por favor, indícame un *correo electrónico* correcto (ej: nombre@correo.com).' 
      });
      return;
    }

    await supabaseAdmin
      .from('conversations')
      .update({ 
        capture_email: userInput,
        capture_step: 'PHONE' 
      })
      .eq('id', conversation.id);

    await sock.sendMessage(remoteJid, { 
      text: 'Perfecto.\n\nPor último, indícame tu *número de teléfono* para que un asesor pueda comunicarse contigo (incluye código de país, ej: +54 11 1234-5678).' 
    });
    return;
  }

  // --- Paso PHONE ---
  if (step === 'PHONE') {
    // Aceptar cualquier cosa que parezca un teléfono (mínimo 7 dígitos)
    const digitsOnly = userInput.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      await sock.sendMessage(remoteJid, { 
        text: 'El número ingresado no parece válido. Por favor, indícame tu *número de teléfono* completo (ej: +54 11 1234-5678).' 
      });
      return;
    }

    // Guardar teléfono y completar captura
    await supabaseAdmin
      .from('conversations')
      .update({ 
        capture_phone: userInput,
        capture_step: 'DONE' 
      })
      .eq('id', conversation.id);

    // Mensaje de cierre al usuario
    await sock.sendMessage(remoteJid, { 
      text: '¡Listo! He registrado tu información.\n\nUn asesor humano se pondrá en contacto contigo a la brevedad. Mientras tanto, ¿en qué más puedo ayudarte?' 
    });

    // Cambiar a modo HUMAN para que un asesor atienda
    await supabaseAdmin
      .from('conversations')
      .update({ mode: 'HUMAN' })
      .eq('id', conversation.id);

    // Notificar al admin con TODOS los datos capturados
    const userPhone = conversation.real_phone || conversation.phone;
    await notifyAdminUnconfiguredLead(sock, conversation.id, userPhone, userInput, currentConv.capture_email, userContent);

    return;
  }

  // Si el paso ya es DONE o no se reconoce, pasar a HUMAN directamente
  if (step === 'DONE' || !step) {
    await supabaseAdmin
      .from('conversations')
      .update({ mode: 'HUMAN' })
      .eq('id', conversation.id);
    return;
  }
}

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
