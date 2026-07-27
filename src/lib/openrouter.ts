import OpenAI from 'openai';
import { supabaseAdmin } from './supabase';
import { botConfig } from './bot-config';

// Instanciación perezosa para evitar errores en tiempo de build si falta la API Key
let _openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!_openai) {
    _openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key-for-build',
    });
  }
  return _openai;
};

const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

export const generateAIResponse = async (conversationId: string, userMessage: string) => {
  try {
    const openai = getOpenAI();
    const model = process.env.AI_MODEL || DEFAULT_MODEL;
    console.log(`[OpenRouter] Using model: ${model}`);

    // Fetch last 10 messages for better context
    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Usar el prompt generado dinámicamente desde la configuración en memoria
    const dynamicPrompt = botConfig.generateSystemPrompt();

    const messages: any[] = [
      { role: 'system', content: dynamicPrompt },
      ...(history?.reverse().map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })) || []),
      { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      console.warn('[OpenRouter] Received empty response from model');
    }
    return response;
  } catch (error: any) {
    console.error('[OpenRouter] Error:', error?.message || error);
    if (error?.response?.data) {
      console.error('[OpenRouter] API Error details:', JSON.stringify(error.response.data));
    }
    return null;
  }
};
