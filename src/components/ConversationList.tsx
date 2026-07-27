'use client';

import { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  phone: string;
  real_phone?: string;
  name: string;
  mode: string;
  last_message_at: string;
}

export default function ConversationList({ 
  onSelect, 
  selectedId 
}: { 
  onSelect: (conv: Conversation) => void;
  selectedId: string | null;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const fetchConversations = async () => {
    const res = await fetch('/api/conversations');
    const data = await res.json();
    setConversations(data);
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white border-r w-80">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold text-gray-800">Conversaciones</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div 
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50 
              ${selectedId === conv.id ? 'bg-emerald-50' : ''}
              ${conv.mode === 'HUMAN' ? 'border-l-4 border-l-amber-500 bg-amber-50/30' : ''}
            `}
          >
            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-gray-500 uppercase 
              ${conv.mode === 'HUMAN' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200'}
            `}>
              {conv.name.substring(0, 1)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-800 truncate">{conv.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${conv.mode === 'AI' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-500 text-white shadow-sm'}`}>
                  {conv.mode === 'AI' ? 'BOT' : 'HUMANO'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 overflow-hidden">
                <p className="truncate">+{conv.real_phone || conv.phone}</p>
                {conv.real_phone && conv.real_phone !== conv.phone && (
                  <span className="text-[9px] text-gray-400 font-mono truncate">({conv.phone})</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
