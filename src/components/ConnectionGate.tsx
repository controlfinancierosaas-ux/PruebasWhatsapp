'use client';

import { useEffect, useState, createContext, useContext } from 'react';

interface ConnectionContextType {
  status: string;
  qr: string | null;
  loading: boolean;
}

const ConnectionContext = createContext<ConnectionContextType>({
  status: 'loading',
  qr: null,
  loading: true,
});

export const useConnection = () => useContext(ConnectionContext);

export default function ConnectionGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<string>('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/connection/status');
        const data = await res.json();
        setStatus(data.status);
        setQr(data.qr_string);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ConnectionContext.Provider value={{ status, qr, loading }}>
      {children}
    </ConnectionContext.Provider>
  );
}
