# WholesaleSign - Development Reference

Contract management & e-signature platform for real estate wholesalers.

## Tech Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **E-Signature:** Documenso (self-hosted on Railway)
- **AI:** OpenAI GPT-4 (clause generation)
- **Payments:** Stripe

## Key Directories
```
app/(auth)/          # Login, signup, reset-password
app/(dashboard)/     # Main app routes (contracts, properties, settings)
app/admin/           # Admin template management
app/api/             # API routes
components/          # React components (ui/, contracts/, dashboard/, layout/)
lib/                 # Clients & utilities (supabase/, documenso/, stripe/, openai/)
types/               # TypeScript types (database.ts)
```

## Database Tables
- `companies` - Multi-tenant companies
- `users` - User profiles (extends auth.users)
- `templates` - Contract templates by state
- `properties` - Property addresses (auto-normalized)
- `contracts` - Main contract records
- `contract_status_history` - Status audit log
- `invites` - Team invitations

## Contract Statuses
`draft` → `sent` → `viewed` → `completed` (or `cancelled`)

## Key API Routes
- `POST /api/contracts` - Create contract
- `POST /api/contracts/[id]/send` - Send for signature
- `POST /api/ai/generate-clauses` - AI clause generation
- `POST /api/webhooks/documenso` - Status updates
- `POST /api/webhooks/stripe` - Billing events

## Commands
```bash
npm run dev              # Start dev server
npx shadcn@latest add    # Add UI components
npx supabase gen types typescript --project-id ID > types/database.ts
```

## Documentation
- Full PRD: `docs/PRD.md`
- Implementation guide: `docs/IMPLEMENTATION.md`

## Development Notes
- Server components by default, 'use client' only when needed
- Zod for input validation
- RLS policies enforce company isolation
- AI clauses are editable suggestions, not legal advice
