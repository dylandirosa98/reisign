-- Fix the users RLS policy to avoid circular dependency
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view company teammates" ON public.users;

-- Create a simpler policy that allows users to see themselves
CREATE POLICY "Users can view own record" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Separate policy for viewing teammates (only if they have a company)
CREATE POLICY "Users can view company teammates" ON public.users
  FOR SELECT USING (
    company_id IS NOT NULL
    AND company_id = (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid())
  );

-- Also add insert policy for new users created by the trigger
CREATE POLICY "Allow insert for new users" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Companies policy also needs fixing - allow users without company yet to create one
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;

CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY "Users can create company" ON public.companies
  FOR INSERT WITH CHECK (true);  -- Anyone authenticated can create (will be linked to user after)
