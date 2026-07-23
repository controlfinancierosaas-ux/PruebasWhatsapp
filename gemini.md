# Seguimiento del Proyecto PruebasWhatsapp

## [2026-07-23] Implementación de Switch Global de IA y Mejoras de Configuración

Se han realizado las siguientes correcciones y mejoras solicitadas:

### 1. Switch Global de IA (Master Switch)
- **Base de Datos:** Se ha preparado el campo `global_ai_enabled` en la tabla `connection_state` (ID: 1) para controlar el estado global del bot.
- **Interfaz (DashboardHeader):** Se añadió un interruptor maestro en la cabecera del sistema que permite activar o desactivar la IA para todos los chats simultáneamente.
- **Lógica de Mensajes (Handler):** Se actualizó `handleMessage` para que respete tanto el interruptor global como el modo individual de cada chat. Si la IA Global está apagada, no se generarán respuestas automáticas independientemente de la configuración individual.

### 2. Gestión de Conexión (Desvinculación y Reconexión)
- **Interfaz:** Se mejoró el botón de desconexión para que sea una acción explícita de "Desvincular WhatsApp".
- **Lógica de Backend:** Al desvincular, se eliminan las credenciales de sesión en Supabase y se marca el estado como `disconnected`.
- **Worker (Watchdog):** El bot ahora monitorea el estado en la base de datos. Si detecta una desvinculación manual, ejecuta un `logout()` de la sesión de WhatsApp, lo que provoca que el sistema genere un nuevo código QR automáticamente para permitir una nueva conexión.
- **Flujo:** Desvincular -> El sistema vuelve a la pantalla de QR -> Escanear nuevo QR para reconectar.

### 3. Diagnóstico de Respuestas del Bot
- Se ha añadido logging detallado en `handler.ts` y `openrouter.ts` para rastrear el flujo de mensajes y detectar por qué el bot podría no estar respondiendo.
- **Posible causa:** Si estás enviando mensajes desde el mismo número vinculado (Linked Device), Baileys los marca como `fromMe: true` y el bot los ignora por seguridad para evitar bucles infinitos. Se recomienda probar enviando mensajes desde un número externo.

### 3. Configuración de Personalidad y Tono (Respuesta a consulta)
- **Ubicación actual:** La personalidad se configura en `src/lib/system-prompt.ts`. Allí se define el `SYSTEM_PROMPT` que dicta el comportamiento, tono y estilo.
- **Personalización Futura:** Para permitir que diferentes usuarios configuren su bot, se puede mover este prompt a una tabla de `settings` en Supabase.
- **Fuente de Información (RAG):** Para que el bot lea archivos locales, se puede implementar un sistema de búsqueda vectorial (Vector Search) o simplemente incluir el contenido de archivos de texto pequeños directamente en el `SYSTEM_PROMPT`.

### 4. Selección de Modelo (Respuesta a consulta)
- **Implementación:** Se ha refactorizado `openrouter.ts` para que el modelo sea configurable mediante la variable de entorno `AI_MODEL`. Si no se define, se usa `google/gemini-2.0-flash-001` por defecto.
- **Cómo sabe OpenRouter qué usar:** Se envía el string del modelo (ej: `anthropic/claude-3-opus`) en el cuerpo de la petición a la API de OpenRouter.

### Pendientes:
- Aplicar SQL para añadir la columna `global_ai_enabled` en Supabase.
- Monitorear logs de Node.js para confirmar la recepción y procesamiento de mensajes.

### SQL Requerido:
```sql
ALTER TABLE connection_state ADD COLUMN IF NOT EXISTS global_ai_enabled BOOLEAN DEFAULT TRUE;
```

### Configuración Git:
- Rama: `main`
- Push directo realizado.
