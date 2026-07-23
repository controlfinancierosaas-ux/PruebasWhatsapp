import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  // Clear auth data and reset connection state
  await supabaseAdmin.from('baileys_auth').delete().neq('id', 'keep-nothing');
  await supabaseAdmin.from('connection_state').update({ 
    status: 'disconnected', 
    qr_string: null, 
    phone: null 
  }).eq('id', 1);

  return NextResponse.json({ success: true });
}
