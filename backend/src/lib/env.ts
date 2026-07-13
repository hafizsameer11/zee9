import 'dotenv/config'

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (v === undefined) throw new Error(`Missing env var: ${name}`)
  return v
}

export const env = {
  nodeEnv: req('NODE_ENV', 'development'),
  isProd: process.env.NODE_ENV === 'production',
  port: Number(req('PORT', '4000')),
  apiPrefix: req('API_PREFIX', '/api/v1'),
  corsOrigins: req('CORS_ORIGINS', 'http://localhost:5174,http://localhost:5300,http://localhost:5400').split(',').map((s) => s.trim()),
  databaseUrl: req('DATABASE_URL'),
  jwt: {
    accessSecret: req('JWT_ACCESS_SECRET', 'dev-access'),
    refreshSecret: req('JWT_REFRESH_SECRET', 'dev-refresh'),
    accessTtl: req('JWT_ACCESS_TTL', '15m'),
    refreshTtl: req('JWT_REFRESH_TTL', '30d'),
  },
  uploadDir: req('UPLOAD_DIR', 'uploads'),
  maxUploadMb: Number(req('MAX_UPLOAD_MB', '5')),
}
