'use client';

import { useEffect, useState, useRef } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'human';
  content: string;
  created_at: string;
}

export default function ConversationPanel({ conversation }: { conversation: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(conversation.mode);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(conversation.mode);
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [conversation.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const res = await fetch(`/api/messages/${conversation.id}`);
    const data = await res.json();
    setMessages(data);
  };

  const toggleMode = async () => {
    const newMode = mode === 'AI' ? 'HUMAN' : 'AI';
    await fetch(`/api/mode/${conversation.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ mode: newMode }),
    });
    setMode(newMode);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentInput = input;
    setInput('');

    await fetch(`/api/messages/${conversation.id}`, {
      method: 'POST',
      body: JSON.stringify({ content: currentInput, phone: conversation.phone }),
    });

    fetchMessages();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold uppercase">
            {conversation.name.substring(0, 1)}
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{conversation.name}</h3>
            <p className="text-xs text-gray-500">+{conversation.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Modo IA:</span>
            <button 
              onClick={toggleMode}
              className={`relative h-6 w-11 rounded-full transition-colors ${mode === 'AI' ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${mode === 'AI' ? 'translate-x-5' : ''}`}></div>
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <form onSubmit={handleSend} className="bg-white p-4 border-t flex gap-3">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-full border border-gray-300 px-6 py-2 outline-none focus:border-emerald-500"
        />
        <button 
          type="submit"
          className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
            <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
