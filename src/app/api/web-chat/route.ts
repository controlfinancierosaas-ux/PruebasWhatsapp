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
    if (!dynamicPrompt || dynamicPrompt.trim() === "") {
      const fallbackMsg = "¡Hola! He registrado tus datos correctamente. Nuestro equipo humano ha sido notificado y se pondrá en contacto contigo a la brevedad posible. ¡Gracias por tu paciencia!";
      
      // Actualizar a modo humano
      await supabaseAdmin.from('conversations').update({ mode: 'HUMAN' }).eq('id', conversation.id);
      
      // Notificar al admin (con los datos que el usuario probablemente ya ingresó)
      await notifyAdminHandoff(null, conversation.id, internalId);

      return NextResponse.json({ 
        response: fallbackMsg,
        role: 'assistant',
        mode: 'HUMAN'
      });
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
      const errorFallback = "¡Entendido! He registrado tu información. He notificado a nuestro equipo humano sobre tu solicitud para que te contacten cuanto antes. ¡Gracias!";
      
      await supabaseAdmin.from('conversations').update({ mode: 'HUMAN' }).eq('id', conversation.id);
      await notifyAdminHandoff(null, conversation.id, internalId);

      return NextResponse.json({ 
        response: errorFallback,
        role: 'assistant',
        mode: 'HUMAN'
      });
    }

  } catch (error: any) {
    console.error('[WebChat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
