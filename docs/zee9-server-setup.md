# Zee9 — Server Setup & Deployment Guide

This document is the **single source of truth** for deploying Zee9 on a server. Games are configured separately; everything else follows the business rules below.

---

## Business rules (configured in seed + admin Settings)

| Rule | Value |
|------|-------|
| Registration bonus | Rs 150 (BONUS wallet, 5× wager) |
| Daily check-in bonus | Rs 5 (5× wager on bonus; deposit today if `dailyOpenNeedsDeposit` is on) |
| 1st / 2nd / 3rd deposit bonus | 10% / 7% / 5% |
| Daily deposit bonus (after 3rd) | 7% once per day |
| Deposit wager (withdraw gate) | 1× total approved deposits must be bet |
| Bonus wager | 5× bonus amount |
| Min / max deposit | Rs 300 – Rs 100,000 |
| Min / max withdraw | Rs 600 – Rs 50,000 |
| Deposit presets (Add Cash chips) | 300, 500, 1000, 2000, 4000, 5000, 10000, 20000, 50000 |
| Payment methods | JazzCash, Easypaisa, Bank, Wegars |
| First deposit | **Required** before any withdrawal |
| Commission | **Agents only**, on **player loss** (not deposit): L1 30%, L2 10%, L3 10% |
| Agentship | 5 valid members × Rs 1,000 min deposit each → agent activates + commission starts |
| Agent payout accounts | Max 3 JazzCash + 3 Easypaisa (admin must approve) |
| Lucky wheels | SPIN wheel + DEPOSIT wheel (1 ticket per Rs 1,000 approved deposits) |

---

## Architecture

| App | Folder | Dev port | Production URL example |
|-----|--------|----------|----------------------|
| Player | `src/` | 5174 | `https://play.zee9.bet` |
| Admin | `admin-panel/` | 5400 | `https://admin.zee9.bet` |
| C2C Agents | `c2c-panel/` | 5300 | `https://agent.zee9.bet` |
| API | `backend/` | 4000 | `https://api.zee9.bet` |

---

## Prerequisites (server)

- **Node.js** 20 LTS
- **PostgreSQL** 16
- **Redis** 7 (optional; reserved for future rate-limit/cache)
- **Nginx** or Caddy (reverse proxy + TLS)
- **PM2** or systemd (process manager)

---

## 1. Clone & install

```bash
git clone <your-repo-url> zee9
cd zee9

# Backend
cd backend
npm ci
cp .env.example .env
# Edit .env — see section 2

# Player app (repo root)
cd ..
npm ci

# Admin panel
cd admin-panel
npm ci

# C2C panel
cd ../c2c-panel
npm ci
```

---

## 2. Backend environment (`.env`)

```env
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1

# All front-end origins (comma-separated, no spaces)
CORS_ORIGINS=https://play.yourdomain.com,https://admin.yourdomain.com,https://agent.yourdomain.com

DATABASE_URL="postgresql://zee9:STRONG_PASSWORD@127.0.0.1:5432/zee9?schema=public"
REDIS_URL="redis://127.0.0.1:6379"

JWT_ACCESS_SECRET=<64+ random chars>
JWT_REFRESH_SECRET=<64+ random chars>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

UPLOAD_DIR=uploads
MAX_UPLOAD_MB=5
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 3. Database — Docker (recommended for first deploy)

```bash
cd backend
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` (user `zee9`, password `zee9pass`, db `zee9`). **Change passwords in production.**

---

## 4. Migrations & seed

### First-time setup

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Apply schema (includes WEGARS payment method)
npx prisma db push

# Or use migrations (production-friendly):
# npx prisma migrate dev --name init_zee9
# On server: npx prisma migrate deploy

# Seed users, settings, wheels, payment channels
npm run seed
```

### Re-apply Zee9 settings after code updates

```bash
cd backend
npm run seed
```

Seed **upserts** the `core` settings row with `DEFAULT_SETTINGS` from `src/core/settings.ts`.

### Seeded logins (change in production)

| Role | Phone | Password |
|------|-------|----------|
| Admin | `03000000000` | `admin123` |
| Agent | `03001111111` | `agent123` |
| Player | `03003333333` | `player123` |

---

## 5. Build & run backend

```bash
cd backend
npm run build
npm start
```

**Development:**

```bash
npm run dev
```

**Production with PM2:**

```bash
pm2 start dist/server.js --name zee9-api
pm2 save
```

Health check: `GET http://localhost:4000/api/v1/config` should return platform settings JSON.

---

## 6. Front-end builds

Each app needs `VITE_API_URL` pointing at your API.

### Player (`src/`)

```bash
# .env
VITE_API_URL=https://api.yourdomain.com/api/v1

npm run build
# Serve dist/ via Nginx
```

### Admin (`admin-panel/`)

```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
npm run build
```

### C2C (`c2c-panel/`)

```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
npm run build
```

---

## 7. Post-deploy admin checklist

Log in to **Admin** (`03000000000` / `admin123`) and configure:

1. **Settings**
   - Set `shareLink` → production player URL
   - Set `panelLink` → production C2C URL
   - Set `whatsapp` → your CS number (opens WhatsApp from player app)
   - Confirm commission 30/10/10%, agentship 5 × Rs 1000

2. **Payment Channels** (`/payment-channels`)
   - Add real JazzCash, Easypaisa, Bank, Wegars account numbers
   - Disable or delete seed placeholder accounts

3. **Deposits** — approve test deposit → verify player wallet + wheel ticket

4. **Agents** — approve agent payment accounts; pay out commission when needed

5. **Lucky Wheel** — verify SPIN + DEPOSIT wheel prizes (seeded: Laptop, Mobile, Bike, cash tiers, Try again)

---

## 8. Nginx example (API)

```nginx
server {
  listen 443 ssl http2;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  client_max_body_size 6M;
}
```

Repeat for each static front-end (`play.`, `admin.`, `agent.`).

---

## 9. Verify end-to-end flows

| # | Flow | Expected |
|---|------|----------|
| 1 | Register player | Rs 150 registration bonus in BONUS wallet |
| 2 | Daily check-in | Rs 5 bonus (needs deposit today if enabled) |
| 3 | Deposit Rs 1000 → admin approve | MAIN +10% bonus; 1 wheel ticket per Rs 1000 |
| 4 | Play Mines (lose) | Agent earns 30% of loss on L1 (if agent active) |
| 5 | Wager 1× deposits | Withdraw allowed after bets ≥ total deposits |
| 6 | Withdraw without 1st deposit | Blocked: "Complete your first deposit" |
| 7 | Agent adds 3 JazzCash accounts | 4th rejected |
| 8 | Spin + Deposit wheels | Both consume shared deposit tickets |

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Add exact front-end origin to `CORS_ORIGINS` |
| `P2034` transaction conflict | Normal under load; API retries automatically |
| Settings not updating | Run `npm run seed` or patch via Admin → Settings |
| Commission not accruing | Agent must be `agentActive`; player loss ≥ qualifying deposit; basis = GGR |
| Wheel no tickets | Need approved deposits ÷ `wheelDepositPerSpin` (default 1000) |

---

## 11. Schema changes (WEGARS)

`PaymentMethod` enum includes `WEGARS`. After pulling updates:

```bash
cd backend
npm run prisma:generate
npx prisma db push
npm run seed
```

For production with migration history:

```bash
npx prisma migrate dev --name add_wegars
git add prisma/migrations
# On server:
npx prisma migrate deploy
```

---

## 12. What is intentionally deferred

- **Game catalogue** (Piggy Bank, Wingo, Tiger, etc.) — add via Admin → Games when ready
- Each new game needs a **server-side engine** (like Mines) before going live in the lobby

---

## Quick reference commands

```bash
# Full backend reset (DEV ONLY — wipes data)
cd backend
npx prisma migrate reset

# Typecheck
npm run typecheck

# Ledger integrity
npx tsx scripts/ledgercheck.ts
```

---

*Last updated: Zee9 platform spec — games excluded, all business rules wired.*
