'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import Link from 'next/link';

const AI_MODELS = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Rápido)', desc: '⭐ Recomendado - Rápido y económico' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', desc: 'Eficiente para chats frecuentes' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Mayor capacidad de razonamiento' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', desc: 'Rápido y compacto' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', desc: 'Balance entre velocidad y calidad' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Rápido y económico' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', desc: 'Alta calidad' },
  { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B', desc: 'Open source, eficiente' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', desc: 'Open source, versátil' },
  { id: 'custom', name: 'Otro (especificar)', desc: 'Define tu propio modelo' },
];

const TEMPERATURE_PRESETS = [
  { label: '🔒 Determinista (0.0)', value: 0 },
  { label: '⚖️ Balanceado (0.5)', value: 0.5 },
  { label: '🎲 Creativo (0.7)', value: 0.7 },
  { label: '🔥 Muy creativo (1.0)', value: 1.0 },
];

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState('');
  
  const [settings, setSettings] = useState({
    admin_email: '',
    admin_phone: '',
    // Nuevas opciones de IA
    ai_model: 'google/gemini-2.0-flash-001',
    ai_custom_model: '',
    ai_temperature: 0.7,
    ai_max_tokens: 500,
    // Nuevas opciones de comportamiento
    unconfigured_greeting: '¡Hola! Aún no he sido configurado completamente. Para que un asesor humano te contacte, necesito algunos datos.',
    greeting_enabled: true,
    max_human_messages: 10,
  });

  const [showCustomModel, setShowCustomModel] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('bot_settings').select('*').eq('id', 1).single();
    if (data) {
      const aiModel = data.ai_model || 'google/gemini-2.0-flash-001';
      const isCustomModel = !AI_MODELS.some(m => m.id === aiModel);
      
      setSettings({
        admin_email: data.admin_email || '',
        admin_phone: data.admin_phone || '',
        ai_model: isCustomModel ? 'custom' : aiModel,
        ai_custom_model: isCustomModel ? aiModel : '',
        ai_temperature: typeof data.ai_temperature === 'number' ? data.ai_temperature : 0.7,
        ai_max_tokens: typeof data.ai_max_tokens === 'number' ? data.ai_max_tokens : 500,
        unconfigured_greeting: data.unconfigured_greeting || '¡Hola! Aún no he sido configurado completamente. Para que un asesor humano te contacte, necesito algunos datos.',
        greeting_enabled: data.greeting_enabled !== false,
        max_human_messages: typeof data.max_human_messages === 'number' ? data.max_human_messages : 10,
      });

      if (isCustomModel) {
        setShowCustomModel(true);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const modelToSave = settings.ai_model === 'custom' ? settings.ai_custom_model : settings.ai_model;

    const { error } = await supabase
      .from('bot_settings')
      .update({
        admin_email: settings.admin_email,
        admin_phone: settings.admin_phone,
        ai_model: modelToSave,
        ai_temperature: settings.ai_temperature,
        ai_max_tokens: settings.ai_max_tokens,
        unconfigured_greeting: settings.unconfigured_greeting,
        greeting_enabled: settings.greeting_enabled,
        max_human_messages: settings.max_human_messages,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      setMessage('Error al guardar: ' + error.message);
    } else {
      setMessage('Configuración guardada correctamente.');
      setTimeout(() => setMessage(''), 4000);
    }
    setSaving(false);
  };

  const handleSendTestEmail = async () => {
    if (!settings.admin_email) {
      setTestEmailStatus('error');
      return;
    }

    setSendingTest(true);
    setTestEmailStatus('');

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.admin_email,
          subject: '✅ Prueba de configuración - Bot de WhatsApp',
          text: `Esta es una prueba de configuración del bot.\n\nSi recibes este email, la configuración SMTP está correcta.\n\nHora del mensaje: ${new Date().toLocaleString('es-ES')}`,
        })
      });

      const result = await response.json();

      if (result.success) {
        setTestEmailStatus('success');
      } else {
        setTestEmailStatus('error: ' + (result.error || 'Error desconocido'));
      }
    } catch (e: any) {
      setTestEmailStatus('error: ' + e.message);
    }

    setSendingTest(false);
    setTimeout(() => setTestEmailStatus(''), 6000);
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-emerald-600">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-gray-800">
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight uppercase">Configuración del Sistema</h1>
            <Link href="/" className="bg-white border border-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              Dashboard
            </Link>
          </div>

          {/* Info Admin */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 ring-4 ring-emerald-50/50">
            <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
              INFORMACIÓN DEL ADMINISTRADOR
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email del Administrador (Alertas)</label>
                <input 
                  type="email"
                  value={settings.admin_email}
                  onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
                  placeholder="admin@ejemplo.com"
                  className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                <p className="mt-1 text-[10px] text-gray-400 italic">Número internacional sin el símbolo '+'. Ej: 584121234567</p>
              </div>

              {/* Botón de prueba de email */}
              <div className="pt-2">
                <button 
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !settings.admin_email}
                  className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs uppercase tracking-widest flex items-center gap-2"
                >
                  {sendingTest ? '⏳ Enviando...' : '📧 Enviar Email de Prueba'}
                </button>
                {testEmailStatus === 'success' && (
                  <span className="ml-4 text-emerald-600 font-bold text-xs">✅ Email enviado correctamente</span>
                )}
                {testEmailStatus.startsWith('error') && (
                  <span className="ml-4 text-red-600 font-bold text-xs">❌ {testEmailStatus.replace('error: ', '')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Configuración de IA */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-violet-200 ring-4 ring-violet-50/50">
            <h2 className="text-xs font-black text-violet-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="h-4 w-1 bg-violet-500 rounded-full"></span>
              CONFIGURACIÓN DE IA
            </h2>
            
            <div className="space-y-6">
              {/* Modelo */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Modelo de IA (OpenRouter)</label>
                <select 
                  value={settings.ai_model}
                  onChange={(e) => {
                    setSettings({...settings, ai_model: e.target.value});
                    setShowCustomModel(e.target.value === 'custom');
                  }}
                  className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {AI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name} - {m.desc}</option>
                  ))}
                </select>
                
                {showCustomModel && (
                  <input 
                    type="text"
                    value={settings.ai_custom_model}
                    onChange={(e) => setSettings({...settings, ai_custom_model: e.target.value})}
                    placeholder="Escribe el ID del modelo (ej: provider/model-name)"
                    className="w-full rounded-xl border-violet-200 border p-3 outline-none focus:ring-2 focus:ring-violet-500 mt-3 bg-violet-50/30"
                  />
                )}
                
                <p className="mt-1 text-[10px] text-gray-400 italic">
                  Modelos disponibles en OpenRouter. Los costos varían según el modelo.
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Temperatura (Creatividad)</label>
                <div className="flex gap-2 flex-wrap">
                  {TEMPERATURE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setSettings({...settings, ai_temperature: p.value})}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        settings.ai_temperature === p.value
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-violet-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-gray-400 italic">
                  0 = respuestas predecibles, 1 = muy creativas. Recomendado: 0.7
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Longitud máxima de respuesta (tokens)
                </label>
                <input 
                  type="number"
                  min="50"
                  max="4000"
                  value={settings.ai_max_tokens}
                  onChange={(e) => setSettings({...settings, ai_max_tokens: parseInt(e.target.value) || 500})}
                  className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="mt-1 text-[10px] text-gray-400 italic">
                  Máximo de tokens en la respuesta. Más tokens = respuestas más largas. Recomendado: 500
                </p>
              </div>
            </div>
          </div>

          {/* Comportamiento */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-amber-200 ring-4 ring-amber-50/50">
            <h2 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="h-4 w-1 bg-amber-500 rounded-full"></span>
              COMPORTAMIENTO Y SALUDOS
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mensaje cuando el bot no está configurado</label>
                <textarea 
                  value={settings.unconfigured_greeting}
                  onChange={(e) => setSettings({...settings, unconfigured_greeting: e.target.value})}
                  placeholder="¡Hola! Aún no he sido configurado completamente..."
                  className="w-full h-20 rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <p className="mt-1 text-[10px] text-gray-400 italic">
                  Este mensaje se muestra cuando el bot no tiene configuración o falla técnicamente.
                </p>
              </div>

              <div className="flex items-center justify-between bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <div>
                  <p className="font-bold text-sm text-gray-700">Captura automática de datos</p>
                  <p className="text-[10px] text-gray-400">Cuando el bot falla/no está configurado, pide Nombre → Email → Teléfono y notifica al admin</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSettings({...settings, greeting_enabled: !settings.greeting_enabled})}
                  className={`relative h-7 w-12 rounded-full transition-colors ${settings.greeting_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${settings.greeting_enabled ? 'translate-x-5' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Guardar */}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 uppercase tracking-widest text-sm"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración del Sistema'}
          </button>

          {message && (
            <div className={`mt-2 p-4 rounded-xl text-center font-bold text-sm ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
