import { supabaseAdmin } from './supabase';

export interface BotConfig {
  tone: string;
  vocabulary: string;
  personality: string;
  short_responses: boolean;
  remote_info_link: string;
  additional_info: string;
  custom_prompt_override: string;
  prohibitions: string;
}

class BotConfigManager {
  private config: BotConfig = {
    tone: 'formal',
    vocabulary: '',
    personality: 'resolutivo',
    short_responses: true,
    remote_info_link: '',
    additional_info: '',
    custom_prompt_override: '',
    prohibitions: ''
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
      tone: data.tone || 'formal',
      vocabulary: data.vocabulary || '',
      personality: data.personality || 'resolutivo',
      short_responses: !!data.short_responses,
      remote_info_link: data.remote_info_link || '',
      additional_info: data.additional_info || '',
      custom_prompt_override: data.custom_prompt_override || '',
      prohibitions: data.prohibitions || ''
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
    if (!c.tone && !c.personality && !c.additional_info && !c.remote_info_link) {
      return '';
    }

    let prompt = `Eres un asistente de WhatsApp profesional.`;
    
    if (c.tone || c.personality) {
      prompt += ` \nTu tono es ${c.tone || 'neutral'} y tu personalidad es ${c.personality || 'equilibrada'}.`;
    }

    if (c.vocabulary) {
      prompt += `\nUsa este vocabulario y jerga: ${c.vocabulary}.`;
    }

    if (c.additional_info) {
      prompt += `\nContexto adicional importante: ${c.additional_info}.`;
    }

    if (c.remote_info_link) {
      prompt += `\nDOCUMENTACIÓN EXTERNA: Tu conocimiento base se complementa con la información contenida en esta carpeta: ${c.remote_info_link}. Actúa como si hubieras leído y analizado todos los documentos, precios, catálogos y manuales allí presentes.`;
    }

    if (c.prohibitions) {
      prompt += `\nLÍMITES Y REGLAS (NO CRUZAR): \n${c.prohibitions}`;
    }

    if (c.short_responses) {
      prompt += `\nIMPORTANTE: \nEscribe mensajes CORTOS y directos, al estilo de WhatsApp. Evita párrafos largos.`;
    }

    return prompt;
  }
}

export const botConfig = BotConfigManager.getInstance();
