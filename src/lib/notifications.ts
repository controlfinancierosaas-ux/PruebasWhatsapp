import { WASocket } from '@whiskeysockets/baileys';
import { supabaseAdmin } from './supabase';
import { generateConversationSummary } from './openrouter';
import { sendEmail } from './email';

export async function notifyAdminHandoff(sock: WASocket | null, conversationId: string, userPhone: string) {
  try {
    console.log(`[Notification] Starting handoff notification for ${userPhone}...`);

    // 1. Get Admin Settings
    const { data: settings } = await supabaseAdmin
      .from('bot_settings')
      .select('admin_email, admin_phone')
      .eq('id', 1)
      .single();

    const adminEmail = settings?.admin_email;
    const adminPhone = settings?.admin_phone;

    // 2. Generate Summary
    const summary = await generateConversationSummary(conversationId);
    const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`;

    // 3. Send WhatsApp Alert to Admin (if configured)
    if (adminPhone) {
      const waMsg = `⚠️ *Alerta: Atención Humana Solicitada*\n\nEl cliente *+${userPhone}* solicita atención humana o el sistema detectó frustración.\n\n*Ver aquí:* ${dashboardLink}\n\n_Resumen IA:_\n${summary}`;

      if (sock) {
        // If we have a direct socket (from WhatsApp worker), send it directly
        const jid = adminPhone.includes('@s.whatsapp.net') ? adminPhone : `${adminPhone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: waMsg });
        console.log(`[Notification] WhatsApp sent directly to admin: ${adminPhone}`);
      } else {
        // If no socket (from API route), use outbox
        await supabaseAdmin.from('outbox').insert({
          phone: adminPhone.replace('@s.whatsapp.net', ''),
          content: waMsg,
          sent: false,
          status: 'pending'
        });
        console.log(`[Notification] WhatsApp alert queued in outbox for admin: ${adminPhone}`);
      }
    } else {
      console.warn('[Notification] No admin phone configured for WhatsApp alert.');
    }
...

    // 4. Send Email Alert (if configured)
    if (adminEmail) {
      const emailSubject = `⚠️ Alerta: Cliente solicita atención humana (+${userPhone})`;
      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #d9534f;">⚠️ Solicitud de Atención Humana</h2>
          <p>El cliente con número <strong>+${userPhone}</strong> ha sido transferido a modo humano.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #5bc0de; margin: 20px 0;">
            <h3 style="margin-top: 0;">Resumen de la Conversación</h3>
            <p style="white-space: pre-line;">${summary}</p>
          </div>
          
          <p>Puedes atender este chat directamente en el Dashboard:</p>
          <a href="${dashboardLink}" style="display: inline-block; background: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir al Dashboard</a>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">Este es un mensaje automático generado por tu Bot de WhatsApp.</p>
        </div>
      `;
      
      await sendEmail({
        to: adminEmail,
        subject: emailSubject,
        text: `Alerta: El cliente +${userPhone} solicita atención humana. Resumen: ${summary}. Ver en: ${dashboardLink}`,
        html: emailHtml
      });
      console.log(`[Notification] Email sent to admin: ${adminEmail}`);
    } else {
      console.warn('[Notification] No admin email configured for Email alert.');
    }

  } catch (error) {
    console.error('[Notification] Error in notifyAdminHandoff:', error);
  }
}
