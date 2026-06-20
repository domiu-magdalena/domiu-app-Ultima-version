import { getBrowserClient } from '@/lib/db/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface NotificationData {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  description: string | null;
  image_url: string | null;
  action_url: string | null;
  order_id: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

async function getClient() {
  return getBrowserClient();
}

export const notificationService = {
  async getNotifications(userId: string, limit = 50): Promise<NotificationData[]> {
    const supabase = await getClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as NotificationData[]) ?? [];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const supabase = await getClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .is('deleted_at', null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async markAsRead(id: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.rpc('mark_notification_as_read', { p_notification_id: id });
    if (error) throw new Error(error.message);
  },

  async markAllAsRead(userId: string): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    if (error) throw new Error(error.message);
  },

  subscribe(userId: string, callback: (notification: NotificationData) => void) {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationData>) => {
          callback(payload.new as NotificationData);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
