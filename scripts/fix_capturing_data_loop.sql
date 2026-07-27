-- ============================================================================
-- FIX CRÍTICO: Bucle infinito en el flujo de captura de datos.
--
-- Causa raíz: la tabla `conversations` fue creada con:
--   mode text CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI'
-- Ese CHECK constraint NUNCA permitió el valor 'CAPTURING_DATA'. Cada vez que
-- el bot intentaba guardar mode = 'CAPTURING_DATA', Supabase rechazaba el
-- UPDATE, el estado nunca avanzaba en la base de datos, y el siguiente
-- mensaje del usuario volvía a caer en el mensaje inicial ("indícame tu
-- nombre completo"), generando el bucle reportado.
--
-- Ejecutar este script completo en el SQL Editor de Supabase.
-- ============================================================================

-- 1. Reemplazar el CHECK constraint para permitir 'CAPTURING_DATA'
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_mode_check;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_mode_check
  CHECK (mode IN ('AI', 'HUMAN', 'CAPTURING_DATA'));

-- 2. Asegurar columnas de captura paso a paso (por si no se aplicaron antes)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS capture_step text DEFAULT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS capture_name text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS capture_email text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS capture_phone text;

-- 3. Índices de apoyo
CREATE INDEX IF NOT EXISTS idx_conversations_capture_step
  ON conversations(capture_step) WHERE capture_step IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_mode_capture
  ON conversations(mode, capture_step) WHERE mode = 'CAPTURING_DATA';

-- Nota: la columna `metadata` que usaba antes el endpoint de Web Chat ya NO
-- se utiliza (se unificó con `capture_step/capture_name/capture_email/capture_phone`).
-- No es necesario crearla; si existía y quieres limpiarla puedes (opcional):
-- ALTER TABLE conversations DROP COLUMN IF EXISTS metadata;
