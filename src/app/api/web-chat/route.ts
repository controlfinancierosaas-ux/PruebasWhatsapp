import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAIResponse } from '@/lib/openrouter';
import { botConfig } from '@/lib/bot-config';

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

    // 3. Generate AI Response
    const dynamicPrompt = botConfig.generateSystemPrompt();
    
    // Si el bot está en modo "lavado de cerebro" o sin configuración
    if (!dynamicPrompt || dynamicPrompt.trim() === "") {
      return NextResponse.json({ 
        response: "¡Hola! En este momento nuestro asistente virtual está en mantenimiento para servirte mejor. Por favor, déjanos tu nombre y número de teléfono por aquí y un asesor humano te contactará lo antes posible.",
        role: 'assistant' 
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
      return NextResponse.json({ 
        response: "Lo siento, estoy experimentando una breve interrupción técnica. Si tu solicitud es urgente, por favor facilítanos tus datos de contacto y te llamaremos en la brevedad posible.",
        role: 'assistant' 
      });
    }

  } catch (error: any) {
    console.error('[WebChat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
