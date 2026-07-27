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
          mode: 'AI',
          metadata: { step: 'START' }
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
    // If the conversation is marked as capturing, process that flow immediately.
    if (conversation.mode === 'CAPTURING_DATA') {
      const metadata = conversation.metadata || {};
      const currentStep = metadata.step || 'NAME';
      let nextStep = 'NAME';
      let response = '';
      
      console.log(`[DataCapture DEBUG] Step: ${currentStep}, Input: "${message}"`);

      if (currentStep === 'NAME') {
        metadata.name = message;
        nextStep = 'EMAIL';
        response = 'Gracias. Ahora, por favor indícame tu *Email*.';
      } else if (currentStep === 'EMAIL') {
        metadata.email = message;
        nextStep = 'PHONE';
        response = 'Perfecto. Finalmente, indícame tu *Número de Teléfono*.';
      } else if (currentStep === 'PHONE') {
        metadata.phone = message;
        
        await supabaseAdmin.from('conversations').update({ mode: 'HUMAN', metadata: { ...metadata, step: 'COMPLETED' } }).eq('id', conversation.id);
        await notifyAdminHandoff(null, conversation.id, internalId);
        
        response = '¡Muchas gracias! He registrado tus datos correctamente. Nuestro equipo humano ha sido notificado y se pondrá en contacto contigo a la brevedad posible.';
        return NextResponse.json({ response, role: 'assistant', mode: 'HUMAN' });
      }

      await supabaseAdmin.from('conversations').update({ metadata: { ...metadata, step: nextStep } }).eq('id', conversation.id);
      return NextResponse.json({ response, role: 'assistant', mode: 'AI' });
    }

    // --- AI / CONFIGURATION CHECK ---
    const dynamicPrompt = botConfig.generateSystemPrompt();
    if (!dynamicPrompt || dynamicPrompt.trim() === "") {
        // Start capture
        await supabaseAdmin.from('conversations').update({ mode: 'CAPTURING_DATA', metadata: { step: 'NAME' } }).eq('id', conversation.id);
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
      await supabaseAdmin.from('conversations').update({ mode: 'CAPTURING_DATA', metadata: { step: 'NAME' } }).eq('id', conversation.id);
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
