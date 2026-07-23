'use client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'human';
  content: string;
  created_at: string;
}

export default function MessageBubble({ message }: { message: Message }) {
  const isMe = message.role === 'assistant' || message.role === 'human';

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
        isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
      }`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className={`mt-1 text-[10px] ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.role === 'human' && ' (Operador)'}
          {message.role === 'assistant' && ' (AI)'}
        </div>
      </div>
    </div>
  );
}
