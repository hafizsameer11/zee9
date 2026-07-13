import type { Request } from 'express'

export interface PageParams {
  page: number
  limit: number
  skip: number
}

export function pageParams(req: Request, defaultLimit = 25, maxLimit = 100): PageParams {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit }
}

export function paged<T>(items: T[], total: number, p: PageParams) {
  return { items, total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit) }
}
