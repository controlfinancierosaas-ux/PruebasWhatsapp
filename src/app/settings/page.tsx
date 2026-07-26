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
    tone: 'formal',
    vocabulary: '',
    personality: 'resolutivo',
    short_responses: true,
    remote_info_link: '',
    additional_info: '',
    custom_prompt_override: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('bot_settings').select('*').eq('id', 1).single();
    if (data) {
      setSettings({
        tone: data.tone || 'formal',
        vocabulary: data.vocabulary || '',
        personality: data.personality || 'resolutivo',
        short_responses: data.short_responses ?? true,
        remote_info_link: data.remote_info_link || '',
        additional_info: data.additional_info || '',
        custom_prompt_override: data.custom_prompt_override || ''
      });
    }
    setLoading(false);
  };

  const generatePreview = () => {
    let prompt = `Eres un asistente de WhatsApp profesional. \nTu tono es ${settings.tone} y tu personalidad es ${settings.personality}.`;

    if (settings.vocabulary) {
      prompt += `\nUsa este vocabulario y jerga: ${settings.vocabulary}.`;
    }

    if (settings.additional_info) {
      prompt += `\nContexto adicional importante: ${settings.additional_info}.`;
    }

    if (settings.remote_info_link) {
      prompt += `\nDOCUMENTACIÓN EXTERNA: Tu conocimiento base se complementa con la información contenida en esta carpeta: ${settings.remote_info_link}. Actúa como si hubieras leído y analizado todos los documentos, precios, catálogos y manuales allí presentes.`;
    }

    if (settings.short_responses) {
      prompt += `\nIMPORTANTE: Escribe mensajes CORTOS y directos, al estilo de WhatsApp. Evita párrafos largos.`;
    }

    setFinalPrompt(settings.custom_prompt_override || prompt);
    setShowPreview(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('bot_settings')
      .update({
        ...settings,
        custom_prompt_override: finalPrompt,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      setMessage('Error al guardar: ' + error.message);
    } else {
      setMessage('Configuración y Prompt guardados correctamente.');
      setShowPreview(false);
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <DashboardHeader />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Personalización del Bot</h1>
            <Link href="/" className="text-emerald-600 font-bold hover:underline flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </Link>
          </div>

          {!showPreview ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Tono de Voz</label>
                  <select 
                    value={settings.tone}
                    onChange={(e) => setSettings({...settings, tone: e.target.value})}
                    className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="formal">🎩 Formal / Profesional</option>
                    <option value="cercano">😊 Cercano / Amigable</option>
                    <option value="divertido">🤪 Divertido / Bromista</option>
                    <option value="directo">⚡ Directo / Conciso</option>
                  </select>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Personalidad</label>
                  <select 
                    value={settings.personality}
                    onChange={(e) => setSettings({...settings, personality: e.target.value})}
                    className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="resolutivo">🛠 Resolutivo / Eficaz</option>
                    <option value="paciente">🧘 Paciente / Empático</option>
                    <option value="entusiasta">🚀 Entusiasta / Vendedor</option>
                    <option value="analitico">🧐 Analítico / Detallista</option>
                  </select>
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

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Estilo de WhatsApp Real</label>
                  <p className="text-xs text-gray-400 italic">Mensajes cortos y directos.</p>
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
                <p className="mt-2 text-[10px] text-emerald-600 font-bold uppercase">El bot leerá esta carpeta para configurar su conocimiento.</p>
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
                <h2 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Revisión del Prompt Final
                </h2>
                <p className="text-sm text-amber-700 mb-4">Este es el texto exacto que se enviará a la IA. Puedes editarlo libremente antes de guardar.</p>
                
                <textarea 
                  value={finalPrompt}
                  onChange={(e) => setFinalPrompt(e.target.value)}
                  className="w-full h-96 rounded-xl border-amber-300 border p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="flex-1 bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-300 transition-colors"
                >
                  VOLVER A PARAMETROS
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'CONFIRMAR Y GUARDAR CONFIGURACIÓN'}
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
