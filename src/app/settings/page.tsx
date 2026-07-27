'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import Link from 'next/link';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState('');
  
  const [settings, setSettings] = useState({
    bot_name: '',
    company_name: '',
    core_goal: '',
    tone: '',
    vocabulary: '',
    personality: '',
    language: 'Español',
    short_responses: true,
    remote_info_link: '',
    additional_info: '',
    custom_prompt_override: '',
    prohibitions: 'No inventar precios ni promociones\nNo prometer plazos exactos\nNo hablar mal de la competencia\nNo salirse del tema del negocio',
    handover_message: 'En un momento te contactará un agente humano para ayudarte mejor.',
    admin_email: '',
    admin_phone: ''
  });

  const [customTone, setCustomTone] = useState('');
  const [customPersonality, setCustomPersonality] = useState('');
  const [showCustomTone, setShowCustomTone] = useState(false);
  const [showCustomPersonality, setShowCustomPersonality] = useState(false);

  const predefinedTones = ['formal', 'cercano', 'divertido', 'directo'];
  const predefinedPersonalities = ['resolutivo', 'paciente', 'entusiasta', 'analitico'];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('bot_settings').select('*').eq('id', 1).single();
    if (data) {
      const tone = data.tone || '';
      const personality = data.personality || '';
      
      const rawProhibitions = data.prohibitions || 'No inventar precios ni promociones\nNo prometer plazos exactos\nNo hablar mal de la competencia\nNo salirse del tema del negocio';
      const sanitizedProhibitions = rawProhibitions.replace(/\\n/g, '\n');

      setSettings({
        bot_name: data.bot_name || '',
        company_name: data.company_name || '',
        core_goal: data.core_goal || '',
        tone: predefinedTones.includes(tone) ? tone : (tone ? 'otro' : ''),
        vocabulary: data.vocabulary || '',
        personality: predefinedPersonalities.includes(personality) ? personality : (personality ? 'otro' : ''),
        language: data.language || 'Español',
        short_responses: data.short_responses ?? true,
        remote_info_link: data.remote_info_link || '',
        additional_info: data.additional_info || '',
        custom_prompt_override: data.custom_prompt_override || '',
        prohibitions: sanitizedProhibitions,
        handover_message: data.handover_message || 'En un momento te contactará un agente humano para ayudarte mejor.',
        admin_email: data.admin_email || '',
        admin_phone: data.admin_phone || ''
      });

      if (tone && !predefinedTones.includes(tone)) {
        setCustomTone(tone);
        setShowCustomTone(true);
      }
      if (personality && !predefinedPersonalities.includes(personality)) {
        setCustomPersonality(personality);
        setShowCustomPersonality(true);
      }
    }
    setLoading(false);
  };

  const handleToneChange = (val: string) => {
    setSettings({ ...settings, tone: val });
    setShowCustomTone(val === 'otro');
  };

  const handlePersonalityChange = (val: string) => {
    setSettings({ ...settings, personality: val });
    setShowCustomPersonality(val === 'otro');
  };

  const generatePreview = () => {
    const activeTone = settings.tone === 'otro' ? customTone : settings.tone;
    const activePersonality = settings.personality === 'otro' ? customPersonality : settings.personality;

    let prompt = `# 1. ROL E IDENTIDAD\n`;
    prompt += `- Nombre del bot: ${settings.bot_name || '[Nombre del Asistente]'}\n`;
    prompt += `- Empresa / Proyecto: ${settings.company_name || '[Nombre del Negocio]'}\n`;
    prompt += `- Rol: Asistente virtual especializado\n`;
    prompt += `- Tono de voz: ${activeTone || 'Neutral'}\n`;
    prompt += `- Personalidad: ${activePersonality || 'Equilibrada'}\n`;
    prompt += `- Idioma: ${settings.language || 'Español'}\n\n`;

    if (settings.core_goal) {
      prompt += `# 2. OBJETIVO PRINCIPAL\n- ${settings.core_goal}\n\n`;
    }

    prompt += `# 3. CONTEXTO Y CONOCIMIENTO BASE\n`;
    if (settings.additional_info) {
      prompt += `${settings.additional_info}\n`;
    }
    if (settings.vocabulary) {
      prompt += `- Diccionario Específico (Palabras y modismos): ${settings.vocabulary}\n`;
    }
    if (settings.remote_info_link) {
      prompt += `- DOCUMENTACIÓN EXTERNA COMPLEMENTARIA: Tu conocimiento se extiende con la información contenida en esta carpeta: ${settings.remote_info_link}. Actúa como si hubieras leído y analizado todos sus documentos.\n`;
    }
    prompt += `\n`;

    prompt += `# 4. REGLAS DE FORMATO Y ESTILO PARA WHATSAPP\n`;
    prompt += `- EVITA LA "CHARLATANERÍA": La gente busca respuestas inmediatas. Da la solución o respuesta clave en la primera frase.\n`;
    prompt += `- MENÚS IMPLÍCITOS: Evita preguntas abiertas como "¿En qué te puedo ayudar?". Prueba con opciones directas como "¿Deseas consultar precios, soporte o información general?".\n`;
    prompt += `- FORMATO SOPORTADO: Usa únicamente *negrita*, _cursiva_ o ~tachado~. No uses otro tipo de markdown.\n`;
    if (settings.short_responses) {
      prompt += `- EXTENSIÓN: Mensajes CORTOS y directos. Máximo 2 a 3 párrafos muy breves. Evita bloques grandes.\n`;
    }
    prompt += `- EMOJIS: Úsalos con moderación para dar calidez (máximo 1-2 por mensaje).\n`;
    prompt += `- INTERACCIÓN: Cierra siempre con una pregunta clara o llamada a la acción (CTA) para mantener la fluida la conversación.\n\n`;

    if (settings.prohibitions) {
      prompt += `# 5. LÍMITES Y LO QUE NO DEBE HACER\n${settings.prohibitions}\n`;
      prompt += `- NUNCA inventes información que no esté en tu base de conocimiento.\n`;
      prompt += `- Si no sabes la respuesta, indica amablemente que no dispones de esa información en este momento y ofrece ayuda humana.\n\n`;
    }

    prompt += `# 6. FLUJO DE ESCALACIÓN A HUMANO\n`;
    prompt += `- Transfiere a un agente humano en los siguientes casos:\n`;
    prompt += `  1. Cuando el usuario lo pida explícitamente.\n`;
    prompt += `  2. Si hay una queja o reclamo grave.\n`;
    prompt += `  3. Si tras 2 intentos no logras resolver la solicitud.\n`;
    prompt += `- Mensaje de transferencia: "${settings.handover_message}"\n`;

    setFinalPrompt(settings.custom_prompt_override || prompt);
    setShowPreview(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const toneToSave = settings.tone === 'otro' ? customTone : settings.tone;
    const personalityToSave = settings.personality === 'otro' ? customPersonality : settings.personality;

    const { error } = await supabase
      .from('bot_settings')
      .update({
        ...settings,
        tone: toneToSave,
        personality: personalityToSave,
        custom_prompt_override: finalPrompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      setMessage('Error al guardar: ' + error.message);
    } else {
      setMessage('Configuración guardada correctamente.');
      setShowPreview(false);
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de que deseas REINICIAR el Bot? Esto borrará TODAS las instrucciones.')) {
      return;
    }

    setSaving(true);
    const emptySettings = {
      bot_name: '',
      company_name: '',
      core_goal: '',
      tone: '',
      vocabulary: '',
      personality: '',
      language: 'Español',
      short_responses: false,
      remote_info_link: '',
      additional_info: '',
      custom_prompt_override: '',
      prohibitions: '',
      handover_message: 'En un momento te contactará un agente humano para ayudarte mejor.',
      admin_email: '',
      admin_phone: ''
    };

    const { error } = await supabase
      .from('bot_settings')
      .update({
        ...emptySettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (!error) {
      setSettings(emptySettings);
      setCustomTone('');
      setCustomPersonality('');
      setShowCustomTone(false);
      setShowCustomPersonality(false);
      setFinalPrompt('');
      setMessage('Bot reiniciado.');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-emerald-600">Cargando configuración...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-gray-800">
      <DashboardHeader />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight uppercase">Configuración Maestra del Bot</h1>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleReset}
                className="text-red-500 text-sm font-bold border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                Limpiar Bot
              </button>
              <Link href="/" className="bg-white border border-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                Dashboard
              </Link>
            </div>
          </div>

          {!showPreview ? (
            <div className="space-y-6">
              {/* Sección 1: Identidad */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
                  1. ROL E IDENTIDAD
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nombre del Bot</label>
                    <input 
                      type="text"
                      value={settings.bot_name}
                      onChange={(e) => setSettings({...settings, bot_name: e.target.value})}
                      placeholder="Ej: Sofía, Asistente de Ventas..."
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nombre de la Empresa</label>
                    <input 
                      type="text"
                      value={settings.company_name}
                      onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                      placeholder="Ej: Inmobiliaria XYZ..."
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Idioma Principal</label>
                    <input 
                      type="text"
                      value={settings.language}
                      onChange={(e) => setSettings({...settings, language: e.target.value})}
                      placeholder="Ej: Español, Inglés..."
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tono de Voz</label>
                    <select 
                      value={settings.tone}
                      onChange={(e) => handleToneChange(e.target.value)}
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
                    >
                      <option value="">(Sin definir)</option>
                      <option value="formal">🎩 Formal / Profesional</option>
                      <option value="cercano">😊 Cercano / Amigable</option>
                      <option value="divertido">🤪 Divertido / Bromista</option>
                      <option value="directo">⚡ Directo / Conciso</option>
                      <option value="otro">⚙️ Otros...</option>
                    </select>
                    {showCustomTone && (
                      <input 
                        type="text"
                        value={customTone}
                        onChange={(e) => setCustomTone(e.target.value)}
                        placeholder="Escribe el tono..."
                        className="w-full rounded-xl border-emerald-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Personalidad</label>
                    <select 
                      value={settings.personality}
                      onChange={(e) => handlePersonalityChange(e.target.value)}
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
                    >
                      <option value="">(Sin definir)</option>
                      <option value="resolutivo">🛠 Resolutivo / Eficaz</option>
                      <option value="paciente">🧘 Paciente / Empático</option>
                      <option value="entusiasta">🚀 Entusiasta / Vendedor</option>
                      <option value="analitico">🧐 Analítico / Detallista</option>
                      <option value="otro">⚙️ Otros...</option>
                    </select>
                    {showCustomPersonality && (
                      <input 
                        type="text"
                        value={customPersonality}
                        onChange={(e) => setCustomPersonality(e.target.value)}
                        placeholder="Escribe la personalidad..."
                        className="w-full rounded-xl border-emerald-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 2: Objetivo */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
                  2. OBJETIVO PRINCIPAL
                </h2>
                <textarea 
                  value={settings.core_goal}
                  onChange={(e) => setSettings({...settings, core_goal: e.target.value})}
                  placeholder="Ej: Tu objetivo es resolver dudas frecuentes y guiar al usuario..."
                  className="w-full h-24 rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Sección 3: Conocimiento */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
                  3. CONTEXTO Y CONOCIMIENTO BASE
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Información de la Empresa, Productos y FAQs</label>
                    <textarea 
                      value={settings.additional_info}
                      onChange={(e) => setSettings({...settings, additional_info: e.target.value})}
                      placeholder={`- Información de la empresa/servicio: [Breve resumen]\n- Productos / Servicios clave: [Listado o descripción]\n- Preguntas Frecuentes (FAQs) rápidas:\n  * Horarios / Ubicación: [...]\n  * Precios / Formas de pago: [...]\n  * Tiempos de respuesta o entrega: [...]`}
                      className="w-full h-48 rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-[10px] text-gray-400 italic">Proporciona la información clave que el bot debe conocer para responder correctamente.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Diccionario Específico (Modismos, Palabras Clave o Jerga Técnica)</label>
                    <input 
                      type="text"
                      value={settings.vocabulary}
                      onChange={(e) => setSettings({...settings, vocabulary: e.target.value})}
                      placeholder="Ej: 'parce' para cercanía, 'SaaS' para tecnología, 'Bs.' para moneda..."
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Link a Carpeta de Documentación (Cloud)</label>
                    <input 
                      type="url"
                      value={settings.remote_info_link}
                      onChange={(e) => setSettings({...settings, remote_info_link: e.target.value})}
                      placeholder="https://drive.google.com/..."
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 5: Límites (Movida arriba por importancia) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                <h2 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="h-4 w-1 bg-red-500 rounded-full"></span>
                  5. LÍMITES Y REGLAS (COSA PROHIBIDAS)
                </h2>
                <textarea 
                  value={settings.prohibitions}
                  onChange={(e) => setSettings({...settings, prohibitions: e.target.value})}
                  className="w-full h-32 rounded-xl border-red-200 border p-3 outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30 font-medium"
                />
              </div>

              {/* Sección 6: Transferencia */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
                  6. FLUJO DE ESCALACIÓN A HUMANO
                </h2>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mensaje antes de transferir</label>
                <input 
                  type="text"
                  value={settings.handover_message}
                  onChange={(e) => setSettings({...settings, handover_message: e.target.value})}
                  className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Sección 7: Notificaciones */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
                <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
                  7. CONFIGURACIÓN DE NOTIFICACIONES (ADMIN)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email del Administrador (Alertas)</label>
                    <input 
                      type="email"
                      value={settings.admin_email}
                      onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
                      placeholder="admin@ejemplo.com"
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-[9px] text-gray-400 italic">Se enviará un resumen de la conversación cuando el bot pase a modo humano.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp del Administrador (Alertas)</label>
                    <input 
                      type="text"
                      value={settings.admin_phone}
                      onChange={(e) => setSettings({...settings, admin_phone: e.target.value})}
                      placeholder="584121234567"
                      className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-[9px] text-gray-400 italic">Número internacional sin el símbolo '+'. Ej: 584121234567</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Estilo de WhatsApp Real</label>
                  <p className="text-xs text-gray-400 italic">Forzar mensajes cortos, respuestas inmediatas y formato WhatsApp.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSettings({...settings, short_responses: !settings.short_responses})}
                  className={`relative h-7 w-12 rounded-full transition-colors ${settings.short_responses ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${settings.short_responses ? 'translate-x-5' : ''}`}></div>
                </button>
              </div>

              <button 
                onClick={generatePreview}
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest"
              >
                GENERAR Y REVISAR PROMPT MAESTRO
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2rem] shadow-inner">
                <h2 className="text-amber-800 font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-sm">
                  REVISIÓN DEL PROMPT FINAL (MAESTRO)
                </h2>
                <textarea 
                  value={finalPrompt}
                  onChange={(e) => setFinalPrompt(e.target.value)}
                  className="w-full h-[600px] rounded-2xl border-amber-300 border p-6 font-mono text-xs outline-none focus:ring-2 focus:ring-amber-500 bg-white leading-relaxed text-gray-700 shadow-sm"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="flex-1 bg-white border border-gray-200 text-gray-500 font-black py-4 rounded-2xl hover:bg-gray-50 transition-colors uppercase tracking-widest text-xs"
                >
                  VOLVER A EDITAR
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {saving ? 'GUARDANDO...' : 'CONFIRMAR Y ACTIVAR BOT'}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-6 p-4 rounded-xl text-center font-bold ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
