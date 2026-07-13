import type { NextFunction, Request, Response } from 'express'

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown

/** Wrap async route handlers so rejected promises reach the error middleware. */
export function asyncHandler(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
