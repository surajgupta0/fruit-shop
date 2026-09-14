import { api } from "@fruitshop/web-core";

export type NotificationLog = {
  id: string;
  order_id: string | null;
  user_id: string | null;
  event: string;
  channel: string;
  recipient: string;
  status: string;
  subject: string | null;
  error: string | null;
  sent_at: string | null;
};

export type NotificationLogListResponse = {
  items: NotificationLog[];
  total: number;
  page: number;
  page_size: number;
};

export const notificationsApi = {
  listLogs(params?: { page?: number; page_size?: number; order_id?: string }) {
    return api.get<NotificationLogListResponse>("/notifications/admin/logs", { params });
  },
};
