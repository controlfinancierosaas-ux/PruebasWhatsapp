'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import Link from 'next/link';

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [settings, setSettings] = useState({
    admin_email: '',
    admin_phone: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('bot_settings').select('admin_email, admin_phone').eq('id', 1).single();
    if (data) {
      setSettings({
        admin_email: data.admin_email || '',
        admin_phone: data.admin_phone || ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('bot_settings')
      .update({
        admin_email: settings.admin_email,
        admin_phone: settings.admin_phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      setMessage('Error al guardar: ' + error.message);
    } else {
      setMessage('Configuración del sistema guardada.');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-emerald-600">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-gray-800">
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight uppercase">Configuración del Sistema</h1>
            <Link href="/" className="bg-white border border-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              Dashboard
            </Link>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 ring-4 ring-emerald-50/50">
            <h2 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <span className="h-4 w-1 bg-emerald-500 rounded-full"></span>
              INFORMACIÓN DEL ADMINISTRADOR (ALERTAS)
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email del Administrador (Alertas)</label>
                <input 
                  type="email"
                  value={settings.admin_email}
                  onChange={(e) => setSettings({...settings, admin_email: e.target.value})}
                  placeholder="admin@ejemplo.com"
                  className="w-full rounded-xl border-gray-200 border p-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-1 text-[10px] text-gray-400 italic">Se enviará un resumen de la conversación cuando el bot pase a modo humano.</p>
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

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 uppercase tracking-widest text-xs mt-8"
              >
                {saving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN DEL SISTEMA'}
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-6 p-4 rounded-xl text-center font-bold bg-emerald-50 text-emerald-600">
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
