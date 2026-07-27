import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAIResponse, detectHandoffIntent } from '@/lib/openrouter';
import { botConfig } from '@/lib/bot-config';
import { notifyAdminHandoff, notifyAdminUnconfiguredLead } from '@/lib/notifications';
import { startCaptureFlow, getCaptureState, processCaptureStep } from '@/lib/capture-flow';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, sessionId, name } = await req.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 });
    }

    const internalId = `web:${sessionId}`;

    // 1. Get or create conversation - FETCH FRESH DATA EVERY TIME
    let { data: conversation, error: fetchError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('phone', internalId)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          phone: internalId,
          real_phone: internalId,
          name: name || `Web User ${sessionId.substring(0, 5)}`,
          mode: 'AI'
        })
        .select()
        .single();
      
      if (convError) throw convError;
      conversation = newConv;
    }

    // 2. Save user message
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: message
    });

    await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

    // 3. IF in HUMAN mode, stop here
    if (conversation.mode === 'HUMAN') {
      return NextResponse.json({ 
        response: null,
        role: 'assistant',
        mode: 'HUMAN'
      });
    }

    // --- CHECK FOR CAPTURING DATA MODE ---
    // Igual que en WhatsApp: se consulta el estado ACTUAL desde la BD en cada mensaje,
    // usando el mismo módulo compartido (capture_step/capture_name/capture_email/capture_phone)
    // para evitar desincronización entre canales. NUNCA se llama a la IA en este flujo.
    if (conversation.mode === 'CAPTURING_DATA') {
      const currentState = await getCaptureState(conversation.id);
      const result = await processCaptureStep(conversation.id, currentState?.capture_step ?? null, message);

      if (result.completed && result.capturedData) {
        await notifyAdminUnconfiguredLead(
          null,
          conversation.id,
          internalId,
          result.capturedData.name,
          result.capturedData.email,
          result.capturedData.phone
        );
        return NextResponse.json({ response: result.reply, role: 'assistant', mode: 'HUMAN' });
      }

      return NextResponse.json({ response: result.reply, role: 'assistant', mode: 'AI' });
    }

    // --- AI / CONFIGURATION CHECK ---
    const dynamicPrompt = botConfig.generateSystemPrompt();
    if (!dynamicPrompt || dynamicPrompt.trim() === "") {
        const started = await startCaptureFlow(conversation.id);
        if (!started) {
          return NextResponse.json({
            response: '¡Hola! Parece que tenemos problemas técnicos. Un asesor humano revisará tu caso a la brevedad.',
            role: 'assistant',
            mode: 'HUMAN'
          });
        }
        return NextResponse.json({ 
            response: '¡Hola! Parece que tenemos problemas técnicos. Para poder ayudarte, indícame tu *Nombre completo*.',
            role: 'assistant',
            mode: 'AI'
        });
    }

    // 4. Intent Detection
    try {
        const shouldTransfer = await detectHandoffIntent(message);
        if (shouldTransfer) {
          const config = botConfig.getConfig();
          const handoverMsg = config.handover_message || 'Entendido. En un momento te atenderá un compañero.';
          
          await supabaseAdmin.from('conversations').update({ mode: 'HUMAN' }).eq('id', conversation.id);
          await notifyAdminHandoff(null, conversation.id, internalId);

          return NextResponse.json({ 
            response: handoverMsg,
            role: 'assistant',
            mode: 'HUMAN'
          });
        }
    } catch (e) {
        console.error('[WebChat API] Intent Detection Error:', e);
    }

    // 5. AI Generation
    try {
      const aiResponse = await generateAIResponse(conversation.id, message);
      if (aiResponse) {
        await supabaseAdmin.from('messages').insert({ conversation_id: conversation.id, role: 'assistant', content: aiResponse });
        return NextResponse.json({ response: aiResponse, role: 'assistant' });
      } else {
        throw new Error('Empty AI response');
      }
    } catch (aiError) {
      console.error('[WebChat API] AI Generation Error:', aiError);
      const started = await startCaptureFlow(conversation.id);
      if (!started) {
        return NextResponse.json({
          response: 'Lo siento, tengo dificultades técnicas. Un asesor humano revisará tu caso a la brevedad.',
          role: 'assistant',
          mode: 'HUMAN'
        });
      }
      return NextResponse.json({ 
        response: "Lo siento, tengo dificultades técnicas. Para que un asesor te contacte, por favor indícame tu *Nombre completo*.",
        role: 'assistant',
        mode: 'AI'
      });
    }

  } catch (error: any) {
    console.error('[WebChat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
