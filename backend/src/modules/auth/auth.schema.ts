import { z } from 'zod'

const phone = z.string().min(7).max(20)
const password = z.string().min(6).max(72)

export const registerSchema = z.object({
  phone,
  password,
  displayName: z.string().min(2).max(40),
  referralCode: z.string().min(3).max(20).optional(),
  shareCode: z.string().min(3).max(30).optional(),
  playerId: z.union([z.string().regex(/^\d{6,10}$/), z.number().int().min(100000).max(9999999999)]).optional(),
  channel: z.string().max(30).optional(),
  bindCode: z.string().max(30).optional(),
})

/** Which front-end is signing in; defaults to the player game app. */
export const loginAppSchema = z.enum(['player', 'c2c', 'agent', 'mentor', 'admin'])
export type LoginApp = z.infer<typeof loginAppSchema>

export const loginSchema = z.object({ phone, password, app: loginAppSchema.optional() })

export const refreshSchema = z.object({ refreshToken: z.string().min(10) })

export const changePasswordSchema = z.object({
  oldPassword: password,
  newPassword: password,
})
