'use client';

import { useState } from 'react';
import ConnectionGate from '@/components/ConnectionGate';
import DashboardHeader from '@/components/DashboardHeader';
import ConversationList from '@/components/ConversationList';
import ConversationPanel from '@/components/ConversationPanel';

export default function Home() {
  const [selectedConv, setSelectedConv] = useState<any>(null);

  return (
    <ConnectionGate>
      <div className="flex flex-col h-screen overflow-hidden">
        <DashboardHeader />
        <main className="flex flex-1 overflow-hidden">
          <ConversationList 
            onSelect={setSelectedConv} 
            selectedId={selectedConv?.id} 
          />
          <div className="flex-1">
            {selectedConv ? (
              <ConversationPanel conversation={selectedConv} />
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-50 text-gray-500">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl">💬</div>
                  <p>Selecciona una conversación para comenzar</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ConnectionGate>
  );
}
