import { api } from "@fruitshop/web-core";

export type CustomerProfile = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string;
  role: string;
  is_active: boolean;
  permissions: string[];
};

export const customerApi = {
  me() {
    return api.get<CustomerProfile>("/users/me", { toastOnError: false });
  },

  updateMe(body: { name?: string; email?: string }) {
    return api.patch<CustomerProfile>("/users/me", body, { successToast: "Profile updated" });
  },

  /** Prefer useAuth().logout() — this is for rare direct calls. */
  logout(body?: { refresh_token?: string; all_sessions?: boolean }) {
    return api.post<void>("/auth/logout", body ?? {}, {
      auth: Boolean(body?.all_sessions),
      toastOnError: false,
    });
  },
};
