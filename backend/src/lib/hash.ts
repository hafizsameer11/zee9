import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'

// NOTE: bcryptjs (pure JS) for portability. For production, prefer argon2id.
export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10)
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash)
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

const codeGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)
export function referralCode(): string {
  return codeGen()
}
