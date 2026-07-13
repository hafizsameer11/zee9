import { z } from 'zod'

const phone = z.string().min(7).max(20)
const password = z.string().min(6).max(72)

export const registerSchema = z.object({
  phone,
  password,
  displayName: z.string().min(2).max(40),
  referralCode: z.string().min(3).max(20).optional(),
  shareCode: z.string().min(3).max(30).optional(),
  channel: z.string().max(30).optional(),
  bindCode: z.string().max(30).optional(),
})

export const loginSchema = z.object({ phone, password })

export const refreshSchema = z.object({ refreshToken: z.string().min(10) })

export const changePasswordSchema = z.object({
  oldPassword: password,
  newPassword: password,
})
