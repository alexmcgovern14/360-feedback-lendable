# Fixing "Database unavailable" on Vercel

The 360 Feedback site on Vercel shows "Database unavailable" when it cannot reach Supabase Postgres. This guide helps you fix it.

## What we tried

| Format | Host | Result |
|--------|------|--------|
| Same-host pooler | `db.pcjjjpydenieeonnfngn.supabase.co:6543` | Can't reach database server |
| Supavisor us-east-1 | `aws-0-us-east-1.pooler.supabase.com:6543` | Tenant or user not found |
| Supavisor eu-west-1 | `aws-0-eu-west-1.pooler.supabase.com:6543` | Tenant or user not found |
| Supavisor ap-southeast-1 | `aws-0-ap-southeast-1.pooler.supabase.com:6543` | Tenant or user not found |
| Supavisor eu-central-1 | `aws-0-eu-central-1.pooler.supabase.com:6543` | Tenant or user not found |

**Conclusion:** The correct connection string and region must come from the Supabase Dashboard. Use the exact URI shown there.

---

## Fix steps

### 1. Get the exact Transaction mode URI from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project (ref: `pcjjjpydenieeonnfngn`)
3. Click **Connect** (or go to **Project Settings → Database → Connect**)
4. Under **Connection string**, select **Transaction** (port 6543)
5. Copy the URI. It will look like either:
   - `postgresql://postgres.[PASSWORD]@db.pcjjjpydenieeonnfngn.supabase.co:6543/postgres`
   - Or (newer Supavisor): `postgresql://postgres.[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
6. Replace `[YOUR-PASSWORD]` with your actual database password
7. If the password contains special characters (`$`, `&`, `!`, etc.), URL-encode them (e.g. `!` → `%21`)
8. Append `?pgbouncer=true` (and optionally `&connection_limit=1` for serverless)

### 2. Set DATABASE_URL on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Open the project
3. **Settings → Environment Variables**
4. Edit `DATABASE_URL` (or add it): paste the full URI from step 1
5. Do **not** add quotes around the value
6. Apply to **Production**, **Preview**, and **Development**

### 3. Check Supabase Network Restrictions

If the error is **"Can't reach database server"**:

1. Supabase Dashboard → **Database → Settings** (or **Network restrictions**)
2. If network restrictions are enabled and blocking connections:
   - Add `0.0.0.0/0` (IPv4) and `::/0` (IPv6) to allow all connections (for testing)
   - Or add Vercel’s IP ranges (see [Vercel docs](https://vercel.com/docs/security/ip-addresses))
3. If the project uses IPv6 and Vercel has IPv6 issues, consider the Supavisor pooler URI from the Connect page (it supports IPv4)

### 4. Redeploy on Vercel

1. **Deployments** → **Redeploy** latest
2. Or push an empty commit: `git commit --allow-empty -m "Trigger redeploy" && git push origin main`
3. Wait 1–2 minutes for the deployment to complete

### 5. Verify

Visit https://360-feedback-lendable.vercel.app. You should see content like "Nominate reviewers for…" instead of "Database unavailable".

---

## Push env via script (after fixing .env.local)

If you’ve updated `lendable-app/.env` or `.env.local` with the correct `DATABASE_URL`:

```bash
cd lendable-app
npm run vercel:env
```

Then redeploy (empty commit or Vercel dashboard).

---

## References

- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
- [Supabase: Network restrictions](https://supabase.com/docs/guides/platform/network-restrictions)
- [lendable-app/README.md](./README.md) — Deploying to Vercel section
