'use client';

export default function QRScreen({ qr, status }: { qr: string | null; status: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 border border-gray-100 shadow-sm text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
        </div>
        
        <h2 className="mb-2 text-xl font-bold text-gray-800">Vincular WhatsApp</h2>
        <p className="mb-6 text-sm text-gray-500">Para enviar y recibir mensajes, debes conectar tu cuenta.</p>
        
        {status === 'qr' && qr ? (
          <div className="flex flex-col items-center">
            <img src={qr} alt="WhatsApp QR Code" className="mb-4 h-48 w-48 rounded-lg border p-2 bg-white" />
            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
              Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-700">Generando código QR...</p>
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">Estado: {status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
