'use client';

import { useState } from 'react';
import ConnectionGate, { useConnection } from '@/components/ConnectionGate';
import DashboardHeader from '@/components/DashboardHeader';
import ConversationList from '@/components/ConversationList';
import ConversationPanel from '@/components/ConversationPanel';
import QRScreen from '@/components/QRScreen';

function DashboardContent() {
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const { status, qr } = useConnection();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader />
      <main className="flex flex-1 overflow-hidden">
        <ConversationList 
          onSelect={setSelectedConv} 
          selectedId={selectedConv?.id} 
        />
        <div className="flex-1 overflow-hidden">
          {selectedConv ? (
            <ConversationPanel conversation={selectedConv} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-gray-50 text-gray-500 overflow-y-auto p-8">
              {status !== 'connected' ? (
                <div className="w-full max-w-md">
                   <QRScreen qr={qr} status={status} />
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl">💬</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">WhatsApp Conectado</h3>
                  <p>Selecciona una conversación para comenzar a chatear o ver el historial</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ConnectionGate>
      <DashboardContent />
    </ConnectionGate>
  );
}
