import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text } = body;

    if (!to || !subject || !text) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const result = await sendEmail({ to, subject, text });

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ success: false, error: 'Error al enviar email' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[TestEmail] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error desconocido' }, { status: 500 });
  }
}
