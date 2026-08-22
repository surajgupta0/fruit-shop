import { api } from "@fruitshop/web-core";
import type { AuthUser, TokenPair } from "@fruitshop/web-core";

/** Auth module API — thin wrappers over the shared client */
export const authApi = {
  login(email: string, password: string) {
    return api.post<TokenPair>(
      "/auth/login",
      { email, password },
      { auth: false, successToast: "Signed in" },
    );
  },

  requestOtp(phone: string) {
    return api.post<void>("/auth/otp/request", { phone }, { auth: false, toastOnError: true });
  },

  verifyOtp(phone: string, code: string) {
    return api.post<TokenPair>(
      "/auth/otp/verify",
      { phone, code },
      { auth: false, successToast: "Verified" },
    );
  },

  refresh(refresh_token: string) {
    return api.post<TokenPair>(
      "/auth/refresh",
      { refresh_token },
      { auth: false, toastOnError: false },
    );
  },

  me() {
    return api.get<AuthUser>("/users/me");
  },
};
