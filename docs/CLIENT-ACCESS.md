# Zee9 — Live Access Credentials

**Environment:** Production  
**Date:** 22 July 2026  
**Domain:** `roadmaster.pro`

---

## Live URLs

| App | URL |
|-----|-----|
| **Player App** | https://zee9.roadmaster.pro/ |
| **Admin Panel** | https://adminpanel.roadmaster.pro/ |
| **C2C Merchant Panel** | https://c2c.roadmaster.pro/ |
| **Referral Agent Panel** | https://agent.roadmaster.pro/ *(point DNS, then Certbot)* |
| **Mentor Panel** | https://mentor.roadmaster.pro/ *(point DNS, then Certbot)* |
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

### C2C Merchant Panel
| Field | Value |
|-------|-------|
| URL | https://c2c.roadmaster.pro/ |
| Phone | `03001111111` |
| Password | `agent123` |
| Role | Active C2C merchant (Adnan Ali) |

| Field | Value |
|-------|-------|
| Phone | `03002222222` |
| Password | `agent123` |
| Role | C2C merchant (inactive — Bilal Ahmed) |

### Referral Agent Panel
| Field | Value |
|-------|-------|
| URL | https://agent.roadmaster.pro/ |
| Phone | `03005555555` |
| Password | `refagent123` |
| Role | Approved referral agent |

### Mentor Panel
| Field | Value |
|-------|-------|
| URL | https://mentor.roadmaster.pro/ |
| Phone | `03006666666` |
| Password | `mentor123` |
| Role | Mentor · channel `ch1` |

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

## Admin nav (product split)

| Nav | Meaning |
|-----|---------|
| **C2C** | Merchants — float, JazzCash/Easypaisa, collections |
| **Agents** | Referral salary program — approve agents, downline L3→L1 |
| **Channels & Mentors** | Create mentors + marketing channels |

---

## Quick Test Checklist

1. Open **Admin** → log in with `03000000000` / `admin123` → confirm **C2C** and **Agents** nav items.
2. Open **Player** → log in with `03003333333` / `player123`.
3. Open **C2C** → log in with `03001111111` / `agent123`.
4. After DNS: **Agent** panel → `03005555555` / `refagent123`.
5. After DNS: **Mentor** panel → `03006666666` / `mentor123`.
6. In Admin → **Payment Channels** → replace seed numbers with real accounts.
7. In Admin → **Settings** → set WhatsApp CS number, confirm share/panel links.

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
| Referral agent commission (on player loss) | L1 30% · L2 5% · L3 5% |
| Mentor commission (on player loss) | L1 30% · L2 10% · L3 10% |
| Win clawback | Same % deducted from COMMISSION salary |
| Agentship unlock | 5 members × Rs 1,000 min deposit each (admin approves) |
| Payment methods | JazzCash, Easypaisa, Bank, Wegars |
| Lucky wheels | SPIN + DEPOSIT (1 ticket per Rs 1,000 deposited) |

---

## DNS required (before HTTPS)

Point these A/AAAA records to this server (same IP as `c2c.roadmaster.pro`):

- `agent.roadmaster.pro`
- `mentor.roadmaster.pro`

Then run Certbot for each host. Nginx HTTP vhosts are already enabled.

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
- HTTPS is enabled on existing subdomains (Let’s Encrypt); agent/mentor need DNS + Certbot.
- Demo logins above are enough for UAT. Rotate passwords before go-live marketing.

---

*Prepared for client handover — Zee9 platform on roadmaster.pro*
