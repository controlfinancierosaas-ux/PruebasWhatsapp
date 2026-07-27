# Pruebas WhatsApp Bot AI

Agente de WhatsApp con arquitectura distribuida (Next.js en Vercel, Supabase como DB, y Worker en Render).

## 🚀 Despliegue Rápido

### 1. Supabase Setup
Ejecuta el siguiente SQL en el **SQL Editor** de tu proyecto Supabase:

```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text,
  mode text CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  role text CHECK(role IN ('user','assistant','human')) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE connection_state (
  id int PRIMARY KEY CHECK (id = 1),
  status text NOT NULL DEFAULT 'disconnected',
  qr_string text,
  phone text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO connection_state (id, status) VALUES (1, 'disconnected') ON CONFLICT DO NOTHING;

CREATE TABLE outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  phone text NOT NULL,
  content text NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE baileys_auth (
  id text PRIMARY KEY,
  data jsonb NOT NULL
);
```

### 2. Variables de Entorno
Copia `.env.example` a `.env` (en local) o configúralas en Vercel/Render:

- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (requerido para el Worker).
- `OPENROUTER_API_KEY`: Tu API Key de OpenRouter.

### 3. Despliegue del Dashboard (Vercel)
Simplemente conecta este repositorio a Vercel.

### 4. Despliegue del Bot (Render)
1. Crea un nuevo **Web Service**.
2. **Build Command:** `npm install`
3. **Start Command:** `npm run start:bot`
4. Configura las variables de entorno mencionadas arriba.

## 🛠 Tecnologías
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4.
- **Bot:** Baileys 6.7.
- **AI:** OpenRouter (Gemini 2.0 Flash).
- **Base de Datos:** Supabase.

---

## 💬 Integración del Web Chat Widget

El proyecto ahora incluye un widget de chat web que puedes integrar en cualquier sitio.

### Opción 1: Dentro de este mismo proyecto (Next.js)
El widget ya está integrado globalmente en `src/app/layout.tsx`. Para usarlo en páginas específicas:
1. Importa el componente: `import WebChatWidget from "@/components/WebChatWidget";`
2. Renderízalo: `<WebChatWidget />`

### Opción 2: En una página web externa (HTML/JS)
Si quieres poner el chat en otro sitio web diferente, tienes dos formas:

#### A. Usando un iframe (La más sencilla)
Crea una página simple en este proyecto que solo renderice el widget y cárgala como iframe:
```html
<iframe 
  src="https://tu-url-de-vercel.app/web-chat-embed" 
  style="fixed; bottom: 0; right: 0; width: 400px; height: 600px; border: none; z-index: 9999;"
></iframe>
```

#### B. Consumiendo la API directamente
Si ya tienes tu propia interfaz de chat, simplemente envía un POST a:
`https://tu-url-de-vercel.app/api/web-chat`
Con el cuerpo:
```json
{
  "message": "Hola bot",
  "sessionId": "identificador_unico_del_usuario",
  "name": "Nombre opcional"
}
```
*Nota: Asegúrate de configurar los headers CORS en `next.config.ts` si vas a consumir la API desde un dominio diferente.*
