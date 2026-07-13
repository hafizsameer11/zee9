# Zee9 Backend

Node.js + TypeScript + **Express** + **Prisma** + **PostgreSQL** + Redis.

**Production deployment:** see [`../docs/zee9-server-setup.md`](../docs/zee9-server-setup.md) — migrations, seed, env, and admin checklist.

## Quick start (local)

```bash
cd backend
cp .env.example .env                 # dev defaults already work
docker compose up -d                 # Postgres + Redis
npm install
npm run prisma:push                  # create tables
npm run seed                         # demo data + accounts
npm run dev                          # http://localhost:4000/api/v1
```

Health check: `GET http://localhost:4000/health`

## Seeded logins

| Role   | Phone         | Password   |
|--------|---------------|------------|
| Admin  | `03000000000` | `admin123` |
| Agent  | `03001111111` | `agent123` |
| Player | `03003333333` | `player123`|

## Architecture

- **Layered Express**: `route → validate(zod) → authenticate → authorize(role) → controller → service → prisma`.
- **Money-safety**: BIGINT paisa (no floats); the double-entry `LedgerService` (`src/core/ledger.ts`) is the only code that moves money; balance mutations run at `SERIALIZABLE` isolation with retry (`src/core/tx.ts`); idempotency keys on every money op; wallet buckets `MAIN / BONUS / FROZEN / COMMISSION` + system accounts.
- **Admin-controlled config** in `src/core/settings.ts` (commission basis/rates, bonuses, limits, wager, methods, agentship rule).
- Verify ledger integrity anytime: `npx tsx scripts/ledgercheck.ts` (asserts all balances sum to 0, no drift, all txns balanced).

## API map (`/api/v1`)

- **Auth** `POST /auth/{register,login,refresh,logout,change-password}`
- **Player** `GET /me`, `GET /me/wallet`, `GET /me/wallet/transactions`, `GET /config`, `GET /games`, `GET /payment-channels`, `POST /uploads`, `POST|GET /deposits`, `POST|GET /withdrawals`, `GET /referrals`, `GET /bonuses` + `POST /bonuses/daily-open/claim`, `GET /wheel` + `POST /wheel/spin`
- **Agent** `GET /agent/summary`, `GET|POST|DELETE /agent/accounts`, `GET /agent/orders` + accept/resolve, `GET /agent/commission`
- **Admin** `GET /admin/dashboard`; `users` (paginated + search + **360° detail** `GET /admin/users/:id`, status/role/**scopes**), `agents` (list/activate), `payment-channels` (CRUD), `deposits` (approve/reject), `withdrawals` (pay/reject), `settings` (get/**validated** patch), `games`/`cashback`/`offers`/`wheel` (**full CRUD**), `audit` (paginated), `POST /admin/wallet/adjust`
  - **Reports** `GET /admin/reports/{financial,revenue-series,top-games,top-agents}`
  - **Commissions** `GET /admin/commissions`, `POST /admin/commissions/:id/pay`, `POST /admin/commissions/payout` (COMMISSION → MAIN)
  - **Bonuses** `GET /admin/bonuses`, `POST /admin/bonuses/grant`, `POST /admin/bonuses/:id/revoke`
  - **Ledger** `GET /admin/ledger/entries` (explorer), `GET /admin/ledger/reconciliation` (integrity report)
  - **Sub-admin scopes**: `finance | users | config | reports | commission` — empty scopes = super admin; enforced by `requireScope`.

## Notes / next

- Auth uses **bcryptjs** for portability; switch to argon2id in production.
- Commission/bonus accrual runs **inline** in the approval transaction (atomic). Move to a **BullMQ worker** when volume grows (Redis already provisioned).
- Real payment gateway = later adapter behind the same deposit/withdrawal state machine.
- Wager gating is enforced by bucket separation (withdrawals draw only from `MAIN`); full wager-progress tracking activates with the game engine.
