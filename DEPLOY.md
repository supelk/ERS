# ERS Cloud Deployment

## Local/Server Deployment

1. Copy `.env.example` to `.env`.
2. Fill these required values:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `DEEPSEEK_API_KEY`
   - `PADDLE_OCR_API_URL`
   - `PADDLE_OCR_API_KEY`
   - `PADDLE_OCR_MODEL`，默认 `PaddleOCR-VL-1.6`
3. Start services:

```bash
docker compose up -d --build
```

4. Open:

```text
http://SERVER_IP
```

The backend initializes PostgreSQL tables and creates the first admin account from `.env`.

## Development

Frontend:

```bash
pnpm install
pnpm dev
```

Backend:

```bash
pnpm --dir server install
pnpm --dir server dev
```

Set `VITE_API_BASE_URL=http://localhost:3000/api` for frontend development when the backend runs separately.
