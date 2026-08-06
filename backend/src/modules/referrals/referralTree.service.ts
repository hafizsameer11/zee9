import type { Tx } from '../../lib/prisma.js'
import { prisma } from '../../lib/prisma.js'
import { notFound } from '../../core/errors.js'

/** Walk up the referrer chain and create up to `maxLevels` referral edges. */
export async function buildReferralEdges(
  tx: Tx,
  newUserId: string,
  referredById: string | null,
  maxLevels = 3,
) {
  let ancestorId = referredById
  for (let level = 1; level <= maxLevels && ancestorId; level++) {
    await tx.referralEdge.create({ data: { ancestorId, descendantId: newUserId, level } })
    const parent = await tx.user.findUnique({ where: { id: ancestorId }, select: { referredById: true } })
    ancestorId = parent?.referredById ?? null
  }
}

/** Rebuild referral edges for a user and every descendant (after unlink or parent change). */
export async function rebuildReferralSubtree(tx: Tx, userId: string) {
  await tx.referralEdge.deleteMany({ where: { descendantId: userId } })
  const user = await tx.user.findUnique({ where: { id: userId }, select: { referredById: true } })
  if (user?.referredById) {
    await buildReferralEdges(tx, userId, user.referredById)
  }
  const children = await tx.user.findMany({ where: { referredById: userId }, select: { id: true } })
  for (const child of children) {
    await rebuildReferralSubtree(tx, child.id)
  }
}

/** Remove user from the referral tree (clears referredById and rebuilds their subtree). */
export async function unlinkFromReferralTree(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) throw notFound('User not found')

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { referredById: null } })
    await rebuildReferralSubtree(tx, userId)
  })

  return { id: userId, unlinked: true }
}
