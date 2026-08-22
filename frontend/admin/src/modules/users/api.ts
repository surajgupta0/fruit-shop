import { api } from "@fruitshop/web-core";

export type UserRole = "customer" | "staff" | "admin";

export type ConsoleUser = {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: UserRole | string;
  is_active: boolean;
  permissions: string[];
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type UserListResponse = {
  items: ConsoleUser[];
  total: number;
  page: number;
  page_size: number;
};

export type RoleInfo = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
};

export type PermissionInfo = {
  id: string;
  code: string;
  description: string | null;
};

export type CreateUserInput = {
  phone: string;
  email: string;
  password: string;
  name: string;
  role: "staff" | "admin";
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  phone?: string;
};

/** Users + roles API — all console screens use this */
export const usersApi = {
  list(params?: {
    page?: number;
    page_size?: number;
    role?: string;
    is_active?: boolean;
    search?: string;
  }) {
    return api.get<UserListResponse>("/users", { params });
  },

  get(id: string) {
    return api.get<ConsoleUser>(`/users/${id}`);
  },

  create(body: CreateUserInput) {
    return api.post<ConsoleUser>("/users", body, { successToast: "User created" });
  },

  update(id: string, body: UpdateUserInput) {
    return api.patch<ConsoleUser>(`/users/${id}`, body, { successToast: "User updated" });
  },

  setRole(id: string, role: UserRole) {
    return api.patch<ConsoleUser>(
      `/users/${id}/role`,
      { role },
      { successToast: "Role updated" },
    );
  },

  setStatus(id: string, is_active: boolean) {
    return api.patch<ConsoleUser>(
      `/users/${id}/status`,
      { is_active },
      { successToast: is_active ? "User activated" : "User deactivated" },
    );
  },

  setPassword(id: string, password: string) {
    return api.patch<ConsoleUser>(
      `/users/${id}/password`,
      { password },
      { successToast: "Password updated" },
    );
  },

  listRoles() {
    return api.get<RoleInfo[]>("/roles");
  },

  listPermissions() {
    return api.get<PermissionInfo[]>("/roles/permissions");
  },
};
