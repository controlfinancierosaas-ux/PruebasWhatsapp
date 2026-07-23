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
