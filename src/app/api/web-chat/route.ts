import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAIResponse, detectHandoffIntent } from '@/lib/openrouter';
import { botConfig } from '@/lib/bot-config';
import { notifyAdminHandoff } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, sessionId, name } = await req.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Message and sessionId are required' }, { status: 400 });
    }

    const internalId = `web:${sessionId}`;

    // 1. Get or create conversation
    let { data: conversation } = await supabaseAdmin
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

    // 4. Intent Detection (Talk to human / Frustration)
    const shouldTransfer = await detectHandoffIntent(message);
    if (shouldTransfer) {
      const config = botConfig.getConfig();
      const handoverMsg = config.handover_message || 'Entendido. He silenciado mis respuestas automáticas. En un momento te atenderá un compañero (asesor).';
      
      await supabaseAdmin.from('conversations').update({ mode: 'HUMAN' }).eq('id', conversation.id);
      await notifyAdminHandoff(null, conversation.id, internalId);

      return NextResponse.json({ 
        response: handoverMsg,
        role: 'assistant',
        mode: 'HUMAN'
      });
    }

    // 5. Generate AI Response
    const dynamicPrompt = botConfig.generateSystemPrompt();
    
    // Si el bot está en modo "lavado de cerebro" o sin configuración
    if (!dynamicPrompt || dynamicPrompt.trim() === "" || conversation.mode === 'CAPTURING_DATA') {
      
      // RE-FETCHING conversation to ensure we have the absolute latest mode/metadata 
      // from the database in case of rapid messages
      let { data: latestConv } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('id', conversation.id)
        .single();
      
      const conv = latestConv || conversation;
      const metadata = conv.metadata || {};
      let nextStep = metadata.step || 'NAME';
      let response = '';
      
      console.log(`[DataCapture] Current Step: ${nextStep}, Input: ${message}, Metadata:`, metadata);

      if (nextStep === 'NAME' && message) {
        metadata.name = message;
        nextStep = 'EMAIL';
        response = 'Gracias. Ahora, por favor indícame tu *Email*.';
      } else if (nextStep === 'EMAIL' && message) {
        metadata.email = message;
        nextStep = 'PHONE';
        response = 'Perfecto. Finalmente, indícame tu *Número de Teléfono* (incluyendo código de país).';
      } else if (nextStep === 'PHONE' && message) {
        metadata.phone = message;
        
        // Datos completos
        await supabaseAdmin.from('conversations').update({ mode: 'HUMAN', metadata: { ...metadata, step: 'COMPLETED' } }).eq('id', conv.id);
        await notifyAdminHandoff(null, conv.id, internalId);
        
        response = '¡Muchas gracias! He registrado tus datos correctamente. Nuestro equipo humano ha sido notificado y se pondrá en contacto contigo a la brevedad posible.';
        return NextResponse.json({ response, role: 'assistant', mode: 'HUMAN' });
      } else {
        // Primera vez o mensaje inválido
        response = '¡Hola! Parece que tenemos problemas técnicos. Por favor, para poder ayudarte, indícame primero tu *Nombre completo*.';
        nextStep = 'NAME';
      }

      console.log(`[DataCapture] Next Step: ${nextStep}, Metadata to Save:`, metadata);
      await supabaseAdmin.from('conversations').update({ mode: 'CAPTURING_DATA', metadata: { ...metadata, step: nextStep } }).eq('id', conv.id);
      
      return NextResponse.json({ response, role: 'assistant', mode: 'AI' });
    }

    try {
      const aiResponse = await generateAIResponse(conversation.id, message);
      
      if (aiResponse) {
        // Save AI message
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: aiResponse
        });

        return NextResponse.json({ 
          response: aiResponse,
          role: 'assistant' 
        });
      } else {
        throw new Error('Empty AI response');
      }
    } catch (aiError) {
      console.error('[WebChat API] AI Generation Error:', aiError);
      // Fallback a captura de datos si falla la AI
      await supabaseAdmin.from('conversations').update({ mode: 'CAPTURING_DATA', metadata: { step: 'NAME' } }).eq('id', conversation.id);
      const errorFallback = "Lo siento, tengo dificultades técnicas. Para que un asesor te contacte, por favor indícame tu *Nombre completo*.";
      
      return NextResponse.json({ 
        response: errorFallback,
        role: 'assistant',
        mode: 'AI'
      });
    }

  } catch (error: any) {
    console.error('[WebChat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
