import type { PaymentMethod, BonusType, Role } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post, getBalances } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { toPaisa, applyPct, toRupees } from '../../lib/money.js'
import { badRequest, conflict, notFound, unprocessable } from '../../core/errors.js'
import { accrueForDeposit, updateAgentship } from '../commission/commission.service.js'
import { notify } from '../../core/notify.js'
import { releaseIfNoWager, getEffectiveWager } from '../../core/wager.js'
import { pushDepositToMerchant } from '../agents/agent.realtime.js'
import { pushPlayerWallet } from '../wallet/player.realtime.js'

function methodEnabled(s: Awaited<ReturnType<typeof getSettings>>, method: PaymentMethod) {
  if (method === 'JAZZCASH') return s.methodJazzcash
  if (method === 'EASYPAISA') return s.methodEasypaisa
  if (method === 'WEGARS') return s.methodWegars
  return s.methodBank
}

function orderNo(prefix = 'P') {
  const d = new Date()
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  const ts =
    `${pad(d.getFullYear() % 100)}` +
    `${pad(d.getMonth() + 1)}` +
    `${pad(d.getDate())}` +
    `${pad(d.getHours())}` +
    `${pad(d.getMinutes())}` +
    `${pad(d.getSeconds())}`
  const rand = String(Math.floor(Math.random() * 1e9)).padStart(9, '0')
  return `${prefix}${ts}${rand}`
}

const PAY_WINDOW_MS = 5 * 60 * 1000
/** After player submits TID, merchant must confirm within this window or order auto-completes. */
export const MERCHANT_CONFIRM_MS = 60 * 60 * 1000
export { PAY_WINDOW_MS }

type AgentAcc = {
  id: string
  number: string
  holder: string
  method: PaymentMethod
  userId: string
  user: { id: string; role: Role; agentActive: boolean; orderSharePct: number }
}

/**
 * Pick a live merchant account.
 * Relative `orderSharePct` on each merchant biases how often they receive collections
 * (e.g. 30 / 50 / 70 → normalized weights). Still avoids reusing the same number for
 * the same player when alternatives exist.
 */
async function pickRotatedAgentAccount(method: PaymentMethod, playerId: string): Promise<AgentAcc | null> {
  const candidates = await prisma.agentAccount.findMany({
    where: {
      method,
      enabled: true,
      awaitingReview: false,
      user: { role: 'AGENT', agentActive: true, status: 'ACTIVE' },
    },
    include: { user: { select: { id: true, role: true, agentActive: true, orderSharePct: true } } },
  })
  if (!candidates.length) return null

  const recent = await prisma.deposit.findMany({
    where: {
      userId: playerId,
      method,
      agentAccountId: { not: null },
      createdAt: { gte: new Date(Date.now() - 24 * 3600_000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { agentAccountId: true, createdAt: true },
  })
  const recentIds = new Set(recent.map((r) => r.agentAccountId).filter(Boolean) as string[])
  const lastId = recent[0]?.agentAccountId ?? null

  // Prefer accounts that aren't the player's last / recent when alternatives exist
  let pool = candidates.filter((c) => c.id !== lastId)
  if (!pool.length) pool = candidates
  const fresh = pool.filter((c) => !recentIds.has(c.id))
  if (fresh.length) pool = fresh

  // Weight by merchant orderSharePct (0 = never pick unless only option)
  const weights = pool.map((c) => Math.max(0, c.user.orderSharePct ?? 100))
  const total = weights.reduce((s, w) => s + w, 0)
  if (total <= 0) {
    // All zero — fall back to equal chance among pool
    return pool[Math.floor(Math.random() * pool.length)]!
  }
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!
    if (r <= 0) return pool[i]!
  }
  return pool[pool.length - 1]!
}

function paymentPayload(dep: {
  id: string
  amount: bigint
  method: PaymentMethod
  status: string
  createdAt: Date
  trxId: string | null
  receiptUrl: string | null
}, order: {
  orderNo: string
  collectionAccount: string | null
  status: string
}, account: { number: string; holder: string; method: PaymentMethod } | null, payBaseUrl: string) {
  const expiresAt = new Date(dep.createdAt.getTime() + PAY_WINDOW_MS)
  const methodLabel = dep.method === 'JAZZCASH' ? 'JazzCash' : dep.method === 'EASYPAISA' ? 'Easypaisa' : dep.method
  const base = (payBaseUrl || 'https://pay.roadmaster.pro').replace(/\/$/, '')
  const paymentUrl = `${base}/payment?orderNo=${encodeURIComponent(order.orderNo)}`
  return {
    id: dep.id,
    depositId: dep.id,
    agentAccountId: null as string | null,
    orderNo: order.orderNo,
    amount: toRupees(dep.amount),
    method: dep.method,
    status: dep.status,
    orderStatus: order.status,
    trxId: dep.trxId,
    receiptUrl: dep.receiptUrl,
    createdAt: dep.createdAt,
    expiresAt,
    paymentUrl,
    paymentPath: paymentUrl,
    account: account
      ? {
          number: account.number,
          title: account.holder,
          method: account.method,
          instructions: [
            `Open your ${methodLabel} app`,
            `Send exactly Rs ${toRupees(dep.amount)} to the account below`,
            'Copy the Transaction ID (TID) from the success SMS / app',
            'Paste the TID on this page and submit before the timer ends',
          ],
        }
      : null,
  }
}

export async function create(userId: string, input: {
  amount: number
  method: PaymentMethod
  channelId?: string
  agentAccountId?: string
  senderAccount?: string
  trxId?: string
  receiptUrl?: string
  /** When true (default for mobile wallet methods), auto-assign a rotated C2C merchant account. */
  autoAssign?: boolean
}) {
  const s = await getSettings()
  if (!methodEnabled(s, input.method)) throw unprocessable('Payment method is disabled')
  const amount = toPaisa(input.amount)
  if (amount < toPaisa(s.minDeposit) || amount > toPaisa(s.maxDeposit)) {
    throw unprocessable(`Deposit must be between ${s.minDeposit} and ${s.maxDeposit}`)
  }

  const wantAuto =
    input.autoAssign !== false &&
    !input.agentAccountId &&
    !input.channelId &&
    (input.method === 'JAZZCASH' || input.method === 'EASYPAISA')

  // Prefer agent collection account (C2C). channelId from player UI is often an agentAccount id.
  const accountId = input.agentAccountId || input.channelId
  let agentAccount: AgentAcc | null = null
  if (accountId) {
    const found = await prisma.agentAccount.findFirst({
      where: { id: accountId, enabled: true, awaitingReview: false },
      include: { user: { select: { id: true, role: true, agentActive: true, orderSharePct: true } } },
    })
    if (found) {
      agentAccount = {
        id: found.id,
        number: found.number,
        holder: found.holder,
        method: found.method,
        userId: found.userId,
        user: found.user,
      }
    }
  }

  if (!agentAccount && wantAuto) {
    agentAccount = await pickRotatedAgentAccount(input.method, userId)
    if (!agentAccount) throw unprocessable('No C2C merchant available right now. Please try again shortly.')
  }

  // Legacy platform PaymentChannel fallback
  let channelId: string | undefined
  let platformChannel: { accountNumber: string; accountTitle: string; method: PaymentMethod } | null = null
  if (!agentAccount && input.channelId) {
    const ch = await prisma.paymentChannel.findFirst({ where: { id: input.channelId, enabled: true } })
    if (!ch) throw badRequest('Invalid payment account')
    channelId = ch.id
    platformChannel = { accountNumber: ch.accountNumber, accountTitle: ch.accountTitle, method: ch.method }
  }

  if (agentAccount && (agentAccount.user.role !== 'AGENT' || !agentAccount.user.agentActive)) {
    throw unprocessable('This collection account is not available right now')
  }

  if (!agentAccount && !channelId && (input.method === 'JAZZCASH' || input.method === 'EASYPAISA')) {
    throw unprocessable('No C2C merchant available right now. Please try again shortly.')
  }

  const result = await runMoneyTx(async (tx) => {
    const dep = await tx.deposit.create({
      data: {
        userId,
        amount,
        method: input.method,
        channelId: channelId ?? null,
        agentAccountId: agentAccount?.id ?? null,
        agentId: agentAccount?.userId ?? null,
        senderAccount: input.senderAccount,
        trxId: input.trxId,
        receiptUrl: input.receiptUrl,
        status: 'PENDING',
      },
    })

    let order: { orderNo: string; collectionAccount: string | null; status: string } | null = null

    // Route to the agent's C2C queue when an agent account was used
    if (agentAccount) {
      const created = await tx.collectionOrder.create({
        data: {
          orderNo: orderNo('P'),
          type: 'DEPOSIT',
          amount: dep.amount,
          reward: applyPct(dep.amount, s.payoutReward),
          playerId: userId,
          agentId: agentAccount.userId,
          walletAccount: input.senderAccount ?? null,
          collectionAccount: agentAccount.number,
          method: input.method,
          status: 'PENDING',
          depositId: dep.id,
          trxId: input.trxId ?? null,
        },
      })
      order = { orderNo: created.orderNo, collectionAccount: created.collectionAccount, status: created.status }
    }

    const account = agentAccount
      ? { number: agentAccount.number, holder: agentAccount.holder, method: agentAccount.method }
      : platformChannel
        ? { number: platformChannel.accountNumber, holder: platformChannel.accountTitle, method: platformChannel.method }
        : null

    if (!order) {
      // Platform / float top-up — no C2C payment page
      return {
        id: dep.id,
        depositId: dep.id,
        agentAccountId: null as string | null,
        agentId: null as string | null,
        orderNo: null as string | null,
        amount: toRupees(dep.amount),
        method: dep.method,
        status: dep.status,
        orderStatus: null as string | null,
        trxId: dep.trxId,
        receiptUrl: dep.receiptUrl,
        createdAt: dep.createdAt,
        expiresAt: null as Date | null,
        paymentUrl: null as string | null,
        paymentPath: null as string | null,
        account,
      }
    }

    return {
      ...paymentPayload(dep, order, account, s.c2cPayBaseUrl),
      agentAccountId: agentAccount?.id ?? null,
      agentId: agentAccount?.userId ?? null,
    }
  })

  // Realtime: merchant gets a live alert as soon as the player opens a C2C deposit
  if (result.agentId && result.orderNo) {
    try {
      const player = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      })
      pushDepositToMerchant(result.agentId, {
        type: 'deposit_new',
        title: 'New deposit order',
        body: `${player?.displayName || 'Player'} started a Rs ${Number(result.amount).toLocaleString('en-PK')} ${result.method} deposit`,
        orderId: result.id,
        orderNo: result.orderNo,
        amount: Number(result.amount),
        method: String(result.method),
        collectionAccount: result.account?.number ?? null,
        playerName: player?.displayName ?? null,
      })
    } catch {
      /* non-fatal */
    }
  }

  return result
}

export async function getByOrderNo(userId: string, orderNoStr: string) {
  const s = await getSettings()
  const order = await prisma.collectionOrder.findUnique({
    where: { orderNo: orderNoStr },
    include: {
      deposit: {
        include: { agentAccount: true, channel: true },
      },
    },
  })
  if (!order || !order.deposit || order.deposit.userId !== userId) throw notFound('Payment order not found')
  const dep = order.deposit
  const account = dep.agentAccount
    ? { number: dep.agentAccount.number, holder: dep.agentAccount.holder, method: dep.agentAccount.method }
    : dep.channel
      ? { number: dep.channel.accountNumber, holder: dep.channel.accountTitle, method: dep.channel.method }
      : order.collectionAccount
        ? { number: order.collectionAccount, holder: 'Merchant', method: dep.method }
        : null
  return paymentPayload(
    dep,
    { orderNo: order.orderNo, collectionAccount: order.collectionAccount, status: order.status },
    account,
    s.c2cPayBaseUrl,
  )
}

export async function submitProof(
  userId: string,
  orderNoStr: string,
  input: { trxId: string; receiptUrl?: string; senderAccount?: string },
) {
  const trxId = input.trxId.trim()
  if (!trxId) throw badRequest('Transaction ID is required')

  const order = await prisma.collectionOrder.findUnique({
    where: { orderNo: orderNoStr },
    include: { deposit: true },
  })
  if (!order || !order.deposit || order.deposit.userId !== userId) throw notFound('Payment order not found')
  if (order.deposit.status !== 'PENDING') throw conflict('This deposit is already processed')

  const expiresAt = order.deposit.createdAt.getTime() + PAY_WINDOW_MS
  if (Date.now() > expiresAt) {
    throw unprocessable('Payment window expired. Please create a new deposit.')
  }

  const submittedAt = new Date()
  await prisma.$transaction([
    prisma.deposit.update({
      where: { id: order.deposit.id },
      data: {
        trxId,
        receiptUrl: input.receiptUrl ?? order.deposit.receiptUrl,
        senderAccount: input.senderAccount ?? order.deposit.senderAccount,
      },
    }),
    prisma.collectionOrder.update({
      where: { id: order.id },
      data: {
        trxId,
        walletAccount: input.senderAccount ?? order.walletAccount,
        status: order.status === 'PENDING' ? 'CHECKING' : order.status,
        submittedAt,
      },
    }),
  ])

  // Realtime: merchant is notified the moment the player submits TID / proof
  if (order.agentId) {
    try {
      const player = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      })
      const amountRs = toRupees(order.amount)
      pushDepositToMerchant(order.agentId, {
        type: 'deposit_submitted',
        title: 'Player submitted payment',
        body: `${player?.displayName || 'Player'} paid Rs ${amountRs.toLocaleString('en-PK')} — TID ${trxId}. Confirm now.`,
        orderId: order.id,
        orderNo: order.orderNo,
        amount: amountRs,
        method: String(order.method || order.deposit.method),
        collectionAccount: order.collectionAccount,
        trxId,
        playerName: player?.displayName ?? null,
      })
    } catch {
      /* non-fatal */
    }
  }

  return getByOrderNo(userId, orderNoStr)
}

export function listMine(userId: string) {
  return prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 })
}

export async function bonusEstimate(userId: string, amountRupees: number) {
  const s = await getSettings()
  const amount = toPaisa(amountRupees)
  const priorApproved = await prisma.deposit.count({ where: { userId, status: 'APPROVED' } })
  let bonusPct = 0
  let label = 'No bonus'
  if (priorApproved < 3) {
    bonusPct = [s.depositBonus1, s.depositBonus2, s.depositBonus3][priorApproved]!
    label = `${priorApproved + 1}${priorApproved === 0 ? 'st' : priorApproved === 1 ? 'nd' : 'rd'} deposit bonus`
  } else {
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const dailyToday = await prisma.bonus.count({ where: { userId, type: 'DAILY_DEPOSIT', createdAt: { gte: since } } })
    if (dailyToday === 0) { bonusPct = s.dailyDepositBonus; label = 'Daily deposit bonus' }
  }
  const bonusAmount = applyPct(amount, bonusPct)
  return { pct: bonusPct, bonusAmount: Number(bonusAmount) / 100, label, depositNumber: priorApproved + 1 }
}

export function adminList(status?: string) {
  return prisma.deposit.findMany({
    // C2C merchant float top-ups are reviewed separately under C2C Float Banks.
    where: {
      user: { role: { not: 'AGENT' } },
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { displayName: true, phone: true, playerNo: true } },
      channel: { select: { method: true, accountNumber: true } },
      agentAccount: {
        select: {
          number: true,
          holder: true,
          method: true,
          user: { select: { displayName: true, phone: true, panelId: true } },
        },
      },
      collectionOrder: {
        select: {
          orderNo: true,
          status: true,
          manualDone: true,
          agent: { select: { panelId: true, displayName: true, phone: true } },
        },
      },
    },
  })
}

const DEPOSIT_BONUS_TYPE: BonusType[] = ['DEPOSIT_1', 'DEPOSIT_2', 'DEPOSIT_3']

/** Credit player wallet + bonuses. Used by admin approve OR agent C2C confirm. */
export async function creditDeposit(tx: any, depositId: string, processedById: string) {
  const dep = await tx.deposit.findUnique({ where: { id: depositId }, include: { user: true } })
  if (!dep) throw notFound('Deposit not found')
  if (dep.status !== 'PENDING') throw conflict('Deposit already processed')

  const s = await getSettings()

  await tx.deposit.update({
    where: { id: depositId },
    data: { status: 'APPROVED', processedById, processedAt: new Date() },
  })

  await post(tx, {
    type: 'DEPOSIT',
    referenceType: 'deposit',
    referenceId: dep.id,
    idempotencyKey: `deposit:${dep.id}`,
    legs: [
      { account: { system: 'GATEWAY_CLEARING' }, direction: 'DEBIT', amount: dep.amount },
      { account: { userId: dep.userId, bucket: 'MAIN' }, direction: 'CREDIT', amount: dep.amount },
    ],
  })

  const priorApproved = await tx.deposit.count({ where: { userId: dep.userId, status: 'APPROVED', id: { not: dep.id } } })
  let bonusPct = 0
  let bonusType: BonusType | null = null
  if (priorApproved < 3) {
    bonusPct = [s.depositBonus1, s.depositBonus2, s.depositBonus3][priorApproved]!
    bonusType = DEPOSIT_BONUS_TYPE[priorApproved]!
  } else {
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const dailyToday = await tx.bonus.count({ where: { userId: dep.userId, type: 'DAILY_DEPOSIT', createdAt: { gte: since } } })
    if (dailyToday === 0) { bonusPct = s.dailyDepositBonus; bonusType = 'DAILY_DEPOSIT' }
  }
  // Agent float top-ups credit MAIN only — no player deposit bonuses / referral accrual
  const isAgentFloat = dep.user.role === 'AGENT' || dep.user.role === 'ADMIN'
  if (!isAgentFloat && bonusType && bonusPct > 0) {
    const bonusAmt = applyPct(dep.amount, bonusPct)
    if (bonusAmt > 0n) {
      await post(tx, {
        type: 'DEPOSIT_BONUS',
        referenceType: 'deposit',
        referenceId: dep.id,
        idempotencyKey: `deposit-bonus:${dep.id}`,
        legs: [
          { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount: bonusAmt },
          { account: { userId: dep.userId, bucket: 'BONUS' }, direction: 'CREDIT', amount: bonusAmt },
        ],
      })
      const { bonusWager } = await getEffectiveWager(dep.userId, tx)
      const bonus = await tx.bonus.create({
        data: { userId: dep.userId, type: bonusType, amount: bonusAmt, wagerRequired: applyPct(bonusAmt, bonusWager * 100), status: 'ACTIVE' },
      })
      await releaseIfNoWager(tx, bonus.id)
    }
  }

  if (!isAgentFloat) {
    await accrueForDeposit(tx, { ...dep, status: 'APPROVED' }, s)
    if (dep.user.referredById) await updateAgentship(tx, dep.user.referredById, s)
    const { syncUserVipLevel } = await import('../vip/vip.service.js')
    await syncUserVipLevel(dep.userId, tx)
  }

  await notify(
    tx,
    dep.userId,
    'deposit',
    isAgentFloat ? 'Float top-up approved' : 'Deposit approved',
    isAgentFloat
      ? `Rs ${toRupees(dep.amount).toLocaleString('en-PK')} was added to your agent float.`
      : `Your deposit of Rs ${toRupees(dep.amount).toLocaleString('en-PK')} has been approved and added to your wallet.`,
  )

  return dep
}

export async function approve(depositId: string, adminId: string) {
  let userId: string | null = null
  const dep = await runMoneyTx(async (tx) => {
    const credited = await creditDeposit(tx, depositId, adminId)
    userId = credited.userId
    // If a C2C order exists, complete it and cut merchant float (+ reward)
    const order = await tx.collectionOrder.findFirst({ where: { depositId, type: 'DEPOSIT' } })
    if (order && order.status !== 'SUCCESS' && order.status !== 'FAIL') {
      await tx.collectionOrder.update({
        where: { id: order.id },
        data: { status: 'SUCCESS', resolvedAt: new Date() },
      })
      await settleAgentCollection(tx, order)
    }
    return tx.deposit.findUniqueOrThrow({ where: { id: depositId } })
  })
  if (userId) void pushPlayerWallet(userId, 'deposit_approved')
  return dep
}

export async function reject(depositId: string, adminId: string, reason: string) {
  return runMoneyTx(async (tx) => {
    const dep = await tx.deposit.findUnique({ where: { id: depositId } })
    if (!dep) throw notFound('Deposit not found')
    if (dep.status !== 'PENDING') throw conflict('Deposit already processed')
    const updated = await tx.deposit.update({
      where: { id: depositId },
      data: { status: 'REJECTED', rejectReason: reason, processedById: adminId, processedAt: new Date() },
    })
    const order = await tx.collectionOrder.findFirst({ where: { depositId, type: 'DEPOSIT' } })
    if (order && order.status !== 'SUCCESS' && order.status !== 'FAIL') {
      await tx.collectionOrder.update({ where: { id: order.id }, data: { status: 'FAIL', resolvedAt: new Date() } })
    }
    await notify(tx, dep.userId, 'deposit', 'Deposit rejected', `Your deposit was rejected. Reason: ${reason}`)
    return updated
  })
}

/**
 * Cut merchant float for a confirmed C2C deposit collection, then credit reward % to MAIN.
 * Example: amount 2000, reward 40 → MAIN -= 2000 then MAIN += 40 (net −1960).
 * Player credit is handled separately by creditDeposit().
 */
async function settleAgentCollection(tx: any, order: { id: string; amount: bigint; reward: bigint; agentId: string | null }) {
  if (!order.agentId) return

  const bal = await getBalances(tx, order.agentId)
  if ((bal.MAIN ?? 0n) < order.amount) {
    throw unprocessable(
      `Insufficient merchant float. Need Rs ${toRupees(order.amount).toLocaleString('en-PK')} to confirm this deposit.`,
    )
  }

  await post(tx, {
    type: 'COLLECTION',
    referenceType: 'collectionOrder',
    referenceId: order.id,
    idempotencyKey: `col-cut:${order.id}`,
    assertNonNegative: [{ userId: order.agentId, bucket: 'MAIN' }],
    legs: [
      { account: { userId: order.agentId, bucket: 'MAIN' }, direction: 'DEBIT', amount: order.amount },
      { account: { system: 'HOUSE' }, direction: 'CREDIT', amount: order.amount },
    ],
  })

  if (order.reward > 0n) {
    await post(tx, {
      type: 'COMMISSION',
      referenceType: 'collectionOrder',
      referenceId: order.id,
      idempotencyKey: `col-reward:${order.id}`,
      meta: { kind: 'collection_reward' },
      legs: [
        { account: { system: 'HOUSE' }, direction: 'DEBIT', amount: order.reward },
        { account: { userId: order.agentId, bucket: 'MAIN' }, direction: 'CREDIT', amount: order.reward },
      ],
    })
  }
}

/**
 * Agent confirms a C2C deposit collection:
 * - credits the player (full deposit + bonuses)
 * - cuts deposit amount from merchant MAIN
 * - credits agent the configured % (payoutReward, default 2%) back into MAIN
 */
export async function agentConfirmDeposit(orderId: string, agentId: string, trxId?: string) {
  let userId: string | null = null
  const order = await runMoneyTx(async (tx) => {
    const found = await tx.collectionOrder.findFirst({ where: { id: orderId, agentId, type: 'DEPOSIT' } })
    if (!found) throw notFound('Order not found')
    if (found.status === 'SUCCESS' || found.status === 'FAIL') throw conflict('Order already resolved')
    if (!found.depositId) throw badRequest('Order is not linked to a deposit')

    // Float check before crediting player (avoid orphan player credit if cut fails)
    const bal = await getBalances(tx, agentId)
    if ((bal.MAIN ?? 0n) < found.amount) {
      throw unprocessable(
        `Insufficient merchant float. Need Rs ${toRupees(found.amount).toLocaleString('en-PK')} to confirm this deposit.`,
      )
    }

    const credited = await creditDeposit(tx, found.depositId, agentId)
    userId = credited.userId

    await tx.collectionOrder.update({
      where: { id: found.id },
      data: { status: 'SUCCESS', trxId: trxId ?? found.trxId, resolvedAt: new Date() },
    })

    await settleAgentCollection(tx, found)

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: found.id } })
  })
  if (userId) void pushPlayerWallet(userId, 'deposit_approved')
  return order
}

export async function agentRejectDeposit(orderId: string, agentId: string, reason = 'Not received') {
  return runMoneyTx(async (tx) => {
    const order = await tx.collectionOrder.findFirst({ where: { id: orderId, agentId, type: 'DEPOSIT' } })
    if (!order) throw notFound('Order not found')
    if (order.status === 'SUCCESS' || order.status === 'FAIL') throw conflict('Order already resolved')

    await tx.collectionOrder.update({
      where: { id: order.id },
      data: { status: 'FAIL', resolvedAt: new Date() },
    })

    if (order.depositId) {
      const dep = await tx.deposit.findUnique({ where: { id: order.depositId } })
      if (dep && dep.status === 'PENDING') {
        await tx.deposit.update({
          where: { id: dep.id },
          data: { status: 'REJECTED', rejectReason: reason, processedById: agentId, processedAt: new Date() },
        })
        await notify(tx, dep.userId, 'deposit', 'Deposit rejected', `Your deposit was rejected by the agent. Reason: ${reason}`)
      }
    }

    return tx.collectionOrder.findUniqueOrThrow({ where: { id: order.id } })
  })
}

/**
 * Admin "Manual Done": merchant marked Fail, but player proved payment (screenshot).
 * Same money path as agentConfirmDeposit — credit player, cut merchant float + reward.
 * Order stays SUCCESS with manualDone=true (C2C shows Fail + Manual Done).
 */
export async function adminManualDoneDeposit(depositId: string, adminId: string) {
  let userId: string | null = null
  const result = await runMoneyTx(async (tx) => {
    const dep = await tx.deposit.findUnique({
      where: { id: depositId },
      include: { collectionOrder: true },
    })
    if (!dep) throw notFound('Deposit not found')
    if (dep.status !== 'REJECTED') throw conflict('Only rejected deposits can be manually done')

    const order =
      dep.collectionOrder ??
      (await tx.collectionOrder.findFirst({ where: { depositId, type: 'DEPOSIT' } }))
    if (!order) throw badRequest('Not a C2C collection deposit')
    if (order.status !== 'FAIL') throw conflict('Order must be Fail (merchant rejected) before manual done')
    if (order.manualDone) throw conflict('Already marked Manual Done')
    if (!order.agentId) throw badRequest('No C2C merchant on this order')
    if (!order.depositId) throw badRequest('Order is not linked to a deposit')

    const bal = await getBalances(tx, order.agentId)
    if ((bal.MAIN ?? 0n) < order.amount) {
      throw unprocessable(
        `Insufficient merchant float. Need Rs ${toRupees(order.amount).toLocaleString('en-PK')} to manual-done this deposit.`,
      )
    }

    // Re-open so creditDeposit can run (idempotency keys still unique per deposit id)
    await tx.deposit.update({
      where: { id: dep.id },
      data: { status: 'PENDING', rejectReason: null, processedById: null, processedAt: null },
    })

    const credited = await creditDeposit(tx, dep.id, adminId)
    userId = credited.userId

    await tx.collectionOrder.update({
      where: { id: order.id },
      data: {
        status: 'SUCCESS',
        manualDone: true,
        resolvedAt: new Date(),
      },
    })

    await settleAgentCollection(tx, order)

    return tx.deposit.findUniqueOrThrow({
      where: { id: depositId },
      include: {
        collectionOrder: { select: { id: true, orderNo: true, status: true, manualDone: true } },
      },
    })
  })
  if (userId) void pushPlayerWallet(userId, 'deposit_approved')
  return result
}
