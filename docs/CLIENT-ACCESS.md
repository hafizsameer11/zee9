# Zee9 — Live Access Credentials

**Environment:** Production  
**Date:** 13 July 2026  
**Domain:** `roadmaster.pro`

---

## Live URLs

| App | URL |
|-----|-----|
| **Player App** | https://zee9.roadmaster.pro/ |
| **Admin Panel** | https://adminpanel.roadmaster.pro/ |
| **C2C Agent Panel** | https://c2c.roadmaster.pro/ |
| **Backend API** | https://backend.roadmaster.pro/ |
| API Health | https://backend.roadmaster.pro/health |
| API Base Path | `https://backend.roadmaster.pro/api/v1` |

---

## Login Credentials (seeded demo accounts)

> **Important:** Change these passwords after handover. These are demo accounts for testing only.

### Admin Panel
| Field | Value |
|-------|-------|
| URL | https://adminpanel.roadmaster.pro/ |
| Phone | `03000000000` |
| Password | `admin123` |
| Role | Super Admin |

### C2C Agent Panelimage.png
| Field | Value |
|-------|-------|
| URL | https://c2c.roadmaster.pro/ |
| Phone | `03001111111` |
| Password | `agent123` |
| Role | Active Agent (Adnan Ali) |

| Field | Value |
|-------|-------|
| Phone | `03002222222` |
| Password | `agent123` |
| Role | Agent (inactive — Bilal Ahmed) |

### Player App
| Field | Value |
|-------|-------|
| URL | https://zee9.roadmaster.pro/ |
| Phone | `03003333333` |
| Password | `player123` |
| Name | Player_289005 |

| Field | Value |
|-------|-------|
| Phone | `03004444444` |
| Password | `player123` |
| Name | Zee9_King |

---

## Quick Test Checklist

1. Open **Admin** → log in with `03000000000` / `admin123` → confirm Dashboard loads.
2. Open **Player** → log in with `03003333333` / `player123` → confirm lobby / wallet loads.
3. Open **C2C** → log in with `03001111111` / `agent123` → confirm Home / orders load.
4. In Admin → **Payment Channels** → replace seed JazzCash / Easypaisa / Bank / Wegars numbers with real accounts.
5. In Admin → **Settings** → set WhatsApp CS number, confirm share/panel links.

---

## Platform Rules (already configured)

| Rule | Value |
|------|-------|
| Registration bonus | Rs 150 (BONUS wallet, 5× wager) |
| Daily check-in | Rs 5 |
| 1st / 2nd / 3rd deposit bonus | 10% / 7% / 5% |
| Daily deposit bonus (after 3rd) | 7% once per day |
| Min / max deposit | Rs 300 – Rs 100,000 |
| Min / max withdraw | Rs 600 – Rs 50,000 |
| Deposit wager gate | 1× total approved deposits |
| First deposit required before withdraw | Yes |
| Agent commission (on player loss) | L1 30% · L2 10% · L3 10% |
| Agentship unlock | 5 members × Rs 1,000 min deposit each |
| Payment methods | JazzCash, Easypaisa, Bank, Wegars |
| Lucky wheels | SPIN + DEPOSIT (1 ticket per Rs 1,000 deposited) |

---

## Seed Payment Channels (replace with real accounts)

| Method | Account | Title |
|--------|---------|-------|
| JazzCash | `03714212331` | ABID KHAN |
| Easypaisa | `03366398894` | AMIR SOHAIL |
| Bank (Meezan) | `99480112801078` | ABID KHAN |
| Wegars | `WEGARS-001` | ZEE9 WEGARS |

---

## Support Notes

- All apps talk to the live API at `https://backend.roadmaster.pro/api/v1`.
- HTTPS is enabled on every subdomain (Let’s Encrypt).
- Demo logins above are enough for UAT. Ask your engineer for production password rotation before go-live marketing.

---

*Prepared for client handover — Zee9 platform on roadmaster.pro*
