# REI Sign

**Contract management and e-signature platform built for real estate wholesalers.**

REI Sign streamlines the contract workflow for real estate wholesaling—from creating purchase agreements to collecting legally-binding e-signatures. Built to handle the unique needs of wholesalers: assignment contracts, as-is clauses, and state-specific templates.

![REI Sign Dashboard](docs/screenshots/template-selection.png)

---

## What It Does

- **Contract Creation** — Generate contracts from 50-state compliant templates with property details auto-populated
- **E-Signatures** — Send contracts for signature via integrated e-signature service (Documenso)
- **AI-Powered Clauses** — Generate custom clauses (as-is, contingencies, assignments) using GPT-4
- **Team Collaboration** — Invite team members with role-based permissions
- **Subscription Billing** — Stripe-powered plans with usage tracking and overage billing
- **Multi-Tenant Architecture** — Company-isolated data with row-level security

---

## Screenshots

### Template Selection & Contract Creation
Select from state-specific templates and enter property details to create a new contract.

![Template Selection](docs/screenshots/template-selection.png)

### Contract Editor & Signature Fields
Edit contract fields, add signers, and send for e-signature.

![Contract Editor](docs/screenshots/contract-editor.png)

### Template Management
Add, edit, duplicate, and delete contract templates for your team.

![Template Management](docs/screenshots/template-management.png)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui (Radix primitives) |
| **Database** | Supabase (PostgreSQL) with Row-Level Security |
| **Authentication** | Supabase Auth (email/password, OAuth) |
| **E-Signatures** | Documenso (self-hosted on DigitalOcean VPS) |
| **Payments** | Stripe (Checkout, Customer Portal, Webhooks) |
| **AI** | OpenAI GPT-4 API |
| **Email** | Resend |
| **PDF Generation** | Puppeteer + pdf-lib |
| **Error Tracking** | Sentry |
| **Deployment** | Vercel |

---

## Key Systems Knowledge

### Stripe Integration
- **Checkout Sessions** — Creates subscription on signup (`/api/stripe/checkout`)
- **Customer Portal** — Self-service billing management (`/api/stripe/portal`)
- **Webhooks** — Handles `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`
- **Usage Tracking** — Enforces contract limits per billing period

### Authentication Flow
- Supabase Auth with JWT tokens stored in HTTP-only cookies
- Middleware protects routes in `/dashboard/*` and `/api/*`
- Role-based access: `admin`, `manager`, `user`
- Multi-tenant isolation via `company_id` foreign keys

### E-Signature Integration (Documenso)
- Self-hosted instance on DigitalOcean VPS
- API flow: Create document → Add recipients → Add signature fields → Send
- Webhook receives status updates: `PENDING` → `COMPLETED`
- Signed PDFs stored and downloadable

### Webhook Architecture
```
External Service → POST /api/webhooks/{service} → Verify signature → Process event → Update database
```

---

## Troubleshooting / Support Playbook

### Payment Issues

| Symptom | Where to Look | Common Causes |
|---------|---------------|---------------|
| Subscription not activating | Vercel logs → `/api/stripe/webhook` | Webhook signature mismatch, missing `STRIPE_WEBHOOK_SECRET` |
| User charged but plan not updated | Supabase → `companies` table → `billing_plan` | Webhook failed silently, check Stripe Dashboard → Webhooks |
| Checkout session fails | Browser console + Network tab | Invalid `STRIPE_PRICE_ID`, Stripe API key mismatch |

**Debug Steps:**
1. Check Stripe Dashboard → Developers → Webhooks → Recent events
2. Verify webhook endpoint is `https://app.reisign.com/api/stripe/webhook`
3. Check Vercel function logs for the webhook route

### Login / Auth Issues

| Symptom | Where to Look | Common Causes |
|---------|---------------|---------------|
| "Invalid credentials" | Supabase Auth → Users | User exists but email not confirmed |
| Redirect loop on login | Browser cookies, middleware.ts | Stale session cookie, middleware misconfiguration |
| OAuth fails | Supabase Dashboard → Auth → Providers | Callback URL mismatch, provider not enabled |
| "Email already exists" on signup | `/api/auth/check-email` | User attempting to create duplicate account |

**Debug Steps:**
1. Check Supabase Dashboard → Authentication → Users
2. Verify `email_confirmed_at` is set (not NULL)
3. Clear browser cookies and retry

### Document Send Failures

| Symptom | Where to Look | Common Causes |
|---------|---------------|---------------|
| "Failed to send contract" | Vercel logs → `/api/contracts/[id]/send` | Documenso API down, invalid recipient email |
| Document stuck in "sending" | Supabase → `contracts` table → `sending_at` | Race condition lock not released |
| Signer never receives email | Documenso dashboard → Documents | Email blocked by spam filter, invalid email format |
| Duplicate documents created | Documenso dashboard | Double-click on send button (fixed with DB lock) |

**Debug Steps:**
1. Check Documenso dashboard for document status
2. Verify recipient email is valid (no special characters)
3. Check `sending_at` column—if stale (>5 min), lock may be stuck

### Common HTTP Errors

| Code | Meaning | Typical Cause in REI Sign |
|------|---------|---------------------------|
| `400` | Bad Request | Missing required field, invalid input format |
| `401` | Unauthorized | Expired/missing auth token, user not logged in |
| `403` | Forbidden | User lacks permission (wrong role or company) |
| `404` | Not Found | Contract/template doesn't exist or belongs to different company |
| `409` | Conflict | Duplicate operation (e.g., contract already being sent) |
| `500` | Server Error | Unhandled exception—check Vercel/Sentry logs |
| `503` | Service Unavailable | External service down (Stripe, Documenso, OpenAI) |

---

## Real Bugs Fixed

### Safari Cookie Authentication Issue
**Problem:** Users on Safari couldn't send contracts—requests would fail with 401 Unauthorized while working fine on Chrome/Firefox.

**Root Cause:** Safari's stricter cookie policies were blocking cross-origin credentials. The `fetch()` calls to the API weren't including the `credentials: 'include'` option.

**Solution:** Added `credentials: 'include'` to all authenticated fetch calls to ensure cookies are sent with cross-origin requests on Safari.

**Commit:** `3647246 Fix Safari compatibility by adding credentials to fetch calls`

---

### Duplicate Contracts in Documenso
**Problem:** When users clicked "Send Contract," sometimes two identical documents would be created in Documenso, causing confusion and duplicate signature requests.

**Root Cause:** Double-click or touch events on mobile devices were firing multiple API requests before the first one completed. The in-memory rate limiter didn't work in serverless environments because each request could hit a different instance.

**Solution:** Implemented database-level locking using a `sending_at` timestamp column. An atomic PostgreSQL function acquires a lock before sending—if another request tries to send the same contract within 5 minutes, it gets a 409 Conflict response.

**Commits:**
- `86d9834 Fix duplicate send request race condition`
- `b0634b3 Replace in-memory rate limiter with database-based locking`
- `88a8693 Fix database lock: use RPC function instead of .or() filter`

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase account (or local Supabase instance)
- Stripe account (test mode)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/dylandirosa98/reisign.git
cd reisign

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

App runs at `http://localhost:3000`

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Documenso (E-Signature)
DOCUMENSO_API_URL=https://your-documenso-instance.com/api/v1
DOCUMENSO_API_KEY=your-api-key

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRICE_INDIVIDUAL_MONTHLY=price_...
STRIPE_PRICE_INDIVIDUAL_YEARLY=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_...

# Sentry (optional)
SENTRY_DSN=https://...
```

---

## Deployment Notes

### Vercel
- Auto-deploys from `main` branch
- Environment variables set in Vercel Dashboard → Settings → Environment Variables
- Serverless functions have 10s default timeout (increase for PDF generation)

### Webhook Configuration
After deploying, update webhook URLs in:
1. **Stripe Dashboard** → Developers → Webhooks → `https://yourdomain.com/api/stripe/webhook`
2. **Documenso** → Settings → Webhooks → `https://yourdomain.com/api/webhooks/documenso`

### Common Deployment Issues
- **Webhook 401s**: Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint secret (not the signing secret)
- **Cold start timeouts**: PDF generation may timeout—consider upgrading Vercel plan or optimizing
- **Missing env vars**: Double-check all required variables are set in Vercel

---

## Security Notes

- **Authentication**: JWT tokens in HTTP-only cookies, auto-refresh on expiry
- **Authorization**: Row-Level Security (RLS) policies enforce company isolation at database level
- **API Protection**: All `/api/*` routes verify auth token via middleware
- **Webhook Verification**: Stripe webhooks verified with `stripe.webhooks.constructEvent()`
- **Rate Limiting**: Database-level locks prevent duplicate operations (e.g., contract send)
- **Secrets**: All API keys stored as environment variables, never committed to repo

---

## Project Structure

```
app/
├── (auth)/           # Login, signup, password reset
├── (dashboard)/      # Protected app routes
│   └── dashboard/
│       ├── contracts/    # Contract management
│       ├── properties/   # Property management
│       └── settings/     # Billing, team, preferences
├── api/              # API routes
│   ├── contracts/    # Contract CRUD + send
│   ├── stripe/       # Billing endpoints
│   ├── webhooks/     # External service webhooks
│   └── team/         # Team management
└── admin/            # Admin panel

lib/
├── supabase/         # Database clients
├── stripe.ts         # Stripe integration
├── documenso.ts      # E-signature client
└── services/         # Business logic

components/
├── ui/               # shadcn/ui components
├── contracts/        # Contract-specific UI
└── layout/           # Navigation, sidebar
```

---

## Customer Troubleshooting Guide

### Login Problems

**"Invalid login credentials"**
- Double-check your email and password
- Try resetting your password via the login page
- Make sure you've confirmed your email (check spam folder)

**Can't access dashboard after login**
- Clear your browser cookies and try again
- Try a different browser (Chrome recommended)
- If using Safari, ensure cookies are enabled

### Contract Issues

**Contract won't send**
- Verify all signer email addresses are valid
- Check that you haven't exceeded your plan's contract limit
- Wait 30 seconds and try again (prevents duplicate sends)

**Signer says they didn't receive the email**
- Ask them to check their spam/junk folder
- Verify the email address is spelled correctly
- Use the "Resend" button to send again

**Contract stuck in "Sending" status**
- Wait 2-3 minutes—document processing can take time
- If still stuck after 5 minutes, contact support

### Billing Issues

**Subscription not showing after payment**
- Refresh the page and wait 1-2 minutes
- Check your email for Stripe receipt confirmation
- Log out and back in to refresh your session

**Need to update payment method**
- Go to Settings → Billing → "Manage Subscription"
- This opens Stripe's secure portal where you can update your card

---

## GitHub Issue Templates

This repo includes issue templates for:
- **Bug Reports** — Structured format for reporting issues
- **Feature Requests** — Template for suggesting improvements

---

## Support Role Experience

This project demonstrates hands-on experience with:

- **Troubleshooting API integrations** (Stripe webhooks, Documenso, Supabase)
- **Debugging authentication issues** (Safari cookie policies, JWT tokens)
- **Resolving race conditions** (database-level locking for duplicate prevention)
- **Reading and analyzing logs** (Vercel functions, Sentry errors)
- **Writing documentation** (troubleshooting guides, internal playbooks)
- **Supporting real users** (18 active users, production environment)

---

Built by [Dylan DiRosa](https://github.com/dylandirosa98)
