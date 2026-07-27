import { WASocket } from '@whiskeysockets/baileys';
import { supabaseAdmin } from './supabase';
import { generateConversationSummary } from './openrouter';
import { sendEmail } from './email';

export async function notifyAdminUnconfiguredLead(
  sock: WASocket | null,
  conversationId: string,
  userPhone: string,
  userName: string,
  userEmail: string,
  userPhoneContact: string
) {
  try {
    console.log(`[Notification] Notifying admin about unconfigured lead from ${userPhone}...`);

    const { data: settings } = await supabaseAdmin
      .from('bot_settings')
      .select('admin_email, admin_phone, bot_name, company_name')
      .eq('id', 1)
      .single();

    const adminEmail = settings?.admin_email;
    const adminPhone = settings?.admin_phone;
    const botName = settings?.bot_name || 'Bot de WhatsApp';
    const companyName = settings?.company_name || '';

    const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`;

    // Get conversation history
    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const historyText = history && history.length > 0
      ? history.map(m => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`).join('\n')
      : 'Sin historial.';

    // WhatsApp alert to admin
    if (adminPhone) {
      const waMsg = `🤖 *Lead - Bot No Configurado*

El cliente no pudo ser atendido porque el bot aún no está configurado. Se capturaron sus datos:

📛 *Nombre:* ${userName}
📧 *Email:* ${userEmail}
📱 *Teléfono:* ${userPhoneContact}
🔢 *WhatsApp:* +${userPhone}

*Ver aquí:* ${dashboardLink}

_Historial del chat:_
${historyText}`;

      if (sock) {
        const jid = adminPhone.includes('@s.whatsapp.net') ? adminPhone : `${adminPhone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: waMsg });
        console.log(`[Notification] WhatsApp sent to admin about unconfigured lead.`);
      } else {
        await supabaseAdmin.from('outbox').insert({
          phone: adminPhone.replace('@s.whatsapp.net', ''),
          content: waMsg,
          sent: false,
          status: 'pending'
        });
      }
    }

    // Email alert to admin
    if (adminEmail) {
      const emailSubject = `🤖 Lead - El bot no estaba configurado (+${userPhone})`;
      const emailHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #e67e22;">🤖 Lead - Bot No Configurado</h2>
          <p>Un cliente intentó contactar a <strong>${botName}</strong>${companyName ? ` (${companyName})` : ''} pero el bot aún no estaba configurado. Se capturaron sus datos para seguimiento manual.</p>
          
          <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #e67e22; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #e67e22;">Datos del Cliente</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 4px 0; font-weight: bold; width: 100px;">Nombre:</td><td style="padding: 4px 0;">${userName}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Email:</td><td style="padding: 4px 0;"><a href="mailto:${userEmail}">${userEmail}</a></td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Teléfono:</td><td style="padding: 4px 0;"><a href="tel:${userPhoneContact}">${userPhoneContact}</a></td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">WhatsApp:</td><td style="padding: 4px 0;">+${userPhone}</td></tr>
            </table>
          </div>
          
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #5bc0de; margin: 20px 0;">
            <h3 style="margin-top: 0;">Historial de la Conversación</h3>
            <pre style="white-space: pre-wrap; font-size: 13px; color: #555;">${historyText}</pre>
          </div>
          
          <p><strong>Acción requerida:</strong> Contactar al cliente manualmente para atender su consulta.</p>
          <a href="${dashboardLink}" style="display: inline-block; background: #e67e22; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir al Dashboard</a>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">Este es un mensaje automático de ${botName}.</p>
        </div>
      `;
      
      await sendEmail({
        to: adminEmail,
        subject: emailSubject,
        text: `Lead - Bot No Configurado. Cliente: ${userName} | Email: ${userEmail} | Teléfono: ${userPhoneContact} | WhatsApp: +${userPhone}. Ver: ${dashboardLink}`,
        html: emailHtml
      });
      console.log(`[Notification] Email sent to admin about unconfigured lead.`);
    }

  } catch (error) {
    console.error('[Notification] Error in notifyAdminUnconfiguredLead:', error);
  }
}

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
