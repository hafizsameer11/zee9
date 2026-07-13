import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { uploadReceipt } from '../../middleware/upload.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { badRequest } from '../../core/errors.js'

export const uploadRoutes = Router()

// Multipart receipt/proof upload → returns a media record with a servable URL.
uploadRoutes.post(
  '/',
  authenticate,
  uploadReceipt,
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('No file uploaded (field name must be "file")')
    const url = `/uploads/${req.file.filename}`
    const media = await prisma.media.create({
      data: {
        ownerId: req.user!.id,
        kind: 'DEPOSIT_RECEIPT',
        url,
        mime: req.file.mimetype,
        size: req.file.size,
      },
      select: { id: true, url: true, mime: true, size: true },
    })
    ok(res, media, 201)
  }),
)
