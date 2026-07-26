# Seguimiento del Proyecto PruebasWhatsapp

## [2026-07-26] Corrección de Bucle de Conexión, Resolución de Contactos y Mejora de Trazabilidad

### 1. Solución al Bucle de Conexión (UI)
- **Problema:** El sistema bloqueaba todo acceso al dashboard si no había una conexión activa de WhatsApp.
- **Corrección:** `ConnectionGate` ahora es un proveedor de contexto. El dashboard es siempre accesible.
- **Nueva Lógica:** El QR se muestra integrado en el panel central cuando el bot está desconectado. Se añadió un indicador de estado en tiempo real (Punto Verde/Ámbar/Rojo) en la cabecera.

### 2. Resolución de Contactos (ID Técnico vs Número Real)
- **Problema:** WhatsApp usa identificadores internos (LIDs) largos (ej: `458273...`) para cuentas multidispositivo, lo que oculta el número real del usuario.
- **Solución:** Se implementó una función de resolución en `handler.ts`. Al recibir un mensaje, el bot intenta mapear el LID al número de teléfono real (`jid`) consultando los metadatos de WhatsApp.
- **Visualización:** El Dashboard ahora muestra el número real como primario y el ID técnico entre paréntesis para trazabilidad.

### 3. Mejora en la Tabla `outbox` (Trazabilidad)
- **Nuevos Campos:** Se añadieron columnas `status`, `error_message`, `sent_at` y `whatsapp_message_id`.
- **Lógica del Worker:** El bot actualiza estos campos automáticamente. Si hay un error, el motivo queda registrado para consulta externa.

### 4. Guía de Integración para Proyectos Externos
Para enviar mensajes desde otro proyecto y rastrear su estado:

#### Paso 1: Envío y Obtención del ID
**Opción A (Supabase Client):**
```javascript
const { data } = await supabase.from('outbox').insert({ phone: '58412...', content: '...' }).select('id').single();
const msgId = data.id;
```
**Opción B (SQL):**
```sql
INSERT INTO outbox (phone, content) VALUES ('58412...', '...') RETURNING id;
```

#### Paso 2: Seguimiento del Estado
```sql
SELECT status, error_message, sent_at FROM outbox WHERE id = 'ID_CAPTURADO';
```

### SQL Requerido para Actualización:
```sql
-- Ejecutar en el Editor SQL de Supabase
ALTER TABLE outbox ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS whatsapp_message_id text;

-- Añadir columna para número real en conversaciones
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS real_phone text;

-- Asegurar que los mensajes antiguos tengan un estado
UPDATE outbox SET status = 'sent' WHERE sent = true AND status = 'pending';

-- Switch Global de IA (Si no se aplicó antes)
ALTER TABLE connection_state ADD COLUMN IF NOT EXISTS global_ai_enabled BOOLEAN DEFAULT TRUE;
```

## [2026-07-23] Implementación de Switch Global de IA y Mejoras de Configuración
...
Se han realizado las siguientes correcciones y mejoras solicitadas:
...
