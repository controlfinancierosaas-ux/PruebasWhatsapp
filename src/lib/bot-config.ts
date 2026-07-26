import { supabaseAdmin } from './supabase';

export interface BotConfig {
  bot_name: string;
  company_name: string;
  core_goal: string;
  tone: string;
  vocabulary: string;
  personality: string;
  language: string;
  short_responses: boolean;
  remote_info_link: string;
  additional_info: string;
  custom_prompt_override: string;
  prohibitions: string;
  handover_message: string;
}

class BotConfigManager {
  private config: BotConfig = {
    bot_name: '',
    company_name: '',
    core_goal: '',
    tone: 'formal',
    vocabulary: '',
    personality: 'resolutivo',
    language: 'Español',
    short_responses: true,
    remote_info_link: '',
    additional_info: '',
    custom_prompt_override: '',
    prohibitions: '',
    handover_message: 'En un momento te contactará un agente humano para ayudarte mejor.'
  };

  private static instance: BotConfigManager;

  private constructor() {}

  public static getInstance(): BotConfigManager {
    if (!BotConfigManager.instance) {
      BotConfigManager.instance = new BotConfigManager();
    }
    return BotConfigManager.instance;
  }

  public async init() {
    console.log('[ConfigManager] Initializing bot settings...');
    
    // 1. Initial Load
    const { data, error } = await supabaseAdmin
      .from('bot_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      this.updateInternalConfig(data);
      console.log('[ConfigManager] Initial settings loaded.');
    }

    // 2. Realtime subscription
    supabaseAdmin
      .channel('public:bot_settings')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'bot_settings',
        filter: 'id=eq.1' 
      }, (payload) => {
        console.log('[ConfigManager] Settings update detected via Realtime.');
        this.updateInternalConfig(payload.new);
      })
      .subscribe();
  }

  private updateInternalConfig(data: any) {
    this.config = {
      bot_name: data.bot_name || '',
      company_name: data.company_name || '',
      core_goal: data.core_goal || '',
      tone: data.tone || 'formal',
      vocabulary: data.vocabulary || '',
      personality: data.personality || 'resolutivo',
      language: data.language || 'Español',
      short_responses: !!data.short_responses,
      remote_info_link: data.remote_info_link || '',
      additional_info: data.additional_info || '',
      custom_prompt_override: data.custom_prompt_override || '',
      prohibitions: data.prohibitions || '',
      handover_message: data.handover_message || 'En un momento te contactará un agente humano para ayudarte mejor.'
    };
  }

  public getConfig(): BotConfig {
    return this.config;
  }

  public generateSystemPrompt(): string {
    const c = this.config;

    // Priorizar el prompt editado manualmente por el usuario
    if (c.custom_prompt_override) {
      return c.custom_prompt_override;
    }

    // Si no hay tono ni personalidad definida, el bot se considera "en blanco"
    if (!c.tone && !c.personality && !c.additional_info && !c.remote_info_link && !c.bot_name && !c.company_name) {
      return '';
    }

    let prompt = `# 1. ROL E IDENTIDAD\n`;
    prompt += `- Nombre del bot: ${c.bot_name || 'Asistente de WhatsApp'}\n`;
    prompt += `- Empresa / Proyecto: ${c.company_name || 'El Negocio'}\n`;
    prompt += `- Rol: Asistente virtual especializado\n`;
    prompt += `- Tono de voz: ${c.tone || 'Neutral'}\n`;
    prompt += `- Personalidad: ${c.personality || 'Equilibrada'}\n`;
    prompt += `- Idioma: ${c.language || 'Español'}\n\n`;

    if (c.core_goal) {
      prompt += `# 2. OBJETIVO PRINCIPAL\n- ${c.core_goal}\n\n`;
    }

    prompt += `# 3. CONTEXTO Y CONOCIMIENTO BASE\n`;
    if (c.additional_info) {
      prompt += `${c.additional_info}\n`;
    }
    if (c.vocabulary) {
      prompt += `- Diccionario Específico (Palabras y modismos): ${c.vocabulary}\n`;
    }
    if (c.remote_info_link) {
      prompt += `- DOCUMENTACIÓN EXTERNA COMPLEMENTARIA: Tu conocimiento se extiende con la información contenida en esta carpeta: ${c.remote_info_link}. Actúa como si hubieras leído y analizado todos sus documentos.\n`;
    }
    prompt += `\n`;

    prompt += `# 4. REGLAS DE FORMATO Y ESTILO PARA WHATSAPP\n`;
    prompt += `- EVITA LA "CHARLATANERÍA": La gente busca respuestas inmediatas. Da la solución o respuesta clave en la primera frase.\n`;
    prompt += `- MENÚS IMPLÍCITOS: Evita preguntas abiertas como "¿En qué te puedo ayudar?". Prueba con opciones directas como "¿Deseas consultar precios, soporte o información general?".\n`;
    prompt += `- FORMATO SOPORTADO: Usa únicamente *negrita*, _cursiva_ o ~tachado~. No uses otro tipo de markdown.\n`;
    if (c.short_responses) {
      prompt += `- EXTENSIÓN: Mensajes CORTOS y directos. Máximo 2 a 3 párrafos muy breves. Evita bloques grandes.\n`;
    }
    prompt += `- EMOJIS: Úsalos con moderación para dar calidez (máximo 1-2 por mensaje).\n`;
    prompt += `- INTERACCIÓN: Cierra siempre con una pregunta clara o llamada a la acción (CTA) para mantener la fluida la conversación.\n\n`;

    if (c.prohibitions) {
      prompt += `# 5. LÍMITES Y LO QUE NO DEBE HACER\n${c.prohibitions}\n`;
      prompt += `- NUNCA inventes información que no esté en tu base de conocimiento.\n`;
      prompt += `- Si no sabes la respuesta, indica amablemente que no dispones de esa información en este momento y ofrece ayuda humana.\n\n`;
    }

    prompt += `# 6. FLUJO DE ESCALACIÓN A HUMANO\n`;
    prompt += `- Transfiere a un agente humano en los siguientes casos:\n`;
    prompt += `  1. Cuando el usuario lo pida explícitamente.\n`;
    prompt += `  2. Si hay una queja o reclamo grave.\n`;
    prompt += `  3. Si tras 2 intentos no logras resolver la solicitud.\n`;
    prompt += `- Mensaje de transferencia: "${c.handover_message}"\n`;

    return prompt;
  }
}

export const botConfig = BotConfigManager.getInstance();
