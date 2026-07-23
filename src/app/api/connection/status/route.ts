import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('connection_state')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  if (!data) {
    return NextResponse.json({ status: 'disconnected', qr_string: null });
  }

  return NextResponse.json(data);
}
