# Zee9 Platform Fix Report

Date: 2026-07-26  
Site: https://zee9.roadmaster.pro  
Admin: https://adminpanel.roadmaster.pro  

## Summary

Separate realtime backends for every developed game, platform wallet/mail push without refresh, lobby dead-end fixes, admin force/ops UI, and in-game control fixes are live.

---

## Phase 0 — Platform realtime (balance / home)

| Area | Issue | Fix | Status | Verify |
|------|-------|-----|--------|--------|
| Wallet push | Only deposit approve pushed MAIN/BONUS | `runMoneyTx` + ledger ALS flushes `pushPlayerWallet` after every MAIN/BONUS post | Fixed | Bet/cashout/withdraw/bonus → header updates without refresh |
| Notifications | Mail lagged up to 20s | `notify()` pushes `notification.created` on `/me/ws` | Fixed | Admin reject withdraw → mail badge updates live |
| Withdraw status | No player WS | `withdraw.updated` queued + client `zee9:withdraw` | Fixed | Withdraw list refreshes on status change |
| Polling | 15s wallet / 20s mail | WS primary; poll backup 60s | Fixed | Open two tabs; change balance in one |

Key files: `backend/src/core/tx.ts`, `walletPush.ts`, `ledger.ts`, `notify.ts`, `src/api/walletRealtime.ts`, `WalletContext.tsx`, `src/api/hooks.ts`

---

## Phase 1 — Lobby / home screens

| Area | Issue | Fix | Status | Verify |
|------|-------|-----|--------|--------|
| News / Support | Modals never opened | Header News + Support buttons | Fixed | Lobby header icons |
| Grab Bonus | No entry | Bottom bar Grab + daily claim API | Fixed | Bottom → Grab Bonus |
| Engagement strip | Unmounted | Remounted on lobby category | Fixed | Lobby above game grid |
| Profile bank | No-op | Opens BindWithdrawModal | Fixed | Profile → Bank Details |
| Mail items | Not clickable | Expand + Open related | Fixed | Mail → expand → related |
| Settings | Language/Repair/Tutorial dead | Toast / cache repair reload / clear tutorial keys | Fixed | Settings |
| Support contacts | Dead socials + fake ID | WhatsApp + Live Chat via config; real player ID | Fixed | Support screen |
| Refer Rules | No-op | Opens ReferGuideModal | Fixed | Refer → Rules |
| Promo CLAIM | Looked like claim API | Renamed Deposit to unlock | Fixed | Lobby promo |
| Simple deposit | Dead channel | Removed; C2C only | Fixed | Add Cash |
| Wheel My Prize | No-op | `GET /wheel/history` + panel | Fixed | Wheel → My Prize |

---

## Phase 2 — Admin ops

| Game | Control | Status | Verify |
|------|---------|--------|--------|
| WinGo Lottery | Force 0–9 (existing) | Fixed | Admin → Games |
| Roulette | Force 0–36 | Fixed | Admin → Roulette ops |
| WinGo | Force by mode | Fixed | Admin → WinGo ops |
| Aviator / Crash / AeroX / Double Crash | Force next multiplier | Fixed | Admin → Crash ops panels |
| All seeded games | Enable + winPct | Fixed | Admin games table |

---

## Phase 3 — Separate game backends

| Game | Backend | Realtime | Status | Verify |
|------|---------|----------|--------|--------|
| aero-x | Own crash-family service | WS `/games/aero-x/ws` | Fixed | Login → play AeroX; balance settles |
| double-crash | Own crash-family service | WS `/games/double-crash/ws` | Fixed | Login → Double Crash |
| crash / aviator | Existing (hardened force) | WS | Fixed | Already live |
| dragon-tiger | Own DT service | WS `/games/dragon-tiger/ws` | Fixed | Login → DT bets |
| 7up-down | Own dice service | WS `/games/7up-down/ws` | Fixed | Login → 7 Up Down |
| chicken-road | HTTP start/step/cashout | — | Fixed | Login → Chicken Road |
| money-coming, fortune-gems-2, bounty-trail, wild-bounty | HTTP spin + ledger | — | Fixed | Login → spin |
| mines / wingo / wingo-lottery / roulette | Existing | Existing | Fixed | Unchanged |

Logged-out `/preview/:id` still uses local demo RNG. Logged-in `/play/:id` uses server.

Smoke-tested APIs (2026-07-26): aero-x/state, double-crash/state, dragon-tiger/state, 7up-down/state, chicken-road/start, fortune-gems-2/spin — OK.

---

## Phase 4 — In-game UI controls

| Game | Issue | Fix | Status |
|------|-------|-----|--------|
| Aviator / Crash / Mines / 7up-down / Wingo Lottery | ADD / Menu dead | Wired Add Cash + menu (exit/close) | Fixed |
| Crash / Lottery | Fake history/social buttons | Demoted to non-buttons | Fixed |
| Double Crash | ADD no-op | Opens Add Cash | Fixed |
| AeroX | History icon fake | Demoted non-interactive | Fixed |
| Roulette | Settings “coming soon” | Sound on/off panel | Fixed |
| Chicken Road | Menu only closed | History / Responsible / Fairness → How to play | Fixed |
| Others | Mute/help/bet already wired | — | OK |

All game headers use `useWallet()` so platform realtime balance applies in-game.

---

## Out of scope (deferred)

| Item | Reason |
|------|--------|
| Undeveloped catalog (teen-patti, fishing, mahjong, …) | Still ComingSoon |
| Simple deposit gateway | No merchant gateway; C2C only |
| Register cashback claim API | Promo is deposit CTA until product API exists |
| Telegram/Facebook support | No config URLs |

---

## Deploy notes

- API: `pm2 restart zee9-api` (script `/var/www/zee9/backend/dist/src/server.js`)
- Player: `npm run build` → `/var/www/zee9/dist`
- Admin: `admin-panel/npm run build` → `/var/www/zee9/admin-panel/dist`
- Seed: `cd backend && npx prisma db seed`
