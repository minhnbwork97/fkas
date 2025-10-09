# Quickstart

## Prerequisites
- Node 18+
- Vercel account
- Supabase project (free tier)

## Setup
1. Create Next.js app and install deps:
   - Next.js, Tailwind, shadcn/ui, Prisma, @prisma/client, zod
2. Init shadcn/ui and Tailwind with a minimal theme.
3. Configure Prisma:
   - DATABASE_URL pointing to Supabase Postgres
   - Use SQLite locally: DATABASE_URL=file:dev.db
4. Env vars:
   - ADMIN_PIN for organizer actions
   - NEXT_PUBLIC_APP_URL

## Dev
- Run smoke script to validate: create match → submit 1/0/0.5 → deadlines → readiness → settlement

## Deploy
- Push to Vercel; set env vars; run Prisma migrations pointing to Supabase.
