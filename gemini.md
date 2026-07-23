# Seguimiento del Proyecto PruebasWhatsapp

## [2026-07-23] Despliegue de Arquitectura Distribuida para Bot de WhatsApp

Se ha implementado el proyecto completo siguiendo el stack solicitado:

### Avances Realizados:
- **Corrección de Build (Vercel):**
  - Se instaló `@tailwindcss/postcss` y se actualizó `postcss.config.mjs` para solucionar el error de compilación de Tailwind CSS 4.
- **Base de Datos (Supabase):**
  - Definición de esquema para `conversations`, `messages`, `connection_state`, `outbox` y `baileys_auth`.
  - Configuración del cliente `supabase.ts` con soporte para service role.
- **Worker (Node.js / Baileys):**
  - Implementación de `scripts/start-bot.ts` con servidor HTTP dummy en puerto 3000 (requisito de Render).
  - Adaptador de autenticación personalizado (`auth-adapter.ts`) para persistir la sesión de WhatsApp en Supabase.
  - Lógica de polling para la tabla `outbox` permitiendo el envío de mensajes desde la web.
  - Integración con OpenRouter (Gemini 2.0 Flash) para respuestas de IA.
- **Dashboard (Next.js 16 / React 19):**
  - Interfaz moderna con Tailwind CSS 4.
  - Gestión de estado de conexión con pantalla de QR dinámica.
  - Sistema de chat con cambio de modo (AI / HUMAN) por conversación.
  - Rutas de API siguiendo estándares de Next.js 16 (params asíncronos).

### Pendientes:
- Realizar pruebas de carga con múltiples conversaciones simultáneas.
- Implementar soporte para mensajes multimedia (imágenes/audio) en el dashboard.
- Configurar backups automáticos de la tabla `baileys_auth`.

### Configuración Git:
- Rama: `main`
- Token de acceso configurado.
