import type { Request, Response } from 'express'
import * as service from './auth.service.js'
import { ok } from '../../lib/respond.js'

function meta(req: Request) {
  return { ip: req.ip, ua: req.headers['user-agent'] }
}

export async function register(req: Request, res: Response) {
  const result = await service.register({ ...req.body, ...meta(req) })
  ok(res, result, 201)
}

export async function login(req: Request, res: Response) {
  const result = await service.login({ ...req.body, ...meta(req) })
  ok(res, result)
}

export async function refresh(req: Request, res: Response) {
  const result = await service.refresh(req.body.refreshToken)
  ok(res, result)
}

export async function logout(req: Request, res: Response) {
  await service.logout(req.body.refreshToken ?? '')
  ok(res, { loggedOut: true })
}

export async function changePassword(req: Request, res: Response) {
  await service.changePassword(req.user!.id, req.body.oldPassword, req.body.newPassword)
  ok(res, { changed: true })
}
