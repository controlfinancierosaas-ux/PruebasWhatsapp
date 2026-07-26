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
    tone: '',
    vocabulary: '',
    personality: '',
    short_responses: true,
    remote_info_link: '',
    additional_info: '',
    custom_prompt_override: '',
    prohibitions: ''
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
      
      setSettings({
        tone: predefinedTones.includes(tone) ? tone : (tone ? 'otro' : ''),
        vocabulary: data.vocabulary || '',
        personality: predefinedPersonalities.includes(personality) ? personality : (personality ? 'otro' : ''),
        short_responses: data.short_responses ?? false,
        remote_info_link: data.remote_info_link || '',
        additional_info: data.additional_info || '',
        custom_prompt_override: data.custom_prompt_override || '',
        prohibitions: data.prohibitions || 'No inventar precios ni promociones\nNo prometer plazos exactos\nNo hablar mal de la competencia\nNo salirse del tema del negocio'
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

    if (!activeTone && !activePersonality && !settings.additional_info && !settings.custom_prompt_override && !settings.prohibitions) {
      setFinalPrompt('');
      setShowPreview(true);
      return;
    }

    let prompt = `Eres un asistente de WhatsApp profesional.`;
    
    if (activeTone || activePersonality) {
      prompt += ` \nTu tono es ${activeTone || 'neutral'} y tu personalidad es ${activePersonality || 'equilibrada'}.`;
    }

    if (settings.vocabulary) {
      prompt += `\nUsa este vocabulario y jerga: ${settings.vocabulary}.`;
    }

    if (settings.additional_info) {
      prompt += `\nContexto adicional importante: ${settings.additional_info}.`;
    }

    if (settings.remote_info_link) {
      prompt += `\nDOCUMENTACIÓN EXTERNA: Tu conocimiento base se complementa con la información contenida en esta carpeta: ${settings.remote_info_link}. Actúa como si hubieras leído y analizado todos los documentos, precios, catálogos y manuales allí presentes.`;
    }

    if (settings.prohibitions) {
      prompt += `\nLÍMITES Y REGLAS (NO CRUZAR): \n${settings.prohibitions}`;
    }

    if (settings.short_responses) {
      prompt += `\nIMPORTANTE: \nEscribe mensajes CORTOS y directos, al estilo de WhatsApp. Evita párrafos largos.`;
    }

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
    if (!confirm('¿Estás seguro de que deseas REINICIAR el Bot? Esto borrará TODAS las instrucciones, personalidad y el prompt guardado, dejándolo en blanco.')) {
      return;
    }

    setSaving(true);
    const emptySettings = {
      tone: '',
      vocabulary: '',
      personality: '',
      short_responses: false,
      remote_info_link: '',
      additional_info: '',
      custom_prompt_override: '',
      prohibitions: ''
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
      setMessage('Bot reiniciado: Instrucciones borradas.');
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
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Personalización del Bot</h1>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleReset}
                className="text-red-500 text-sm font-bold border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpiar Bot
              </button>
              <Link href="/" className="bg-white border border-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
            </div>
          </div>

          {!showPreview ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tono */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Tono de Voz</label>
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
                      placeholder="Escribe el tono personalizado..."
                      className="w-full rounded-xl border-emerald-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                    />
                  )}
                </div>

                {/* Personalidad */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Personalidad</label>
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
                      placeholder="Escribe la personalidad personalizada..."
                      className="w-full rounded-xl border-emerald-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                    />
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Vocabulario y Jerga</label>
                <textarea 
                  value={settings.vocabulary}
                  onChange={(e) => setSettings({...settings, vocabulary: e.target.value})}
                  className="w-full h-24 rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Prohibiciones */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
                <label className="block text-sm font-bold text-red-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Límites y Reglas (Cosas Prohibidas)
                </label>
                <textarea 
                  value={settings.prohibitions}
                  onChange={(e) => setSettings({...settings, prohibitions: e.target.value})}
                  placeholder="Ej: No inventar precios, No hablar de política..."
                  className="w-full h-32 rounded-xl border-red-200 border p-3 outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30 font-medium text-gray-800"
                />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    IMPORTANTE: Estilo de WhatsApp Real
                  </label>
                  <p className="text-xs text-gray-400 italic font-bold">Mensajes CORTOS y directos, al estilo de WhatsApp. Evita párrafos largos.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSettings({...settings, short_responses: !settings.short_responses})}
                  className={`relative h-7 w-12 rounded-full transition-colors ${settings.short_responses ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${settings.short_responses ? 'translate-x-5' : ''}`}></div>
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Carpeta de Información Base (Cloud Link)</label>
                <input 
                  type="url"
                  value={settings.remote_info_link}
                  onChange={(e) => setSettings({...settings, remote_info_link: e.target.value})}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Datos Adicionales Manuales</label>
                <textarea 
                  value={settings.additional_info}
                  onChange={(e) => setSettings({...settings, additional_info: e.target.value})}
                  className="w-full h-32 rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button 
                onClick={generatePreview}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors"
              >
                GENERAR Y REVISAR PROMPT FINAL
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                <h2 className="text-amber-800 font-bold mb-2 flex items-center gap-2 uppercase tracking-wider text-sm">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Revisión del Prompt Final
                </h2>
                <textarea 
                  value={finalPrompt}
                  onChange={(e) => setFinalPrompt(e.target.value)}
                  placeholder="El prompt está vacío."
                  className="w-full h-96 rounded-xl border-amber-300 border p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white leading-relaxed"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-300 transition-colors"
                >
                  VOLVER
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'CONFIRMAR Y GUARDAR'}
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
