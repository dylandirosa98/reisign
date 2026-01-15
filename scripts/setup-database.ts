import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
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
CREATE TABLE IF NOT EXISTS public.users (
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
CREATE TABLE IF NOT EXISTS public.invites (
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
CREATE TABLE IF NOT EXISTS public.templates (
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
CREATE TABLE IF NOT EXISTS public.properties (
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
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  ai_clauses JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  documenso_document_id VARCHAR(255),

  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'completed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  signed_pdf_url VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract status history
CREATE TABLE IF NOT EXISTS public.contract_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES public.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`

const indexes = `
-- Create indexes (using IF NOT EXISTS pattern with DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contracts_company') THEN
    CREATE INDEX idx_contracts_company ON public.contracts(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contracts_status') THEN
    CREATE INDEX idx_contracts_status ON public.contracts(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contracts_property') THEN
    CREATE INDEX idx_contracts_property ON public.contracts(property_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_contracts_created_at') THEN
    CREATE INDEX idx_contracts_created_at ON public.contracts(created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_company') THEN
    CREATE INDEX idx_properties_company ON public.properties(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_normalized') THEN
    CREATE INDEX idx_properties_normalized ON public.properties(address_normalized);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_company') THEN
    CREATE INDEX idx_users_company ON public.users(company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_templates_state') THEN
    CREATE INDEX idx_templates_state ON public.templates(state);
  END IF;
END $$;
`

const rls = `
-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_status_history ENABLE ROW LEVEL SECURITY;
`

const policies = `
-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can view company teammates" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view company contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can create company contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update company contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete own draft contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view company properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create company properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can view active templates" ON public.templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.templates;
DROP POLICY IF EXISTS "Users can view company contract history" ON public.contract_status_history;

-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- Users: Can see teammates in same company
CREATE POLICY "Users can view company teammates" ON public.users
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    OR id = auth.uid()
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

-- Admin policy for templates
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
`

const functions = `
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist and recreate
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;

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
      REGEXP_REPLACE(addr, '\\s+', ' ', 'g'),
      '(street|st\\.|avenue|ave\\.|road|rd\\.|drive|dr\\.|lane|ln\\.|boulevard|blvd\\.)',
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

DROP TRIGGER IF EXISTS normalize_property_address ON public.properties;
CREATE TRIGGER normalize_property_address
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION set_normalized_address();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Trigger for new auth users (check if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`

async function runSQL(sql: string, name: string) {
  console.log(`Running: ${name}...`)
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle()

  // If rpc doesn't exist, try direct query via REST
  if (error?.message?.includes('function') || error?.message?.includes('exec_sql')) {
    // Use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    })

    if (!response.ok) {
      // Fall back to running via postgres connection string approach
      console.log(`Note: ${name} - will need to run manually in Supabase SQL editor`)
      return false
    }
  } else if (error) {
    console.error(`Error in ${name}:`, error.message)
    return false
  }

  console.log(`✓ ${name} completed`)
  return true
}

async function main() {
  console.log('Setting up database...\n')
  console.log('Supabase URL:', supabaseUrl)

  // For Supabase, we need to run SQL directly via their SQL editor or use pg directly
  // The REST API doesn't support arbitrary SQL execution
  // Let's output the SQL for manual execution

  console.log('\n' + '='.repeat(60))
  console.log('Please run the following SQL in your Supabase SQL Editor:')
  console.log('Dashboard -> SQL Editor -> New Query')
  console.log('='.repeat(60) + '\n')

  const fullSQL = [schema, indexes, rls, policies, functions].join('\n\n')
  console.log(fullSQL)

  console.log('\n' + '='.repeat(60))
  console.log('Copy everything above and paste into Supabase SQL Editor')
  console.log('='.repeat(60))
}

main().catch(console.error)
