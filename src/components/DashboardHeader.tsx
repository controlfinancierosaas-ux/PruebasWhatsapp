'use client';

export default function DashboardHeader() {
  const handleDisconnect = async () => {
    if (confirm('¿Estás seguro de que deseas cerrar la sesión?')) {
      await fetch('/api/connection/disconnect', { method: 'POST' });
      window.location.reload();
    }
  };

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">W</div>
        <h1 className="text-xl font-bold text-gray-800">WhatsApp AI Bot</h1>
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
