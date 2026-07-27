import { supabaseAdmin } from './supabase';

/**
 * Flujo compartido de captura de datos (NAME -> EMAIL -> PHONE[opcional] -> DONE)
 * Usado tanto por el canal de WhatsApp (baileys/handler.ts) como por el Web Chat
 * (api/web-chat/route.ts) para garantizar el MISMO comportamiento y evitar
 * desincronización de estado entre canales.
 *
 * El teléfono es OPCIONAL: el usuario puede escribir "omitir" (o dejarlo vacío)
 * y el flujo se completa igualmente con nombre + email.
 */

export type CaptureStep = 'NAME' | 'EMAIL' | 'PHONE' | 'DONE';

export interface CaptureState {
  capture_step: CaptureStep | null;
  capture_name: string | null;
  capture_email: string | null;
  capture_phone: string | null;
}

export interface CaptureStepResult {
  reply: string;
  completed: boolean;
  capturedData?: { name: string; email: string; phone: string };
}

const PHONE_SKIP_WORDS = ['omitir', 'skip', 'no tengo', 'ninguno', 'ninguna', 'no', 'n/a', 'na'];

/**
 * Inicia (o reinicia) el flujo de captura para una conversación.
 * Verifica el resultado del UPDATE para detectar errores de esquema/constraint
 * (por ejemplo si el CHECK de `mode` en Supabase no incluye 'CAPTURING_DATA').
 */
export async function startCaptureFlow(conversationId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('conversations')
    .update({
      mode: 'CAPTURING_DATA',
      capture_step: 'NAME',
      capture_name: null,
      capture_email: null,
      capture_phone: null
    })
    .eq('id', conversationId);

  if (error) {
    console.error('[CaptureFlow] ERROR al iniciar captura (revisa el CHECK constraint de "mode" y las columnas capture_* en Supabase):', error.message);
    return false;
  }
  return true;
}

export async function getCaptureState(conversationId: string): Promise<CaptureState | null> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('capture_step, capture_name, capture_email, capture_phone')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('[CaptureFlow] ERROR al leer estado de captura:', error.message);
    return null;
  }
  return data as CaptureState;
}

/**
 * Procesa el mensaje del usuario según el paso actual, consultado siempre desde la BD.
 * Nunca se comunica con la IA durante este proceso.
 */
export async function processCaptureStep(
  conversationId: string,
  step: CaptureStep | null,
  userInput: string
): Promise<CaptureStepResult> {
  const input = (userInput || '').trim();

  // --- Paso NAME (o sin paso definido aún) ---
  if (step === 'NAME' || !step) {
    if (!input || input.length < 2) {
      return { reply: 'Por favor, indícame tu *nombre completo* para continuar.', completed: false };
    }

    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ capture_name: input, capture_step: 'EMAIL' })
      .eq('id', conversationId);

    if (error) {
      console.error('[CaptureFlow] ERROR guardando nombre:', error.message);
      return { reply: 'Tuve un problema guardando tu nombre. ¿Puedes repetirlo, por favor?', completed: false };
    }

    return {
      reply: `Gracias, ${input.split(' ')[0]}.\n\nAhora indícame tu *correo electrónico* para contactarte.`,
      completed: false
    };
  }

  // --- Paso EMAIL ---
  if (step === 'EMAIL') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      return {
        reply: 'El formato del correo no parece válido. Por favor, indícame un *correo electrónico* correcto (ej: nombre@correo.com).',
        completed: false
      };
    }

    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ capture_email: input, capture_step: 'PHONE' })
      .eq('id', conversationId);

    if (error) {
      console.error('[CaptureFlow] ERROR guardando email:', error.message);
      return { reply: 'Tuve un problema guardando tu correo. ¿Puedes repetirlo, por favor?', completed: false };
    }

    return {
      reply: 'Perfecto.\n\nPor último, indícame tu *número de teléfono* (opcional: puedes escribir *"omitir"* si prefieres no darlo).',
      completed: false
    };
  }

  // --- Paso PHONE (opcional) ---
  if (step === 'PHONE') {
    const skipped = !input || PHONE_SKIP_WORDS.includes(input.toLowerCase());
    const phoneValue = skipped ? null : input;

    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ capture_phone: phoneValue, capture_step: 'DONE', mode: 'HUMAN' })
      .eq('id', conversationId);

    if (error) {
      console.error('[CaptureFlow] ERROR guardando teléfono / cerrando captura:', error.message);
      return { reply: 'Tuve un problema guardando tu información. Un asesor revisará tu caso igualmente.', completed: false };
    }

    const finalState = await getCaptureState(conversationId);

    return {
      reply: '¡Listo! He registrado tu información.\n\nUn asesor humano se pondrá en contacto contigo a la brevedad.',
      completed: true,
      capturedData: {
        name: finalState?.capture_name || '',
        email: finalState?.capture_email || '',
        phone: phoneValue || 'No proporcionado'
      }
    };
  }

  // --- DONE o desconocido: forzar HUMAN por seguridad ---
  await supabaseAdmin.from('conversations').update({ mode: 'HUMAN' }).eq('id', conversationId);
  return { reply: '', completed: true };
}
