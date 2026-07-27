# Seguimiento del Proyecto PruebasWhatsapp

## [2026-07-27] Corrección: Flujo de captura de datos paso a paso ante fallas del Bot
- Se implementó un sistema de estado (`CAPTURING_DATA`) en la API para manejar la captura de datos del usuario de forma secuencial (Nombre -> Email -> Teléfono) cuando el bot falla o no está configurado.
- El bot ahora solicita un dato a la vez y espera la respuesta del usuario, evitando el bucle de mensajes de error.
- Una vez capturados todos los datos, el sistema actualiza la conversación a modo `HUMAN` y dispara el flujo de notificación (`notifyAdminHandoff`) incluyendo los datos capturados en el resumen.
- Se mantiene el modo `AI` mientras se capturan los datos para permitir la interacción del usuario.


### 1. Detección Inteligente de Hand-off
- **Activación por Intención:** Se implementó un detector de intención (`detectHandoffIntent`) usando OpenRouter que identifica cuando un usuario solicita explícitamente hablar con un humano o cuando expresa frustración/enojo significativo.
- **Detección Automática:** El bot ahora analiza el sentimiento del mensaje y, si detecta malestar, realiza la transferencia automáticamente para mejorar la satisfacción del cliente.

### 2. Notificaciones Multi-canal (WhatsApp + Email)
- **Alertas en Tiempo Real:** Cuando una conversación pasa a modo humano, el sistema envía notificaciones inmediatas al administrador.
- **WhatsApp Admin:** Envío de alerta al número configurado con un link directo al dashboard y un resumen de la situación.
- **Email (Gmail SMTP):** Envío de un correo electrónico formal usando las variables `SMTP_USER` y `SMTP_PASS`.
- **Resúmenes con IA:** Antes de notificar, el bot genera un **resumen ejecutivo** de la conversación previa usando OpenRouter, permitiendo al humano entender el contexto sin leer todo el historial.

### 3. Gestión de Modo Humano (Dashboard)
- **Trazabilidad Visual:** La lista de conversaciones ahora resalta en naranja y con borde distintivo los chats que están en modo humano.
- **Control Total:** Se añadió un botón prominente de **"Re-activar Bot"** en el panel de chat para que el operador pueda devolver el control a la IA una vez finalizada la atención manual.
- **Silencio Inteligente:** Mientras un chat está en modo humano, el bot ignora los mensajes entrantes del usuario, permitiendo una conversación fluida con el asesor.

### 4. Flujo de Error y Captura de Datos
- **Manejo de Fallos:** Si el bot tiene errores técnicos o no está configurado, ahora se disculpa formalmente y solicita proactivamente al usuario su **Nombre, Email y Teléfono**.
- **Escalación Forzada:** Tras solicitar los datos, el chat se marca automáticamente como humano para asegurar que la solicitud no se pierda.

### SQL Requerido para Actualización:
```sql
-- Asegurar campos de administrador en bot_settings
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS admin_email text;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS admin_phone text;

-- Asegurar modo en conversaciones
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode text DEFAULT 'AI';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS real_phone text;

-- Índices recomendados para rendimiento
CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
```

---

## [2026-07-27] Implementación de Web Chat Widget e Integración Híbrida

### 1. Web Chat Widget (Floating UI)
- **Nueva Funcionalidad:** Se implementó un widget de chat web (`WebChatWidget.tsx`) que permite a los usuarios interactuar con el bot directamente desde la página web, sin necesidad de WhatsApp.
- **UI/UX:** El widget flota en la esquina inferior derecha, tiene animaciones suaves, indicador de "Escribiendo..." y mantiene el historial de la sesión localmente.
- **Integración Global:** Se añadió al `RootLayout` para que esté disponible en toda la aplicación (o donde se incluya el layout).

### 2. Backend API para Web Chat
- **Ruta:** `src/app/api/web-chat/route.ts`.
- **Lógica:** Recibe mensajes del widget web, identifica al usuario mediante un `sessionId` (prefijo `web:`), y utiliza la misma lógica de IA (`generateAIResponse`) que el bot de WhatsApp.
- **Trazabilidad:** Las conversaciones web se guardan en la misma tabla `conversations` de Supabase, lo que permite gestionarlas y verlas desde el mismo dashboard que las de WhatsApp.

### 3. Arquitectura Híbrida (WhatsApp + Web)
- **Identificadores:** Se utiliza el campo `phone` como identificador universal. Los usuarios de WhatsApp usan su JID/Número, y los de la web usan `web:session_id`.
- **Reutilización de Cerebro:** El bot utiliza el mismo "System Prompt" y personalidad configurada en el dashboard tanto para WhatsApp como para la Web, garantizando consistencia en las respuestas.

### 4. Factibilidad Técnica y Configuración
- **Estado:** Implementado y funcional.
- **Pasos para integrar en otros sitios:**
  1. Copiar el componente `WebChatWidget.tsx`.
  2. Asegurarse de tener el endpoint `/api/web-chat` configurado.
  3. El widget manejará automáticamente la creación de la sesión y la comunicación.

---

## [2026-07-26] Corrección de Bucle de Conexión, Resolución de Contactos y Personalización Avanzada

### 1. Solución al Bucle de Conexión (UI)
- **Problema:** El sistema bloqueaba todo acceso al dashboard si no había una conexión activa de WhatsApp.
- **Corrección:** `ConnectionGate` ahora es un proveedor de contexto. El dashboard es siempre accesible.
- **Nueva Lógica:** El QR se muestra integrado en el panel central cuando el bot está desconectado. Se añadió un indicador de estado en tiempo real (Punto Verde/Ámbar/Rojo) en la cabecera.

### 2. Resolución de Contactos (ID Técnico vs Número Real)
- **Problema:** WhatsApp usa identificadores internos (LIDs) largos (ej: `458273...`) para cuentas multidispositivo, lo que oculta el número real del usuario.
- **Solución:** Se implementó una función de resolución en `handler.ts`. Al recibir un mensaje, el bot intenta mapear el LID al número de teléfono real (`jid`) consultando los metadatos de WhatsApp.
- **Visualización:** El Dashboard ahora muestra el número real como primario y el ID técnico entre paréntesis para trazabilidad.

### 3. Personalización y Lavado de Cerebro (Reiniciar Bot)
- **Motor de Configuración:** Implementado un sistema de caché en RAM con **Supabase Realtime**. El bot reacciona a cambios de personalidad al instante sin reiniciar.
- **Edición de Prompt:** El usuario ahora puede revisar y **editar manualmente el prompt final** antes de guardarlo.
- **Función de Reset:** Se añadió el botón **"Reiniciar Bot (Limpiar)"**. Esto realiza un "lavado de cerebro" borrando todas las instrucciones.
- **Comportamiento Neutro:** Si el bot está limpio (sin instrucciones), detecta el estado neutro y **se mantiene en silencio**, no respondiendo a ningún mensaje hasta ser configurado nuevamente.

### 4. Mejora en la Tabla `outbox` (Trazabilidad)
- **Nuevos Campos:** Se añadieron columnas `status`, `error_message`, `sent_at` y `whatsapp_message_id`.
- **Lógica del Worker:** El bot actualiza estos campos automáticamente. Si hay un error, el motivo queda registrado para consulta externa.

### 5. Manejo de Errores Transparente y Fallbacks Corteses
- **Problema:** Errores técnicos (como falta de API Key o bot sin configurar) se mostraban al usuario o causaban silencio absoluto.
- **Solución:** Implementado un sistema de "Manejo de Errores Transparente".
- **Comportamiento:**
  - **Bot Limpio/Neutral:** Si no hay un prompt configurado, el bot (tanto en Web como WhatsApp) responde cortésmente indicando que está en mantenimiento e invita al usuario a dejar sus datos de contacto para ser atendido por un humano.
  - **Fallas Técnicas:** Si la IA falla al generar una respuesta, el sistema captura el error internamente y responde con un mensaje amable, evitando mostrar códigos de error técnicos al usuario final.
- **Trazabilidad:** Todos los errores se siguen registrando en los logs del servidor para diagnóstico, pero la experiencia del usuario se mantiene profesional.

### SQL Requerido para Actualización:
```sql
-- Ejecutar en el Editor SQL de Supabase
ALTER TABLE outbox ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS whatsapp_message_id text;

-- Añadir columnas para personalización y número real
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS real_phone text;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS custom_prompt_override text;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS remote_info_link text;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS additional_info text;

-- Asegurar que los mensajes antiguos tengan un estado
UPDATE outbox SET status = 'sent' WHERE sent = true AND status = 'pending';

-- Switch Global de IA (Si no se aplicó antes)
ALTER TABLE connection_state ADD COLUMN IF NOT EXISTS global_ai_enabled BOOLEAN DEFAULT TRUE;
```

## [2026-07-23] Implementación de Switch Global de IA y Mejoras de Configuración
...
Se han realizado las siguientes correcciones y mejoras solicitadas:
...
