'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import Link from 'next/link';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [settings, setSettings] = useState({
    tone: 'formal',
    vocabulary: '',
    personality: 'resolutivo',
    short_responses: true,
    remote_info_link: '',
    additional_info: ''
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
        additional_info: data.additional_info || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('bot_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      setMessage('Error al guardar: ' + error.message);
    } else {
      setMessage('Configuración guardada correctamente.');
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

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tono */}
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
                <p className="mt-2 text-xs text-gray-400 italic">Determina qué tan serio o relajado será el Bot.</p>
              </div>

              {/* Personalidad */}
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
                <p className="mt-2 text-xs text-gray-400 italic">Define la actitud del Bot ante los problemas o consultas.</p>
              </div>
            </div>

            {/* Vocabulario */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Vocabulario y Jerga</label>
              <textarea 
                value={settings.vocabulary}
                onChange={(e) => setSettings({...settings, vocabulary: e.target.value})}
                placeholder="Ej: Usar palabras como 'parce', 'che', 'vale'. O términos técnicos como 'SaaS', 'Equity', etc."
                className="w-full h-24 rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Estilo de Respuesta */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Estilo de WhatsApp Real</label>
                <p className="text-xs text-gray-400 italic">Obliga al Bot a responder con mensajes cortos y directos (sin párrafos).</p>
              </div>
              <button 
                type="button"
                onClick={() => setSettings({...settings, short_responses: !settings.short_responses})}
                className={`relative h-7 w-12 rounded-full transition-colors ${settings.short_responses ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${settings.short_responses ? 'translate-x-5' : ''}`}></div>
              </button>
            </div>

            {/* Link Remoto */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Información en la Nube (Carpeta/Link)</label>
              <input 
                type="url"
                value={settings.remote_info_link}
                onChange={(e) => setSettings({...settings, remote_info_link: e.target.value})}
                placeholder="https://drive.google.com/drive/..."
                className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-2 text-xs text-gray-400 italic">Si el Bot no sabe algo, invitará al usuario a revisar este enlace.</p>
            </div>

            {/* Información Amplia Adicional */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Instrucciones y Datos Adicionales</label>
              <textarea 
                value={settings.additional_info}
                onChange={(e) => setSettings({...settings, additional_info: e.target.value})}
                placeholder="Detalla aquí tus precios, servicios, horarios o cualquier dato que el Bot deba conocer a fondo."
                className="w-full h-40 rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <button 
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'GUARDAR CONFIGURACIÓN'}
              </button>
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-center font-bold ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
