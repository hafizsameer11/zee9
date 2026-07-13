import { Router } from 'express'
import * as ctrl from './auth.controller.js'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authLimiter } from '../../middleware/rateLimit.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { registerSchema, loginSchema, refreshSchema, changePasswordSchema } from './auth.schema.js'

export const authRoutes = Router()

authRoutes.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(ctrl.register))
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(ctrl.login))
authRoutes.post('/refresh', validate({ body: refreshSchema }), asyncHandler(ctrl.refresh))
authRoutes.post('/logout', asyncHandler(ctrl.logout))
authRoutes.post('/change-password', authenticate, validate({ body: changePasswordSchema }), asyncHandler(ctrl.changePassword))
