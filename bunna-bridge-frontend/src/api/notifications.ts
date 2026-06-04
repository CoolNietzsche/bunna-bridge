import client from './client';

export interface NotificationItem {
  id: number;
  notification_type: 'lot_status' | 'sample_request' | 'eudr_alert';
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const response = await client.get('/v1/notifications/');
  return response.data;
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await client.get('/v1/notifications/unread-count/');
  return response.data;
};

export const markAllRead = async (): Promise<void> => {
  await client.post('/v1/notifications/read-all/');
};

export const markRead = async (id: number): Promise<void> => {
  await client.post(`/v1/notifications/${id}/read/`);
};
