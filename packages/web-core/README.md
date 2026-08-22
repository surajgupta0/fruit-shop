# Frontend base (`@fruitshop/web-core`)

Shared package used by **admin** and **storefront**. Modules only call thin `*Api` wrappers — never raw `fetch`.

## What you get

| Piece | Use |
|-------|-----|
| `api.get/post/patch/delete` | HTTP + auth header + auto refresh + toasts |
| `AppProviders` | Wire once in `layout.tsx` |
| `useAuth` | user, login, logout, permissions |
| `useQuery` / `useMutation` | loading/error/data without repeating boilerplate |
| `toast.success/error` | Imperative notifications |
| `shouldAllowRequest` | Next.js middleware cookie guard |
| `tokenStore` | access/refresh tokens (+ cookie for middleware) |

## Module pattern

```ts
// src/modules/catalog/api.ts
import { api } from "@fruitshop/web-core";

export const catalogApi = {
  listProducts: (params?) => api.get("/catalog/admin/products", { params }),
  createProduct: (body) => api.post("/catalog/admin/products", body, { successToast: "Created" }),
};
```

```tsx
// page
const { data, isLoading } = useQuery(() => catalogApi.listProducts(), [], { enabled: !!user });
```

## Admin wiring

1. `AppProviders` in `app/layout.tsx`
2. `middleware.ts` protects routes via cookie
3. `/login` uses `useAuth().login`
4. `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Run

```bash
# from repo root
npm install
npm run dev:admin   # http://localhost:3001
```
