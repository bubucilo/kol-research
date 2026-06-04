# Deployment Guide

## Prerequisites

- Node.js 20+
- Docker (optional)
- Supabase account (for PostgreSQL)
- Scrapfly API key

## Option 1: Docker Deployment (Recommended)

### 1. Clone and configure

```bash
git clone <your-repo>
cd social-profile-calculator
cp .env.example .env
```

### 2. Set environment variables in `.env`

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
SCRAPFLY_API_KEY="scp-live-your-key"
APIFY_API_KEY="apify_api_your-key"  # Optional fallback
```

### 3. Build and run

```bash
docker compose up -d
```

The app will be available at `http://your-server:3000`

### 4. With Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

## Option 2: Direct Node.js Deployment

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npx prisma generate
```

### 3. Push database schema

```bash
npx prisma db push
```

### 4. Build

```bash
npm run build
```

### 5. Run

```bash
npm start
```

### 6. With PM2 (process manager)

```bash
npm install -g pm2
pm2 start npm --name "profile-calculator" -- start
pm2 save
pm2 startup
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SCRAPFLY_API_KEY` | Yes | Scrapfly API key for scraping |
| `APIFY_API_KEY` | No | Apify API key (fallback) |
| `NODE_ENV` | No | Set to `production` |

## SSL/HTTPS

Use Certbot with Nginx:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Monitoring

Check app status:
```bash
docker compose logs -f
# or
pm2 logs profile-calculator
```

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
# or
npm run build
pm2 restart profile-calculator
```