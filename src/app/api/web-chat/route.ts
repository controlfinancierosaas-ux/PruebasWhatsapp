import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAIResponse } from '@/lib/openrouter';
import { botConfig } from '@/lib/bot-config';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
...

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
    if (!dynamicPrompt) {
      return NextResponse.json({ 
        response: "Lo siento, el bot no está configurado actualmente.",
        role: 'assistant' 
      });
    }

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
      return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[WebChat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
