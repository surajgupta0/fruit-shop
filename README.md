# Fruit Shop

A full-stack e-commerce platform for selling fresh fruit, built as a monorepo with three apps:

| App | Path | Tech | Default local URL |
| --- | --- | --- | --- |
| **API** (backend) | `services/api` | FastAPI, SQLAlchemy (async), Alembic, PostgreSQL | http://localhost:8000 |
| **Storefront** (customer site) | `frontend/storefront` | Next.js 16, React 19, Tailwind CSS 4 | http://localhost:3000 |
| **Admin console** (staff) | `frontend/admin` | Next.js 16, React 19, Tailwind CSS 4 | http://localhost:3001 |

```
               ┌────────────────────┐        ┌────────────────────┐
  Customers ──▶│ Storefront (Vercel)│        │  Admin (Vercel)    │◀── Staff
               └─────────┬──────────┘        └─────────┬──────────┘
                         │      HTTPS + JWT (Bearer)   │
                         └──────────────┬──────────────┘
                                        ▼
                             ┌────────────────────┐
                             │ FastAPI (Render /  │──▶ SMTP (email)
                             │ Docker)            │──▶ Twilio (SMS)
                             └─────────┬──────────┘
                                       ▼
                             ┌────────────────────┐
                             │ PostgreSQL (Neon / │
                             │ Aiven / any)       │
                             └────────────────────┘
```

---

## Table of contents

1. [Features](#1-features)
2. [Repository layout](#2-repository-layout)
3. [Prerequisites](#3-prerequisites)
4. [Run it locally](#4-run-it-locally)
5. [Environment variables](#5-environment-variables)
6. [Running tests](#6-running-tests)
7. [Deploy to production (step-by-step)](#7-deploy-to-production-step-by-step)
8. [Alternative: self-host everything on one VPS](#8-alternative-self-host-everything-on-one-vps)
9. [Database migrations](#9-database-migrations)
10. [Troubleshooting](#10-troubleshooting)
11. [Known limitations / before going live](#11-known-limitations--before-going-live)

---

## 1. Features

**Storefront (customers)**
- Home page with CMS-driven hero banners, featured products, categories
- Shop listing, category and tag pages, product detail with variants and reviews
- Passwordless sign-in / sign-up with OTP (phone via SMS, or email)
- Cart, coupons, checkout (Cash on Delivery or "Pay online" — currently a demo, see [section 11](#11-known-limitations--before-going-live))
- Account area: profile, saved addresses, order history and order detail, my reviews
- CMS pages (`/pages/[slug]`) such as About, Terms, Privacy

**Admin console (staff)**
- Email + password login, forgot / reset password
- Dashboard with order, catalog, inventory and notification stats
- Products (with variants), categories, brands, tags
- Inventory levels and low-stock view
- Orders: list, detail, status transitions (confirm → process → ship → deliver / cancel), refunds
- Coupons, product reviews moderation
- CMS: banners, pages, snippets
- Users and roles with fine-grained permissions (RBAC)
- Notification log (email / SMS sent to customers)

**API**
- REST API with OpenAPI docs at `/docs`
- JWT access tokens + rotating refresh tokens
- Alembic migrations that also seed roles, permissions, a demo catalog and a bootstrap admin

---

## 2. Repository layout

```
fruit-shop/
├── services/api/              FastAPI backend
│   ├── app/modules/           auth, users, catalog, cart, order, payment, inventory,
│   │                          coupon, review, cms, notification, delivery, search
│   ├── alembic/versions/      DB migrations (001 → 014)
│   ├── tests/                 pytest suite (runs on in-memory SQLite)
│   ├── Dockerfile             Production/dev image (build context = repo root)
│   └── docker-entrypoint.sh   Handles DB SSL CA setup, then runs the CMD
├── frontend/storefront/       Customer Next.js app
├── frontend/admin/            Staff Next.js app
├── packages/
│   ├── web-core/              Shared React code: API client, auth, toasts, hooks
│   ├── shared-lib-py/         Shared Python code: settings, DB engine, JWT deps
│   └── shared-contracts/      Script to generate TS types from the OpenAPI schema
├── infra/docker-compose.dev.yml   Runs the API in Docker for local dev
├── Makefile                   `make dev` / `make down`
├── .env.example               Backend env template (documented)
└── package.json               npm workspaces (web-core, admin, storefront)
```

---

## 3. Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 20 LTS or newer | Storefront + admin |
| npm | 10+ (ships with Node) | Workspaces install |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Recent | Local Postgres and API container |
| [Python](https://www.python.org/) | **3.12+** | Only if you run the API without Docker / run tests |
| [uv](https://docs.astral.sh/uv/) (optional) | Latest | Fast Python env manager (the repo has `uv.lock`) |
| Git | Any | — |

> Windows users: `make` is usually not installed. Every `make` command below has the plain `docker compose` equivalent next to it.

---

## 4. Run it locally

### 4.1 Clone and install JavaScript dependencies

```bash
git clone <your-repo-url> fruit-shop
cd fruit-shop
npm install
```

`npm install` at the root installs all three workspaces (`web-core`, `admin`, `storefront`).

### 4.2 Create your env files

```bash
# Backend (used by docker compose)
cp .env.example .env.dev

# Backend (only if you run the API without Docker)
cp .env.example services/api/.env

# Frontends
cp frontend/storefront/.env.example frontend/storefront/.env.local
cp frontend/admin/.env.example      frontend/admin/.env.local
```

On Windows PowerShell use `Copy-Item` instead of `cp` (same arguments).

Then edit `.env.dev`:
- set `DB_HOST=host.docker.internal` (the API container reaches Postgres on your machine)
- set `JWT_SECRET` to a random value: `python -c "import secrets; print(secrets.token_urlsafe(48))"`

### 4.3 Start PostgreSQL

The quickest way is a throwaway Docker container:

```bash
docker run -d --name fruitshop-db \
  -e POSTGRES_USER=fruitshop \
  -e POSTGRES_PASSWORD=fruitshop \
  -e POSTGRES_DB=fruitshop \
  -p 5432:5432 \
  -v fruitshop-pgdata:/var/lib/postgresql/data \
  postgres:16
```

PowerShell (one line):

```powershell
docker run -d --name fruitshop-db -e POSTGRES_USER=fruitshop -e POSTGRES_PASSWORD=fruitshop -e POSTGRES_DB=fruitshop -p 5432:5432 -v fruitshop-pgdata:/var/lib/postgresql/data postgres:16
```

Next time just run `docker start fruitshop-db`.

> Prefer a cloud DB? Put your Neon / Aiven connection details in `.env.dev` instead (see [section 5](#5-environment-variables)).

### 4.4 Start the API

**Option A — Docker (recommended)**

```bash
make dev
# or, without make:
docker compose -f infra/docker-compose.dev.yml --env-file .env.dev up --build
```

On start-up the container runs `alembic upgrade head` (creates tables + seed data) and then starts Uvicorn with hot-reload.

> Linux only: `host.docker.internal` is not defined by default. Either use your host IP for `DB_HOST`, or add `extra_hosts: ["host.docker.internal:host-gateway"]` under the `api` service in `infra/docker-compose.dev.yml`.

Stop it with `make down` (or `docker compose -f infra/docker-compose.dev.yml --env-file .env.dev down`).

**Option B — without Docker (Python 3.12+)**

```bash
cd services/api

# with uv
uv sync --extra dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# or with plain pip
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -e ../../packages/shared-lib-py -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Make sure `services/api/.env` has `DB_HOST=localhost`.

Check it works: open http://localhost:8000/health (should return `{"status":"ok"}`) and http://localhost:8000/docs for the interactive API docs.

### 4.5 Start the frontends

In two separate terminals from the repo root:

```bash
npm run dev:storefront   # http://localhost:3000
npm run dev:admin        # http://localhost:3001
```

### 4.6 Log in

| Where | Credentials |
| --- | --- |
| Admin console | `admin@fruitshop.example` / `Admin@12345` (seeded by migration `002`) |
| Storefront | Any phone number or email, OTP code `123456` (because `OTP_STATIC_CODE=123456`) |

When `OTP_STATIC_CODE` is empty and SMTP/Twilio are not configured, the OTP is printed in the API logs.

---

## 5. Environment variables

### 5.1 Backend (`.env.dev`, `services/api/.env`, or your hosting provider)

Every variable is documented inline in [`.env.example`](.env.example). The important ones:

| Variable | Required in prod | Description |
| --- | --- | --- |
| `ENVIRONMENT` | yes | `dev`, `staging` or `production` |
| `DATABASE_URL` | one of these | Full Postgres URL. Overrides `DB_*` when set |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | one of these | Individual DB params |
| `DB_SSLMODE` | yes | `disable` (local), `require` (Neon etc.), `verify-ca` (Aiven) |
| `DB_SSL_CA` / `DB_SSL_CA_PEM` | Aiven only | CA certificate path / contents for `verify-ca` |
| `JWT_SECRET` | **yes** | Long random string used to sign tokens |
| `OTP_STATIC_CODE` | **must be empty** | Fixed OTP for testing. If set in prod, anyone can log in as any customer |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_USE_TLS` | yes (for email) | Email delivery |
| `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | yes (for SMS) | `log` or `twilio` |
| `PASSWORD_RESET_URL_BASE` | yes | e.g. `https://admin.yourdomain.com/reset-password` |
| `CORS_ORIGINS` | **yes** | Comma-separated storefront + admin URLs |

### 5.2 Frontends (`frontend/*/.env.local` or Vercel)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public URL of the API, no trailing slash (e.g. `https://fruit-shop-api.onrender.com`) |

`NEXT_PUBLIC_*` variables are embedded **at build time** — after changing them you must redeploy.

---

## 6. Running tests

Backend tests use in-memory SQLite, so no database is needed:

```bash
cd services/api
uv run pytest            # or: pytest  (inside your activated venv)
```

Frontend lint:

```bash
npm run lint -w storefront
npm run lint -w admin
```

Production build check (catches type errors):

```bash
npm run build:storefront
npm run build:admin
```

---

## 7. Deploy to production (step-by-step)

This is the setup the repo is already prepared for:

| Piece | Service | Why |
| --- | --- | --- |
| Database | **[Neon](https://neon.tech)** (or Aiven / Supabase / Render Postgres) | Managed Postgres, free tier |
| API | **[Render](https://render.com)** Web Service (Docker) | Uses `services/api/Dockerfile` as-is |
| Storefront | **[Vercel](https://vercel.com)** | `frontend/storefront/vercel.json` is ready |
| Admin | **[Vercel](https://vercel.com)** (second project) | `frontend/admin/vercel.json` is ready |

Total time: about 30–45 minutes the first time. Do the steps **in order**, because each one needs a URL from the previous step.

### Step 0 — Push the code to a Git host

Render and Vercel both deploy from GitHub, GitLab or Bitbucket. Push this repository there first.

Double-check that no secrets are committed:

```bash
git status --ignored    # .env.dev, services/api/.env, frontend/*/.env.local must be listed as ignored
```

### Step 1 — Create the database (Neon)

1. Sign up at https://neon.tech and click **New Project**.
2. Name it `fruit-shop`, choose the region closest to your customers (and to the Render region you'll pick), Postgres 16.
3. Open **Connection Details**, pick the database `neondb` (or create one called `fruitshop`), and copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:XXXX@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep it for Step 2. You do **not** need to create tables — migrations run automatically when the API starts.

> **Using Aiven instead?** Copy host/port/user/password/db into the `DB_*` variables, set `DB_SSLMODE=verify-ca`, download the CA certificate from the Aiven console and either upload it to Render as a Secret File named `aiven-ca.pem` (mounted at `/etc/secrets/aiven-ca.pem`) or paste its contents into `DB_SSL_CA_PEM`.

### Step 2 — Deploy the API (Render)

1. Sign up at https://render.com and connect your Git provider.
2. Click **New → Web Service** and select the repository.
3. Fill in the form:

   | Field | Value |
   | --- | --- |
   | Name | `fruit-shop-api` |
   | Region | Same region as your database |
   | Branch | your production branch (e.g. `main`) |
   | Root Directory | *leave empty* (the Dockerfile needs the repo root as build context) |
   | Runtime / Language | **Docker** |
   | Dockerfile Path | `./services/api/Dockerfile` |
   | Docker Build Context Directory | `.` |
   | Instance type | Free works for testing; use a paid instance for real traffic (no cold starts, outbound SMTP allowed) |

4. Under **Advanced → Docker Command**, override the dev command (the Dockerfile's default runs Uvicorn with `--reload`, which is for development only):
   ```
   sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --proxy-headers --forwarded-allow-ips='*'"
   ```
5. Set **Health Check Path** to `/health`.
6. Add the environment variables (**Environment → Add Environment Variable**, or **Add from .env** and paste):

   ```env
   ENVIRONMENT=production
   DATABASE_URL=postgresql://neondb_owner:XXXX@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   DB_SSLMODE=require
   JWT_SECRET=<run: python -c "import secrets; print(secrets.token_urlsafe(48))">
   OTP_STATIC_CODE=
   SMS_PROVIDER=log
   SMTP_HOST=
   PASSWORD_RESET_URL_BASE=https://placeholder/reset-password
   CORS_ORIGINS=http://localhost:3000
   ```

   `CORS_ORIGINS` and `PASSWORD_RESET_URL_BASE` are placeholders for now; you'll fix them in Step 5 once you know the Vercel URLs. Email/SMS are configured in Step 7.

7. Click **Create Web Service**. Watch the logs; you should see:
   ```
   db_sslmode=require (encrypt only, no CA verify — ok for Neon)
   INFO  [alembic.runtime.migration] Running upgrade ... -> 014_cms
   Uvicorn running on http://0.0.0.0:10000
   ```
8. Copy the service URL (e.g. `https://fruit-shop-api.onrender.com`) and verify:
   - `https://fruit-shop-api.onrender.com/health` → `{"status":"ok","service":"fruit-shop-api"}`
   - `https://fruit-shop-api.onrender.com/docs` → Swagger UI

### Step 3 — Deploy the storefront (Vercel)

1. Sign up at https://vercel.com and connect your Git provider.
2. **Add New → Project**, import the repository.
3. Configure:

   | Field | Value |
   | --- | --- |
   | Project Name | `fruit-shop-storefront` |
   | Framework Preset | Next.js |
   | Root Directory | `frontend/storefront` |
   | Build / Install commands | leave default — `frontend/storefront/vercel.json` overrides them (`bash scripts/vercel-install.sh` installs the whole monorepo and the Linux native binaries for Tailwind/LightningCSS) |
   | Node.js Version (Settings → General) | 20.x or newer |

4. Make sure **Settings → General → Root Directory → "Include files outside the root directory in the Build Step"** is enabled (it is by default). The app imports `packages/web-core`, which lives outside `frontend/storefront`.
5. Add the environment variable (Production **and** Preview):
   ```
   NEXT_PUBLIC_API_URL=https://fruit-shop-api.onrender.com
   ```
6. Click **Deploy**. When finished, note the URL, e.g. `https://fruit-shop-storefront.vercel.app`.

### Step 4 — Deploy the admin console (Vercel)

Repeat Step 3 with a **second** Vercel project from the same repository:

| Field | Value |
| --- | --- |
| Project Name | `fruit-shop-admin` |
| Root Directory | `frontend/admin` |
| Env var | `NEXT_PUBLIC_API_URL=https://fruit-shop-api.onrender.com` |

Note the URL, e.g. `https://fruit-shop-admin.vercel.app`.

### Step 5 — Connect everything (CORS + reset link)

Back on Render → `fruit-shop-api` → **Environment**, update:

```env
CORS_ORIGINS=https://fruit-shop-storefront.vercel.app,https://fruit-shop-admin.vercel.app
PASSWORD_RESET_URL_BASE=https://fruit-shop-admin.vercel.app/reset-password
```

Rules for `CORS_ORIGINS`: exact scheme + host, comma-separated, **no trailing slash**, no spaces needed. Add your custom domains here too when you add them (Step 8). Save — Render redeploys automatically.

### Step 6 — Secure the admin account

The migrations seed a well-known admin (`admin@fruitshop.example` / `Admin@12345`). Lock it down immediately:

1. Log in to the admin console with those credentials.
2. Go to **Users → Create user**, create your own admin with your real email and a strong password, role `admin`.
3. Log out, log back in as your new admin.
4. Open the seeded `System Admin` user and **deactivate** it (or at minimum set a new strong password from the user page).

### Step 7 — Turn on real email and SMS

**Email (SMTP)** — used for email OTP, admin password reset and order notifications. Any SMTP provider works (Brevo, SendGrid, Mailgun, Amazon SES, Resend, Zoho, Gmail with an app password…). On Render:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<smtp login>
SMTP_PASSWORD=<smtp key>
SMTP_FROM=Fruit Shop <orders@yourdomain.com>
SMTP_USE_TLS=true
```

> Render's free instances may block outbound SMTP. If you see `smtp_network: Network is unreachable` in the logs, upgrade the instance or use a provider/port your plan allows. While SMTP fails, the API logs the email body instead so sign-in still works.

Verify your sending domain with the provider (SPF/DKIM records) so mail doesn't land in spam.

**SMS (Twilio)** — used for phone OTP and order SMS:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```

For Indian numbers, Twilio requires DLT registration of your sender ID and templates; plan for that before launch.

Finally make sure `OTP_STATIC_CODE` is **empty** in production.

### Step 8 — Custom domains (optional)

1. **Vercel** → each project → **Settings → Domains** → add `shop.yourdomain.com` and `admin.yourdomain.com`; create the DNS records Vercel shows.
2. **Render** → `fruit-shop-api` → **Settings → Custom Domains** → add `api.yourdomain.com`; create the CNAME Render shows.
3. Update:
   - Vercel (both projects): `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` → **Redeploy**
   - Render: `CORS_ORIGINS=https://shop.yourdomain.com,https://admin.yourdomain.com` and `PASSWORD_RESET_URL_BASE=https://admin.yourdomain.com/reset-password`

### Step 9 — Smoke test checklist

- [ ] `GET https://<api>/health` returns ok
- [ ] Storefront home page shows banners, categories and products (no CORS errors in the browser console)
- [ ] Sign up on the storefront with your phone/email and receive a real OTP
- [ ] Add to cart → apply a coupon → place a Cash on Delivery order
- [ ] The order appears in admin **Orders**; move it through Confirm → Processing → Shipped → Delivered
- [ ] Customer receives status notifications (check admin **Notifications** log)
- [ ] Admin **Forgot password** sends an email with a working reset link
- [ ] Create/edit a product and a banner in admin and see the change on the storefront
- [ ] Seeded admin account is deactivated, `OTP_STATIC_CODE` is empty

### Redeploying

- **Push to the production branch** → Render and Vercel redeploy automatically.
- New Alembic migrations run automatically on API start (`alembic upgrade head` is part of the start command).
- Changed a `NEXT_PUBLIC_*` variable? Trigger **Redeploy** in Vercel.

---

## 8. Alternative: self-host everything on one VPS

If you prefer a single server (DigitalOcean, Hetzner, AWS Lightsail, …) with Ubuntu + Docker:

1. Install Docker and Docker Compose, clone the repo, create `.env.dev`-style file (call it `.env.prod`) with production values (see Step 2 / Step 7 above).
2. Run Postgres (`postgres:16` container with a volume) or use a managed DB.
3. Build and run the API image without `--reload`:
   ```bash
   docker build -f services/api/Dockerfile -t fruit-shop-api .
   docker run -d --name fruit-shop-api --restart unless-stopped \
     --env-file .env.prod -p 127.0.0.1:8000:8000 fruit-shop-api \
     sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips='*'"
   ```
4. Build and run each Next.js app (Node 20+):
   ```bash
   npm ci
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build:storefront
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build:admin
   # run with a process manager such as pm2:
   npx pm2 start "npm run start -w storefront" --name storefront          # port 3000
   npx pm2 start "npm run start -w admin" --name admin                    # port 3001
   ```
5. Put **Nginx** or **Caddy** in front to terminate HTTPS and route `shop.` → 3000, `admin.` → 3001, `api.` → 8000. (Caddy gets Let's Encrypt certificates automatically.)
6. Back up the database regularly (`pg_dump`) and keep the server patched.

---

## 9. Database migrations

Migrations live in `services/api/alembic/versions/` and run automatically on API start.

```bash
cd services/api
alembic upgrade head                          # apply all
alembic downgrade -1                          # roll back one
alembic revision -m "add wishlist"            # new empty migration
alembic revision --autogenerate -m "..."      # generate from model changes (review the output!)
alembic history                               # list revisions
```

Notes:
- `002_rbac_users` seeds roles, permissions and the bootstrap admin.
- `006_seed_catalog` seeds a demo catalog (categories, brands, tags, products). Delete/replace that data from the admin console before launch.

---

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Browser console: `blocked by CORS policy` | Add the exact frontend origin to `CORS_ORIGINS` on the API (no trailing slash) and redeploy the API |
| Frontend still calls `localhost:8000` in production | `NEXT_PUBLIC_API_URL` was missing at build time. Set it in Vercel and **Redeploy** |
| `SSLCertVerificationError` / `unable to get local issuer certificate` | For Neon use `DB_SSLMODE=require` and leave `DB_SSL_CA` / `DB_SSL_CA_PEM` empty |
| `ERROR: DB_SSLMODE=verify-ca needs a CA file` | Upload the Aiven CA as a Render Secret File `aiven-ca.pem`, or set `DB_SSL_CA_PEM`, or switch to `require` |
| Local Docker API can't reach Postgres | Use `DB_HOST=host.docker.internal` in `.env.dev`, check `docker ps` shows `fruitshop-db`, and `DB_SSLMODE=disable` |
| `connection refused` on 5432 | Postgres container isn't running: `docker start fruitshop-db` |
| Vercel build: `Cannot find module 'lightningcss.linux-x64-gnu.node'` or oxide errors | Make sure `vercel.json` is being used (Root Directory must be `frontend/storefront` or `frontend/admin`) and the Tailwind/LightningCSS versions in `scripts/vercel-install.sh` match `package-lock.json` |
| Vercel build: `Module not found: @fruitshop/web-core` | Enable "Include files outside the root directory in the Build Step" |
| OTP never arrives | Check API logs — when SMTP/Twilio isn't configured or fails, the code is printed there. Check `SMS_PROVIDER` and Twilio credentials |
| `Invalid or expired token` right after deploy | `JWT_SECRET` changed; users must log in again (expected) |
| First request after idle takes ~50s | Render free tier sleeps. Use a paid instance |
| Admin login returns 403 "Password login is restricted to admin/staff" | That account is a customer. Change its role in **Users** |

---

## 11. Known limitations / before going live

These items are **not finished yet** and should be addressed before taking real customers:

**Must fix (security / money)**
1. **Online payment is a demo.** `POST /payments/order/{id}/confirm` lets the *customer* mark their own order as paid, and the checkout calls it automatically with `"demo-payment"`. Integrate a real gateway (Razorpay / Stripe / PayU / Cashfree): create the payment on the server, confirm it only from a **verified webhook or signature check**, and stop exposing `confirm` to customers. Until then, hide "Pay online" and only offer Cash on Delivery.
2. **`OTP_STATIC_CODE` is not blocked in production.** The code accepts it in any `ENVIRONMENT` (the `is_staging_like` helper in `app/core/config.py` exists but isn't used), and `infra/docker-compose.dev.yml` defaults it to `123456`. Enforce "only in dev/staging" in code.
3. **No OTP brute-force protection or rate limiting.** There's no limit on OTP requests per phone/email/IP or on wrong attempts, so a 6-digit code can be guessed and SMS costs can be abused. Add attempt counters + rate limiting (e.g. `slowapi` + Redis — `REDIS_URL` is already in settings but unused).
4. **`JWT_SECRET` falls back to `change-me-in-production`.** Fail fast on startup if it's the default when `ENVIRONMENT=production`.
5. **Seeded admin with a public password** (`Admin@12345`) — follow Step 6, or better, replace the seed with a one-off "create admin" script that reads credentials from env.
6. Tokens are stored in `localStorage` (readable by any XSS). Acceptable for an MVP; consider httpOnly cookies later.

**Missing features**
7. **No image upload.** Products, categories and banners take image URLs only. Add S3 / Cloudinary / Vercel Blob uploads in the admin. If you use `next/image` with new hosts, add them to `images.remotePatterns` in `frontend/storefront/next.config.ts` (only `images.unsplash.com` is allowed today).
8. **`delivery` and `search` modules are placeholders** (only `/health`). There are no delivery slots, pincode serviceability checks, delivery partner assignment, or a dedicated search endpoint.
9. **Shipping fee and free-shipping threshold are hard-coded** (`₹99`, free above `₹999`, currency `INR`) in `services/api/app/modules/order/pricing.py`. Move to settings / an admin "Store settings" page.
10. No invoices / GST tax invoice PDF, no wishlist, no order return/replacement flow, no analytics/sales reports beyond dashboard counts.
11. Storefront SEO: no `sitemap.ts`, `robots.ts`, or `error.tsx` / `loading.tsx` boundaries; the admin app has no `not-found` page.
12. Admin `README.md` and storefront `README.md` are still the create-next-app defaults.

**DevOps gaps**
13. No CI pipeline (tests + lint + build on every merge request). Add `.gitlab-ci.yml` / GitHub Actions.
14. No `.dockerignore` — the API image is built with the repo root as context, so `node_modules` and `.next` folders get sent to Docker. Add one excluding `**/node_modules`, `**/.next`, `.git`, `**/.venv`, `.env*`.
15. The API `Dockerfile` hard-codes dependency versions separately from `pyproject.toml` (they can drift), and its default `CMD` uses `--reload` (dev only — override it in production as shown in Step 2).
16. `make reset` is identical to `make down`; it doesn't drop data. Local compose has no Postgres service (use the `docker run` command in [4.3](#43-start-postgresql)).
17. No error monitoring (Sentry) or uptime monitoring, and no documented DB backup policy.
