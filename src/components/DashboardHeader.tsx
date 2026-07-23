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
    if (confirm('¿Estás seguro de que deseas cerrar la sesión?')) {
      await fetch('/api/connection/disconnect', { method: 'POST' });
      window.location.reload();
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
      
      <button 
        onClick={handleDisconnect}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
      >
        Cerrar Sesión
      </button>
    </header>
  );
}
