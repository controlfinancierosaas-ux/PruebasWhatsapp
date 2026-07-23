'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardHeader() {
  const [globalAI, setGlobalAI] = useState(true);

  useEffect(() => {
    const fetchGlobalAI = async () => {
      const { data } = await supabase
        .from('connection_state')
        .select('global_ai_enabled')
        .eq('id', 1)
        .single();
      
      if (data) {
        setGlobalAI(data.global_ai_enabled ?? true);
      }
    };

    fetchGlobalAI();

    // Subscribe to changes
    const channel = supabase
      .channel('public:connection_state')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'connection_state',
        filter: 'id=eq.1' 
      }, (payload) => {
        if (payload.new && 'global_ai_enabled' in payload.new) {
          setGlobalAI(payload.new.global_ai_enabled);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleGlobalAI = async () => {
    const newValue = !globalAI;
    const { error } = await supabase
      .from('connection_state')
      .update({ global_ai_enabled: newValue })
      .eq('id', 1);
    
    if (!error) {
      setGlobalAI(newValue);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('¿Estás seguro de que deseas DESVINCULAR tu WhatsApp? Esto detendrá el bot y tendrás que escanear el QR nuevamente para volver a conectarlo.')) {
      const res = await fetch('/api/connection/disconnect', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Error al desvincular la cuenta.');
      }
    }
  };

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">W</div>
          <h1 className="text-xl font-bold text-gray-800">WhatsApp AI Bot</h1>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
          <span className="text-sm font-semibold text-gray-700">IA GLOBAL:</span>
          <button 
            onClick={toggleGlobalAI}
            className={`relative h-6 w-11 rounded-full transition-all duration-200 ${globalAI ? 'bg-emerald-500 shadow-sm' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${globalAI ? 'translate-x-5' : ''}`}></div>
          </button>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${globalAI ? 'text-emerald-600' : 'text-gray-400'}`}>
            {globalAI ? 'Activada' : 'Desactivada'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={handleDisconnect}
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100 hover:shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Desvincular WhatsApp
        </button>
      </div>
    </header>
  );
}
