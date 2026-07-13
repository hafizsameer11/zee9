import type { NextFunction, Request, Response } from 'express'
import type { ZodTypeAny } from 'zod'
import { badRequest } from '../core/errors.js'

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }

/** Validate request parts against zod schemas; replaces req parts with parsed values. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query))
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params))
      next()
    } catch (err: any) {
      next(badRequest('Validation failed', err?.errors ?? String(err)))
    }
  }
}
