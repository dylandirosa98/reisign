# WholesaleSign - Claude Code Implementation Guide

## Project Overview

You are building a contract management and e-signature platform for real estate wholesalers. The platform allows users to create contracts from legally-approved templates, auto-generate clauses using AI based on property details, send contracts for e-signature, and track contract status.

## Tech Stack

```
Frontend:       Next.js 14 (App Router) + TypeScript
Styling:        Tailwind CSS
UI Components:  shadcn/ui
Database:       Supabase (PostgreSQL)
Authentication: Supabase Auth
File Storage:   Supabase Storage
E-Signature:    Documenso (self-hosted on Railway)
AI:             OpenAI API (GPT-4)
Payments:       Stripe
Hosting:        Vercel
```

## Project Structure

```
wholesalesign/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── contracts/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── properties/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── team/
│   │   │   │   └── page.tsx
│   │   │   └── billing/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── templates/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── contracts/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── send/
│   │   │           └── route.ts
│   │   ├── ai/
│   │   │   └── generate-clauses/
│   │   │       └── route.ts
│   │   ├── templates/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── team/
│   │   │   ├── route.ts
│   │   │   ├── invite/
│   │   │   │   └── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   └── webhooks/
│   │       ├── documenso/
│   │       │   └── route.ts
│   │       └── stripe/
│   │           └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                    # shadcn components
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   └── reset-form.tsx
│   ├── contracts/
│   │   ├── contract-list.tsx
│   │   ├── contract-card.tsx
│   │   ├── contract-form.tsx
│   │   ├── contract-preview.tsx
│   │   └── status-badge.tsx
│   ├── dashboard/
│   │   ├── stats-cards.tsx
│   │   ├── recent-contracts.tsx
│   │   └── filters.tsx
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── mobile-nav.tsx
│   └── shared/
│       ├── loading.tsx
│       ├── error-boundary.tsx
│       └── empty-state.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   ├── admin.ts           # Admin client
│   │   └── middleware.ts
│   ├── documenso/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── stripe/
│   │   ├── client.ts
│   │   └── config.ts
│   ├── openai/
│   │   └── client.ts
│   └── utils/
│       ├── cn.ts              # classnames helper
│       ├── format.ts          # formatters
│       └── validation.ts      # zod schemas
├── hooks/
│   ├── use-user.ts
│   ├── use-contracts.ts
│   └── use-company.ts
├── types/
│   ├── database.ts            # Supabase types
│   ├── contracts.ts
│   └── api.ts
├── middleware.ts
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Database Schema (Supabase)

Create these tables in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'starter',
  plan_limits JSONB DEFAULT '{"contracts_per_month": 25, "team_members": 1}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('manager', 'user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites table
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.users(id),
  role VARCHAR(50) DEFAULT 'user',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state VARCHAR(2) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  documenso_template_id VARCHAR(255),
  ai_clause_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  address VARCHAR(255) NOT NULL,
  address_normalized VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Contract details
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  ai_clauses JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Documenso integration
  documenso_document_id VARCHAR(255),

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'completed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Signed document
  signed_pdf_url VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract status history
CREATE TABLE public.contract_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES public.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_contracts_company ON public.contracts(company_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_property ON public.contracts(property_id);
CREATE INDEX idx_contracts_created_at ON public.contracts(created_at DESC);
CREATE INDEX idx_properties_company ON public.properties(company_id);
CREATE INDEX idx_properties_normalized ON public.properties(address_normalized);
CREATE INDEX idx_users_company ON public.users(company_id);
CREATE INDEX idx_templates_state ON public.templates(state);
CREATE INDEX idx_templates_active ON public.templates(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Users: Can see teammates in same company
CREATE POLICY "Users can view company teammates" ON public.users
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Contracts: Users can CRUD their company's contracts
CREATE POLICY "Users can view company contracts" ON public.contracts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create company contracts" ON public.contracts
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update company contracts" ON public.contracts
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own draft contracts" ON public.contracts
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND status = 'draft'
  );

-- Properties: Users can access company properties
CREATE POLICY "Users can view company properties" ON public.properties
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create company properties" ON public.properties
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Templates: All active templates visible to authenticated users
CREATE POLICY "Authenticated users can view active templates" ON public.templates
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Admin policy for templates (add admin check)
CREATE POLICY "Admins can manage templates" ON public.templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Contract status history
CREATE POLICY "Users can view company contract history" ON public.contract_status_history
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM public.contracts
      WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
  );

-- Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to normalize address
CREATE OR REPLACE FUNCTION normalize_address(addr VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(addr, '\s+', ' ', 'g'),
      '(street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|lane|ln\.|boulevard|blvd\.)',
      '',
      'gi'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-normalize address on properties
CREATE OR REPLACE FUNCTION set_normalized_address()
RETURNS TRIGGER AS $$
BEGIN
  NEW.address_normalized = normalize_address(NEW.address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_property_address
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION set_normalized_address();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Documenso
DOCUMENSO_API_URL=https://your-documenso-instance.railway.app/api/v1
DOCUMENSO_API_KEY=your_documenso_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Core Implementation Files

### 1. Supabase Client Setup

**lib/supabase/client.ts**
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**lib/supabase/server.ts**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle server component
          }
        },
      },
    }
  )
}
```

**lib/supabase/admin.ts**
```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

**middleware.ts**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged in users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 2. TypeScript Types

**types/database.ts**
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: string
          plan_limits: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: string
          plan_limits?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: string
          plan_limits?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string | null
          email: string
          full_name: string | null
          role: 'manager' | 'user' | 'admin'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          email: string
          full_name?: string | null
          role?: 'manager' | 'user' | 'admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          email?: string
          full_name?: string | null
          role?: 'manager' | 'user' | 'admin'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          state: string
          name: string
          description: string | null
          documenso_template_id: string | null
          ai_clause_config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          state: string
          name: string
          description?: string | null
          documenso_template_id?: string | null
          ai_clause_config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          state?: string
          name?: string
          description?: string | null
          documenso_template_id?: string | null
          ai_clause_config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          company_id: string
          address: string
          address_normalized: string | null
          city: string | null
          state: string | null
          zip: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          address: string
          address_normalized?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          address?: string
          address_normalized?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          created_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          company_id: string
          property_id: string | null
          template_id: string | null
          created_by: string | null
          buyer_name: string
          buyer_email: string
          seller_name: string
          seller_email: string
          price: number
          ai_clauses: Json
          custom_fields: Json
          documenso_document_id: string | null
          status: 'draft' | 'sent' | 'viewed' | 'completed' | 'cancelled'
          sent_at: string | null
          viewed_at: string | null
          completed_at: string | null
          signed_pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          property_id?: string | null
          template_id?: string | null
          created_by?: string | null
          buyer_name: string
          buyer_email: string
          seller_name: string
          seller_email: string
          price: number
          ai_clauses?: Json
          custom_fields?: Json
          documenso_document_id?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'completed' | 'cancelled'
          sent_at?: string | null
          viewed_at?: string | null
          completed_at?: string | null
          signed_pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          property_id?: string | null
          template_id?: string | null
          created_by?: string | null
          buyer_name?: string
          buyer_email?: string
          seller_name?: string
          seller_email?: string
          price?: number
          ai_clauses?: Json
          custom_fields?: Json
          documenso_document_id?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'completed' | 'cancelled'
          sent_at?: string | null
          viewed_at?: string | null
          completed_at?: string | null
          signed_pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contract_status_history: {
        Row: {
          id: string
          contract_id: string
          status: string
          changed_by: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          status: string
          changed_by?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          status?: string
          changed_by?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      invites: {
        Row: {
          id: string
          company_id: string
          email: string
          token: string
          invited_by: string | null
          role: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          email: string
          token: string
          invited_by?: string | null
          role?: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          token?: string
          invited_by?: string | null
          role?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Company = Database['public']['Tables']['companies']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type ContractStatus = Contract['status']
export type ContractStatusHistory = Database['public']['Tables']['contract_status_history']['Row']
export type Invite = Database['public']['Tables']['invites']['Row']
```

### 3. Documenso Client

**lib/documenso/client.ts**
```typescript
const DOCUMENSO_API_URL = process.env.DOCUMENSO_API_URL!
const DOCUMENSO_API_KEY = process.env.DOCUMENSO_API_KEY!

interface CreateDocumentParams {
  templateId: string
  recipients: {
    email: string
    name: string
    role: 'SIGNER' | 'VIEWER'
  }[]
  fieldValues: Record<string, string>
}

interface DocumensoDocument {
  id: string
  status: string
  recipients: {
    email: string
    status: string
  }[]
}

class DocumensoClient {
  private headers = {
    'Authorization': `Bearer ${DOCUMENSO_API_KEY}`,
    'Content-Type': 'application/json',
  }

  async createDocumentFromTemplate(params: CreateDocumentParams): Promise<DocumensoDocument> {
    const response = await fetch(`${DOCUMENSO_API_URL}/documents/create-from-template`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        templateId: params.templateId,
        recipients: params.recipients,
        fieldValues: params.fieldValues,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Documenso API error: ${error}`)
    }

    return response.json()
  }

  async sendDocument(documentId: string): Promise<void> {
    const response = await fetch(`${DOCUMENSO_API_URL}/documents/${documentId}/send`, {
      method: 'POST',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Documenso API error: ${error}`)
    }
  }

  async getDocument(documentId: string): Promise<DocumensoDocument> {
    const response = await fetch(`${DOCUMENSO_API_URL}/documents/${documentId}`, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Documenso API error: ${error}`)
    }

    return response.json()
  }

  async downloadSignedDocument(documentId: string): Promise<Buffer> {
    const response = await fetch(`${DOCUMENSO_API_URL}/documents/${documentId}/download`, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Documenso API error: ${error}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async listTemplates(): Promise<{ id: string; name: string }[]> {
    const response = await fetch(`${DOCUMENSO_API_URL}/templates`, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Documenso API error: ${error}`)
    }

    return response.json()
  }
}

export const documenso = new DocumensoClient()
```

### 4. OpenAI Client for AI Clauses

**lib/openai/client.ts**
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ClauseGenerationInput {
  address: string
  price: number
  buyerName: string
  sellerName: string
  state: string
  templateType: string
  additionalNotes?: string
}

interface GeneratedClauses {
  propertyDescription: string
  purchaseTerms: string
  closingTimeline: string
  additionalTerms?: string
}

export async function generateContractClauses(
  input: ClauseGenerationInput
): Promise<GeneratedClauses> {
  const prompt = `You are a real estate contract assistant specializing in wholesaling transactions.

Given the following property information:
- Address: ${input.address}
- Price: $${input.price.toLocaleString()}
- Buyer: ${input.buyerName}
- Seller: ${input.sellerName}
- State: ${input.state}
- Contract Type: ${input.templateType}
${input.additionalNotes ? `- Additional Notes: ${input.additionalNotes}` : ''}

Generate the following contract clauses in JSON format:

1. propertyDescription: A legal-style property description paragraph
2. purchaseTerms: Purchase price and earnest money terms (suggest 1% earnest money)
3. closingTimeline: Suggested closing timeline (typically 30-45 days for wholesaling)
4. additionalTerms: Any state-specific or deal-specific terms worth including

Keep language professional and legally neutral. Do not provide legal advice.
Output ONLY valid JSON, no markdown or explanations.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a real estate contract assistant. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  return JSON.parse(content) as GeneratedClauses
}
```

### 5. Stripe Client

**lib/stripe/client.ts**
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 4900, // $49 in cents
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    limits: {
      contracts_per_month: 25,
      team_members: 1,
    },
  },
  professional: {
    name: 'Professional',
    price: 9900, // $99 in cents
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    limits: {
      contracts_per_month: 100,
      team_members: 5,
    },
  },
  team: {
    name: 'Team',
    price: 19900, // $199 in cents
    priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    limits: {
      contracts_per_month: -1, // unlimited
      team_members: 15,
    },
  },
} as const

export type PlanType = keyof typeof PLANS
```

### 6. API Routes

**app/api/contracts/route.ts**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from('contracts')
    .select(`
      *,
      property:properties(address, city, state),
      template:templates(name)
    `, { count: 'exact' })
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`buyer_name.ilike.%${search}%,seller_name.ilike.%${search}%`)
  }

  const { data: contracts, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    contracts,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Get user's company
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  // Find or create property
  let propertyId: string | null = null

  const { data: existingProperty } = await supabase
    .from('properties')
    .select('id')
    .eq('company_id', userData.company_id)
    .eq('address', body.address)
    .single()

  if (existingProperty) {
    propertyId = existingProperty.id
  } else {
    const { data: newProperty, error: propertyError } = await supabase
      .from('properties')
      .insert({
        company_id: userData.company_id,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
      })
      .select('id')
      .single()

    if (propertyError) {
      return NextResponse.json({ error: propertyError.message }, { status: 500 })
    }
    propertyId = newProperty.id
  }

  // Create contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      company_id: userData.company_id,
      property_id: propertyId,
      template_id: body.templateId,
      created_by: user.id,
      buyer_name: body.buyerName,
      buyer_email: body.buyerEmail,
      seller_name: body.sellerName,
      seller_email: body.sellerEmail,
      price: body.price,
      ai_clauses: body.aiClauses || {},
      status: 'draft',
    })
    .select()
    .single()

  if (contractError) {
    return NextResponse.json({ error: contractError.message }, { status: 500 })
  }

  return NextResponse.json({ contract }, { status: 201 })
}
```

**app/api/contracts/[id]/send/route.ts**
```typescript
import { createClient } from '@/lib/supabase/server'
import { documenso } from '@/lib/documenso/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get contract with template
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select(`
      *,
      template:templates(documenso_template_id),
      property:properties(address, city, state, zip)
    `)
    .eq('id', params.id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.status !== 'draft') {
    return NextResponse.json({ error: 'Contract already sent' }, { status: 400 })
  }

  if (!contract.template?.documenso_template_id) {
    return NextResponse.json({ error: 'Template not configured' }, { status: 400 })
  }

  try {
    // Create document in Documenso
    const document = await documenso.createDocumentFromTemplate({
      templateId: contract.template.documenso_template_id,
      recipients: [
        {
          email: contract.buyer_email,
          name: contract.buyer_name,
          role: 'SIGNER',
        },
        {
          email: contract.seller_email,
          name: contract.seller_name,
          role: 'SIGNER',
        },
      ],
      fieldValues: {
        buyerName: contract.buyer_name,
        sellerName: contract.seller_name,
        propertyAddress: contract.property?.address || '',
        purchasePrice: contract.price.toString(),
        ...(contract.ai_clauses as Record<string, string>),
      },
    })

    // Send the document
    await documenso.sendDocument(document.id)

    // Update contract status
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        documenso_document_id: document.id,
      })
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    // Log status change
    await supabase.from('contract_status_history').insert({
      contract_id: params.id,
      status: 'sent',
      changed_by: user.id,
    })

    return NextResponse.json({ success: true, documentId: document.id })
  } catch (error) {
    console.error('Send contract error:', error)
    return NextResponse.json(
      { error: 'Failed to send contract' },
      { status: 500 }
    )
  }
}
```

**app/api/ai/generate-clauses/route.ts**
```typescript
import { createClient } from '@/lib/supabase/server'
import { generateContractClauses } from '@/lib/openai/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Validate required fields
  const required = ['address', 'price', 'buyerName', 'sellerName', 'state', 'templateType']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  try {
    const clauses = await generateContractClauses({
      address: body.address,
      price: body.price,
      buyerName: body.buyerName,
      sellerName: body.sellerName,
      state: body.state,
      templateType: body.templateType,
      additionalNotes: body.additionalNotes,
    })

    return NextResponse.json({ clauses })
  } catch (error) {
    console.error('AI clause generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate clauses' },
      { status: 500 }
    )
  }
}
```

**app/api/webhooks/documenso/route.ts**
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = createAdminClient()

  const { event, data } = body

  // Find contract by documenso_document_id
  const { data: contract, error: findError } = await supabase
    .from('contracts')
    .select('id, status')
    .eq('documenso_document_id', data.documentId)
    .single()

  if (findError || !contract) {
    console.error('Contract not found for webhook:', data.documentId)
    return NextResponse.json({ received: true })
  }

  let newStatus: string | null = null
  let updateFields: Record<string, any> = {}

  switch (event) {
    case 'document.viewed':
      if (contract.status === 'sent') {
        newStatus = 'viewed'
        updateFields = { status: 'viewed', viewed_at: new Date().toISOString() }
      }
      break

    case 'document.completed':
      newStatus = 'completed'
      updateFields = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        signed_pdf_url: data.downloadUrl || null,
      }
      break

    default:
      console.log('Unhandled webhook event:', event)
  }

  if (newStatus && Object.keys(updateFields).length > 0) {
    // Update contract
    await supabase
      .from('contracts')
      .update(updateFields)
      .eq('id', contract.id)

    // Log status change
    await supabase.from('contract_status_history').insert({
      contract_id: contract.id,
      status: newStatus,
      metadata: { webhook_event: event },
    })
  }

  return NextResponse.json({ received: true })
}
```

**app/api/webhooks/stripe/route.ts**
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      const companyId = session.metadata?.company_id

      if (companyId) {
        await supabase
          .from('companies')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: session.metadata?.plan || 'starter',
          })
          .eq('id', companyId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (company) {
        await supabase
          .from('companies')
          .update({
            stripe_subscription_id: subscription.id,
          })
          .eq('id', company.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      await supabase
        .from('companies')
        .update({
          stripe_subscription_id: null,
          plan: 'starter',
        })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

---

## Key Components to Build

### Contract List Component
```typescript
// components/contracts/contract-list.tsx
'use client'

import { useContracts } from '@/hooks/use-contracts'
import { ContractCard } from './contract-card'
import { ContractFilters } from './contract-filters'
import { Skeleton } from '@/components/ui/skeleton'

export function ContractList() {
  const { contracts, isLoading, filters, setFilters, pagination } = useContracts()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ContractFilters filters={filters} onChange={setFilters} />

      <div className="space-y-4">
        {contracts.map((contract) => (
          <ContractCard key={contract.id} contract={contract} />
        ))}
      </div>

      {contracts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No contracts found
        </div>
      )}

      {/* Pagination */}
    </div>
  )
}
```

### Status Badge Component
```typescript
// components/contracts/status-badge.tsx
import { Badge } from '@/components/ui/badge'
import { ContractStatus } from '@/types/database'

const statusConfig: Record<ContractStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  sent: { label: 'Sent', variant: 'secondary' },
  viewed: { label: 'Viewed', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function StatusBadge({ status }: { status: ContractStatus }) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
```

---

## Build Order

1. **Week 1: Foundation**
   - [ ] Initialize Next.js project with TypeScript
   - [ ] Set up Tailwind and shadcn/ui
   - [ ] Configure Supabase (create tables, RLS policies)
   - [ ] Implement authentication (signup, login, middleware)
   - [ ] Create company onboarding flow

2. **Week 2: Core E-Sign**
   - [ ] Self-host Documenso on Railway
   - [ ] Create Documenso client library
   - [ ] Build template management (admin)
   - [ ] Implement contract creation form
   - [ ] Integrate AI clause generation

3. **Week 3: Send & Track**
   - [ ] Build send contract flow
   - [ ] Set up Documenso webhooks
   - [ ] Implement status tracking
   - [ ] Create contract detail page
   - [ ] Add status history

4. **Week 4: Dashboard**
   - [ ] Build main dashboard UI
   - [ ] Implement filters and search
   - [ ] Create property grouping
   - [ ] Add pagination

5. **Week 5: Billing & Team**
   - [ ] Integrate Stripe Checkout
   - [ ] Set up subscription plans
   - [ ] Build team invite system
   - [ ] Implement usage limits

6. **Week 6: Polish**
   - [ ] Error handling and edge cases
   - [ ] Loading states and skeletons
   - [ ] Mobile responsiveness
   - [ ] Testing and bug fixes

---

## Commands Reference

```bash
# Create Next.js project
npx create-next-app@latest wholesalesign --typescript --tailwind --eslint --app --src-dir=false

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install openai
npm install stripe @stripe/stripe-js
npm install zod react-hook-form @hookform/resolvers
npm install date-fns
npm install lucide-react

# Install shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label select badge table dialog dropdown-menu form textarea tabs skeleton alert toast

# Generate Supabase types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

---

## Notes for Development

- Always use TypeScript with strict mode
- Use server components by default, client components only when needed
- Follow Next.js 14 App Router conventions
- Use Zod for all input validation
- Handle errors gracefully with proper error boundaries
- Implement loading states for all async operations
- Use React Server Components for data fetching where possible
- Keep API routes thin - business logic in separate modules
