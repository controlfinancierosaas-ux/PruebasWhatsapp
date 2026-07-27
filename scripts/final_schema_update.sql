-- Asegurar campos de administrador en bot_settings
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS admin_email text;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS admin_phone text;

-- Asegurar modo en conversaciones
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode text DEFAULT 'AI';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS real_phone text;

-- Índices recomendados para rendimiento
CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
