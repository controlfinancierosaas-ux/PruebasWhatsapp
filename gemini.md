# Seguimiento del Proyecto PruebasWhatsapp

## [2026-07-26] Corrección de Bucle de Conexión y Mejora de Trazabilidad Externo

### 1. Solución al Bucle de Conexión (UI)
- **Problema:** El sistema bloqueaba todo acceso al dashboard si no había una conexión activa de WhatsApp, mostrando una pantalla de "Esperando conexión" infinita.
- **Corrección:** Se refactorizó `ConnectionGate` para que sea un Proveedor de Contexto (`useConnection`) en lugar de un componente de bloqueo. Ahora, el dashboard siempre es accesible.
- **Nueva Lógica:** Si no hay una conversación seleccionada y el estado es `disconnected` o `qr`, el sistema muestra el código QR dentro del panel central. Si está conectado, muestra un mensaje de bienvenida.
- **Indicador de Estado:** Se añadió un punto de color en la cabecera (`DashboardHeader`) que indica en tiempo real el estado: Verde (Conectado), Ámbar (Esperando QR), Rojo (Desconectado).

### 2. Mejora en la Tabla `outbox` (Trazabilidad)
- **Nuevos Campos:** Se añadieron columnas para seguimiento detallado del envío:
  - `status`: Estado del envío (`pending`, `sent`, `error`).
  - `error_message`: Motivo del fallo si el envío falla.
  - `sent_at`: Fecha y hora exacta del envío exitoso.
  - `whatsapp_message_id`: El ID único generado por WhatsApp para ese mensaje.
- **Lógica del Worker:** El bot ahora actualiza estos campos automáticamente al procesar el `outbox`. Si el bot está desconectado, no procesa la cola hasta que se restablezca la conexión, evitando fallos silenciosos.

### 3. Guía de Integración para Proyectos Externos
Para enviar mensajes desde otro proyecto usando este sistema, sigue estas instrucciones:

#### Paso 1: Configuración en el Proyecto Externo
Debes conectar el proyecto externo a la misma base de datos de Supabase. Necesitarás:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` o `SERVICE_ROLE_KEY`
#### Paso 2: Envío de Mensajes y Obtención del ID
Para poder rastrear el mensaje, el proyecto externo debe capturar el `id` generado al momento de la inserción.

**Opción A: Usando el cliente de Supabase (JavaScript/TypeScript)**
```javascript
const { data, error } = await supabase
  .from('outbox')
  .insert({ phone: '584121234567', content: 'Hola mundo' })
  .select('id') // <--- Esto devuelve el ID generado
  .single();

const messageId = data.id;
```

**Opción B: Usando SQL Directo**
```sql
INSERT INTO outbox (phone, content) 
VALUES ('584121234567', 'Hola mundo') 
RETURNING id; -- <--- Devuelve el ID inmediatamente
```

**Opción C: Generando el ID desde el proyecto externo**
Si prefieres, puedes generar tu propio UUID en el proyecto externo y enviarlo, así ya lo conoces de antemano:
```javascript
const myId = crypto.randomUUID();
await supabase.from('outbox').insert({ id: myId, phone: '...', content: '...' });
```

#### Paso 3: Seguimiento del Estado
...
El proyecto externo puede consultar el estado del envío usando el ID del registro insertado:
```sql
SELECT status, error_message, sent_at, whatsapp_message_id 
FROM outbox 
WHERE id = 'ID_DEL_REGISTRO';
```
- Si `status` es `sent`, el mensaje llegó a los servidores de WhatsApp.
- Si `status` es `error`, consulta `error_message` para saber qué pasó (ej: "session closed").

### SQL Requerido para Actualización:
```sql
-- Ejecutar en el Editor SQL de Supabase
ALTER TABLE outbox ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS whatsapp_message_id text;

-- Asegurar que los mensajes antiguos tengan un estado
UPDATE outbox SET status = 'sent' WHERE sent = true AND status = 'pending';
```

## [2026-07-23] Implementación de Switch Global de IA y Mejoras de Configuración
...
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

### 3. Envío Externo de Mensajes (API vía Supabase)
- **Funcionalidad:** Ahora es posible enviar mensajes de WhatsApp desde cualquier sistema externo simplemente insertando un registro en la tabla `outbox` de Supabase.
- **Lógica:** El bot escanea esta tabla cada 3 segundos. Si encuentra un mensaje con `sent: false`, lo envía automáticamente.
- **Automatización:** Si el número de teléfono no existe en la lista de conversaciones, el sistema la crea automáticamente para mantener el historial.
- **Campos Requeridos en `outbox`:**
  - `phone`: Número de teléfono (ej: `584121234567`, sin el + ni @s.whatsapp.net).
  - `content`: Texto del mensaje.
  - `sent`: `false` (por defecto).

### 4. Diagnóstico de Respuestas del Bot
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
