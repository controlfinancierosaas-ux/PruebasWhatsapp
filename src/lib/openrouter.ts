import OpenAI from 'openai';
import { supabaseAdmin } from './supabase';
import { SYSTEM_PROMPT } from './system-prompt';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const generateAIResponse = async (conversationId: string, userMessage: string) => {
  try {
    // Fetch last 5 messages for context
    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(5);

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history?.reverse().map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })) || []),
      { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-001',
      messages,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error in OpenRouter:', error);
    return null;
  }
};
