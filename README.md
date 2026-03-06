# Vexyo — Subscription & Bill Manager

A self-hosted subscription and bill tracking app built with Next.js 14, SQLite, and NextAuth. Track all your recurring payments, set budgets, manage family members, and get renewal reminders — no bank connection required.

## Features

- **Dashboard** — monthly/yearly totals, budget tracker, upcoming renewals, spend trend chart
- **My Subscriptions** — table view with category badges, payment method, next billing date
- **My Bills** — separate section for recurring bills (rent, electricity, phone)
- **Analytics** — bar charts, pie chart, 6-month trend, top costs by subscription
- **Categories** — card grid with icons, per-category budget limits and utilization bars
- **Family** — assign subscriptions to family members, spending per member
- **Payment Methods** — track which card/account pays for what
- **Notifications** — auto-generated renewal alerts, trial ending, budget warnings with full settings
- **Shared Links** — read-only share links for family viewing
- **AI Agent** — add subscriptions via natural language, spending insights
- **Profile** — update name, email, password, avatar photo
- **Settings** — currency (auto-converts all amounts), theme, budget, date format
- **Admin Portal** — manage users, branding (logo/favicon/colors), mail server (SMTP), invite links

## Docker Compose

```yaml
services:
  vexyo:
    build: .
    container_name: vexyo
    restart: unless-stopped
    ports:
      - "127.0.0.1:3210:3000"
    environment:
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DB_PATH=/data
    volumes:
      - vexyo_data:/data
    networks:
      - your-network

volumes:
  vexyo_data:
```

## Setup

### 1. Clone and configure

```bash
git clone <your-repo>
cd vexyo
cp .env.example .env
```

Edit `.env`:

```
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://subs.yourdomain.com
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Build and run

```bash
docker compose up -d --build
```

### 3. Create your account

Visit `http://localhost:3210/register` and create your first account.

### 4. Make yourself admin

```bash
docker exec -it vexyo node -e "const db=require('better-sqlite3')('/data/vexyo.db'); db.prepare(\"UPDATE users SET role='admin' WHERE email='your@email.com'\").run(); console.log('Done');"
```

## Nginx reverse proxy

```nginx
location / {
    proxy_pass http://127.0.0.1:3210;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Migrating from Vexyo

If you were running the old Vexyo container, your data is fully compatible. The database file has been renamed from `vexyo.db` to `vexyo.db`. Run this once to migrate:

```bash
docker exec -it vexyo sh -c "cp /data/vexyo.db /data/vexyo.db 2>/dev/null && echo 'Migrated' || echo 'No old DB found'"
```

Then update your `docker-compose.yml` to use the new volume name `vexyo_data`.

## Data

SQLite database stored in a Docker volume at `/data/vexyo.db`. Survives container rebuilds.

## GitHub Actions (GHCR)

The included workflow builds and pushes to `ghcr.io/kyberdot/vexyo:latest` on every push to `main`.
