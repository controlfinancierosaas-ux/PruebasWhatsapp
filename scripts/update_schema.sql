-- Tabla de configuración del bot
CREATE TABLE IF NOT EXISTS bot_settings (
  id integer PRIMARY KEY DEFAULT 1,
  tone text DEFAULT 'formal',
  vocabulary text,
  personality text DEFAULT 'resolutivo',
  short_responses boolean DEFAULT true,
  remote_info_link text,
  additional_info text,
  custom_prompt_override text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1)
);

INSERT INTO bot_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Añadir columna de real_phone si no existe (ya lo hicimos antes pero por seguridad)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS real_phone text;
