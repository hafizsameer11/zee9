import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { nanoid } from 'nanoid'
import { env } from '../lib/env.js'
import { badRequest } from '../core/errors.js'

const uploadRoot = path.resolve(env.uploadDir)
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true })

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 8).replace(/[^a-zA-Z0-9.]/g, '')
    cb(null, `${Date.now()}-${nanoid(10)}${ext}`)
  },
})

export const uploadReceipt = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(badRequest('Unsupported file type'))
    cb(null, true)
  },
}).single('file')
