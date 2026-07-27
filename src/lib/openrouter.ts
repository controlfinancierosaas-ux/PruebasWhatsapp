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

export const generateConversationSummary = async (conversationId: string) => {
  try {
    const openai = getOpenAI();
    const model = process.env.AI_MODEL || DEFAULT_MODEL;

    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!history || history.length === 0) return 'Sin historial previo.';

    const conversationText = history.map(m => `${m.role === 'user' ? 'Usuario' : 'Bot'}: ${m.content}`).join('\n');

    const prompt = `Analiza la siguiente conversación entre un Bot y un Usuario. 
    Realiza un resumen ejecutivo de máximo 3 párrafos explicando de qué trató la conversación, 
    cuáles eran las dudas del usuario y por qué se requiere atención humana ahora.
    
    CONVERSACIÓN:
    ${conversationText}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content || 'No se pudo generar el resumen.';
  } catch (error) {
    console.error('[OpenRouter] Summary Error:', error);
    return 'Error al generar resumen.';
  }
};

export const detectHandoffIntent = async (userMessage: string) => {
  try {
    const openai = getOpenAI();
    const model = DEFAULT_MODEL;

    const prompt = `Analiza el siguiente mensaje de un usuario en un chat de WhatsApp. 
    Determina si el usuario:
    1. Solicita explícitamente hablar con un humano, asesor, persona o operador.
    2. Expresa frustración, enojo, ira o malestar significativo (insultos, quejas graves).
    3. Está pidiendo algo que claramente el bot no puede resolver y requiere escalación.

    Responde ÚNICAMENTE con la palabra "TRANSFERIR" si se cumple alguna de las anteriores, 
    o "CONTINUAR" si el bot puede seguir manejando la conversación.
    
    MENSAJE DEL USUARIO: "${userMessage}"`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 10,
    });

    const decision = completion.choices[0].message.content?.trim().toUpperCase();
    return decision === 'TRANSFERIR';
  } catch (error) {
    console.error('[OpenRouter] Intent Detection Error:', error);
    return false;
  }
};
