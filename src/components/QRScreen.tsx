'use client';

export default function QRScreen({ qr, status }: { qr: string | null; status: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">Conecta tu WhatsApp</h1>
        
        {status === 'qr' && qr ? (
          <div className="flex flex-col items-center">
            <img src={qr} alt="WhatsApp QR Code" className="mb-6 h-64 w-64 rounded-lg border p-2" />
            <p className="text-gray-600">Escanea este código desde WhatsApp > Dispositivos vinculados</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            <p className="text-lg font-medium text-gray-700">Esperando conexión...</p>
            <p className="text-sm text-gray-500 mt-2">Estado: {status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
