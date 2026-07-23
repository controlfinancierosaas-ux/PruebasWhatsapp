'use client';

import { useEffect, useState } from 'react';
import QRScreen from './QRScreen';

export default function ConnectionGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<string>('loading');
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/connection/status');
        const data = await res.json();
        setStatus(data.status);
        setQr(data.qr_string);
      } catch (e) {
        console.error(e);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'loading') return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (status === 'connected') return <>{children}</>;

  return <QRScreen qr={qr} status={status} />;
}
