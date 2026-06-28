'use server';

import { z } from 'zod';
import { getServiceClient } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/server-auth';

const supportTicketSchema = z.object({
  ticket_type: z.string().min(1, 'Selecciona el tipo de problema'),
  subject: z.string().optional().default(''),
  description: z.string().min(5, 'Describe mejor el problema'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  order_id: z.string().uuid().optional().nullable(),
  business_id: z.string().uuid().optional().nullable(),
  courier_id: z.string().uuid().optional().nullable(),
  attachments: z.array(z.string()).optional().default([]),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

export async function createSupportTicketAction(input: SupportTicketInput) {
  const parsed = supportTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(', ') };
  }

  const auth = await requireAuth();
  if (auth.error) return { success: false, error: auth.error.message };

  const supabase = getServiceClient();
  const userId = auth.session.user.id;
  const payload = parsed.data;
  const now = new Date().toISOString();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      role: auth.session.profile.role,
      order_id: payload.order_id || null,
      business_id: payload.business_id || null,
      courier_id: payload.courier_id || (auth.session.profile.role === 'courier' ? userId : null),
      ticket_type: payload.ticket_type,
      priority: payload.priority,
      subject: payload.subject || 'Soporte DomiU',
      description: payload.description,
      status: 'open',
      attachments: payload.attachments || [],
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error || !ticket) {
    return { success: false, error: 'Error al crear soporte: ' + (error?.message || 'desconocido') };
  }

  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('status', 'active');

  if (admins && admins.length > 0) {
    await supabase.from('notifications').insert(
      admins.map((admin) => ({
        recipient_id: admin.id,
        sender_id: userId,
        notification_type: 'system_alert',
        title: 'Nuevo soporte recibido',
        message: payload.description.slice(0, 180),
        reference_id: ticket.id,
        reference_type: 'support_ticket',
        channels: ['in_app'],
        metadata: {
          ticket_id: ticket.id,
          ticket_type: payload.ticket_type,
          role: auth.session.profile.role,
          priority: payload.priority,
        },
      }))
    );
  }

  return { success: true, ticketId: ticket.id };
}
