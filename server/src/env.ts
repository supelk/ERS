import 'dotenv/config'

export const env = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgres://ers:ers_password@localhost:5432/ers',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123456',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekApiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  paddleOcrApiUrl: process.env.PADDLE_OCR_API_URL || '',
  paddleOcrApiKey: process.env.PADDLE_OCR_API_KEY || '',
  paddleOcrModel: process.env.PADDLE_OCR_MODEL || 'PP-OCRv5',
}
