import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente con service role para operaciones que requieren bypass de RLS (ej: worker)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole || supabaseKey);
