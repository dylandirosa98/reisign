# Product Requirements Document (PRD)
# WholesaleSign - Contract Management Platform for Real Estate Wholesalers

## Document Information
- **Version:** 1.0
- **Last Updated:** January 2025
- **Status:** Draft
- **Authors:** [Your Name]

---

## 1. Executive Summary

### 1.1 Product Overview
WholesaleSign is a specialized contract management and e-signature platform built exclusively for real estate wholesalers. The platform streamlines the contract creation, sending, tracking, and signing process by combining legally-approved state-specific templates with AI-powered clause generation.

### 1.2 Problem Statement
Real estate wholesalers currently struggle with:
- Managing contracts across multiple properties and deals
- Ensuring legal compliance across different states
- Tracking contract status and signer engagement
- Organizing documents by property and deal stage
- Using generic e-signature tools not built for their workflow

### 1.3 Solution
A purpose-built contract platform that:
- Provides legally-vetted templates for all 50 states
- Auto-generates custom clauses using AI based on property details
- Tracks contract lifecycle (Draft → Sent → Viewed → Completed)
- Organizes contracts by property address automatically
- Integrates with GoHighLevel CRM (future)

### 1.4 Target Users
- Real estate wholesalers (primary)
- Wholesaling companies/teams
- Students of wholesaling coaching programs

### 1.5 Business Model
- SaaS subscription (monthly/annual)
- Tiered pricing based on contract volume and team size

---

## 2. Goals and Success Metrics

### 2.1 Business Goals
| Goal | Target | Timeline |
|------|--------|----------|
| Launch MVP | Feature-complete | 8 weeks |
| Initial users | 50 paying customers | 3 months post-launch |
| MRR | $5,000 | 6 months post-launch |
| Churn rate | < 5% monthly | Ongoing |

### 2.2 User Goals
- Reduce time to create and send contracts by 70%
- Ensure legal compliance without hiring lawyers for each deal
- Never lose track of a contract's status
- Easily find all contracts related to a property

### 2.3 Key Performance Indicators (KPIs)
- Time to send first contract (onboarding success)
- Contracts created per user per month
- Contract completion rate
- User retention at 30/60/90 days
- NPS score

---

## 3. User Personas

### 3.1 Persona 1: Solo Wholesaler - "Mike"
- **Demographics:** 28 years old, 2 years wholesaling experience
- **Goals:** Scale from 2-3 deals/month to 8-10 deals/month
- **Pain Points:**
  - Spends 30+ minutes per contract on paperwork
  - Has lost deals due to slow contract turnaround
  - Worries about legal compliance in new markets
- **Tech Comfort:** High - uses CRM, marketing tools
- **Willingness to Pay:** $50-100/month

### 3.2 Persona 2: Team Lead - "Sarah"
- **Demographics:** 35 years old, runs 5-person wholesaling team
- **Goals:** Standardize contract process across team
- **Pain Points:**
  - No visibility into team's contract pipeline
  - Inconsistent contract quality from team members
  - Difficult to train new team members on contracts
- **Tech Comfort:** Medium-high
- **Willingness to Pay:** $150-300/month

### 3.3 Persona 3: Coaching Student - "James"
- **Demographics:** 24 years old, just finished wholesaling course
- **Goals:** Close first deal, do everything "by the book"
- **Pain Points:**
  - Doesn't know what contracts he needs
  - Scared of legal mistakes
  - Limited budget
- **Tech Comfort:** High
- **Willingness to Pay:** $30-50/month

---

## 4. Feature Requirements

### 4.1 Feature Priority Matrix

| Feature | Priority | MVP | Effort |
|---------|----------|-----|--------|
| User authentication | P0 | ✓ | Medium |
| Company/team setup | P0 | ✓ | Medium |
| Template management (admin) | P0 | ✓ | Medium |
| Contract creation flow | P0 | ✓ | High |
| AI clause generation | P0 | ✓ | Medium |
| E-signature (Documenso) | P0 | ✓ | High |
| Contract status tracking | P0 | ✓ | Medium |
| Dashboard with filters | P0 | ✓ | Medium |
| Property-based organization | P0 | ✓ | Low |
| Email notifications | P1 | ✓ | Low |
| Stripe billing | P0 | ✓ | Medium |
| Team member management | P1 | ✓ | Medium |
| GHL integration | P2 | ✗ | High |
| Advanced analytics | P3 | ✗ | Medium |

### 4.2 Detailed Feature Specifications

---

#### 4.2.1 Authentication & User Management

**Description:** Secure user authentication with company-based multi-tenancy.

**User Stories:**
- As a new user, I can sign up with email/password so I can access the platform
- As a user, I can log in securely so my data is protected
- As a user, I can reset my password if I forget it
- As a manager, I can invite team members to my company
- As a manager, I can remove team members from my company

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-01 | Users can sign up with email and password | P0 |
| AUTH-02 | Email verification required before access | P0 |
| AUTH-03 | Users can log in with email/password | P0 |
| AUTH-04 | Password reset via email link | P0 |
| AUTH-05 | Session management with secure tokens | P0 |
| AUTH-06 | Users belong to exactly one company | P0 |
| AUTH-07 | First user of company becomes manager | P0 |
| AUTH-08 | Managers can invite users via email | P1 |
| AUTH-09 | Invited users set password on first login | P1 |
| AUTH-10 | Managers can deactivate team members | P1 |

**User Roles:**

| Role | Permissions |
|------|-------------|
| Manager | Full access + team management + billing |
| User | Create/edit/send contracts, view dashboard |

**Acceptance Criteria:**
- [ ] User can complete signup in under 2 minutes
- [ ] Email verification sent within 30 seconds
- [ ] Password must be minimum 8 characters
- [ ] Failed login attempts limited to 5 before lockout
- [ ] Session expires after 7 days of inactivity

---

#### 4.2.2 Company Setup & Onboarding

**Description:** New user onboarding flow including company creation and initial setup.

**User Stories:**
- As a new user, I can create my company profile so my team has a workspace
- As a new user, I can select my subscription plan so I can start using the platform
- As a new user, I am guided through setup so I understand how to use the product

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| COMP-01 | User enters company name after signup | P0 |
| COMP-02 | User selects subscription plan | P0 |
| COMP-03 | Stripe checkout integration for payment | P0 |
| COMP-04 | Company created after successful payment | P0 |
| COMP-05 | Welcome tutorial/guide shown on first login | P1 |
| COMP-06 | Company settings page for manager | P1 |

**Onboarding Flow:**
```
1. Sign up (email/password)
2. Verify email (click link)
3. Enter company name
4. Select plan
5. Enter payment (Stripe)
6. Redirect to dashboard
7. Show welcome guide (optional dismissible)
```

**Acceptance Criteria:**
- [ ] Onboarding completed in under 5 minutes
- [ ] User can start creating contracts immediately after payment
- [ ] Clear error messages if payment fails

---

#### 4.2.3 Template Management (Admin)

**Description:** Admin interface for managing legally-approved contract templates by state.

**User Stories:**
- As an admin, I can upload/edit templates for each state so users have legal contracts
- As an admin, I can activate/deactivate templates so I control what's available
- As an admin, I can preview templates before publishing

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| TMPL-01 | Admin can view all templates in list | P0 |
| TMPL-02 | Templates organized by state | P0 |
| TMPL-03 | Admin can create new template | P0 |
| TMPL-04 | Admin can edit existing template | P0 |
| TMPL-05 | Admin can activate/deactivate template | P0 |
| TMPL-06 | Templates linked to Documenso template IDs | P0 |
| TMPL-07 | Admin can preview template | P1 |
| TMPL-08 | Template versioning (track changes) | P2 |

**Template Data Model:**
```
Template:
  - id: UUID
  - state: String (2-letter code)
  - name: String
  - description: String
  - documenso_template_id: String
  - ai_clause_fields: JSON (fields AI can fill)
  - is_active: Boolean
  - created_at: Timestamp
  - updated_at: Timestamp
```

**Acceptance Criteria:**
- [ ] Admin can add a new template in under 5 minutes
- [ ] Deactivated templates not shown to users
- [ ] All 50 states supported

---

#### 4.2.4 Contract Creation Flow

**Description:** Core workflow for creating a new contract from property information.

**User Stories:**
- As a user, I can create a new contract by entering property details
- As a user, I can select the appropriate template for my state
- As a user, I can preview the contract before sending
- As a user, I can save a contract as draft to finish later

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| CONT-01 | User clicks "New Contract" from dashboard | P0 |
| CONT-02 | User enters property address | P0 |
| CONT-03 | User enters property price | P0 |
| CONT-04 | User enters buyer name and email | P0 |
| CONT-05 | User enters seller name and email | P0 |
| CONT-06 | User selects state (auto-suggest from address) | P0 |
| CONT-07 | System shows available templates for state | P0 |
| CONT-08 | User selects template | P0 |
| CONT-09 | AI generates custom clauses based on inputs | P0 |
| CONT-10 | User can preview full contract | P0 |
| CONT-11 | User can edit AI-generated clauses | P1 |
| CONT-12 | User can save as draft | P0 |
| CONT-13 | User can send immediately | P0 |
| CONT-14 | System validates all required fields | P0 |
| CONT-15 | Address auto-complete (Google Places API) | P2 |

**Contract Creation UI Flow:**
```
Step 1: Property Information
┌─────────────────────────────────────────┐
│  New Contract                           │
├─────────────────────────────────────────┤
│  Property Address: [__________________] │
│  Price:            [$_________________] │
│  State:            [Texas ▼]            │
└─────────────────────────────────────────┘

Step 2: Parties
┌─────────────────────────────────────────┐
│  Buyer                                  │
│  Name:  [__________________]            │
│  Email: [__________________]            │
│                                         │
│  Seller                                 │
│  Name:  [__________________]            │
│  Email: [__________________]            │
└─────────────────────────────────────────┘

Step 3: Template Selection
┌─────────────────────────────────────────┐
│  Select Template (Texas)                │
│  ○ Purchase Agreement                   │
│  ○ Assignment Contract                  │
│  ○ Addendum                             │
└─────────────────────────────────────────┘

Step 4: AI Clause Review
┌─────────────────────────────────────────┐
│  Generated Clauses                      │
│  ┌───────────────────────────────────┐  │
│  │ Based on your property at         │  │
│  │ 123 Main St for $150,000...       │  │
│  │ [editable text area]              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

Step 5: Preview & Send
┌─────────────────────────────────────────┐
│  [Preview PDF]                          │
│                                         │
│  [Save Draft]  [Send Contract]          │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Contract created in under 3 minutes
- [ ] All required fields validated before save/send
- [ ] AI clauses generated in under 10 seconds
- [ ] Preview accurately reflects final document

---

#### 4.2.5 AI Clause Generation

**Description:** AI-powered generation of custom contract clauses based on property and deal information.

**User Stories:**
- As a user, I want relevant clauses auto-generated so I don't miss important terms
- As a user, I can edit AI suggestions so I have final control
- As a user, I trust the AI stays within legal template boundaries

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| AI-01 | AI generates clauses from property info | P0 |
| AI-02 | AI only fills designated fields (not full contract) | P0 |
| AI-03 | AI uses OpenAI or Claude API | P0 |
| AI-04 | AI prompt includes context about wholesaling | P0 |
| AI-05 | Generated text is editable by user | P0 |
| AI-06 | AI errors handled gracefully (fallback to manual) | P0 |
| AI-07 | AI response cached to reduce API costs | P2 |

**AI Input Fields:**
```
- Property address
- Property price
- Buyer name
- Seller name
- State
- Template type
- Any additional notes from user
```

**AI Output:**
```
- Property description clause
- Consideration clause (price terms)
- Closing date suggestion
- Any state-specific required language
```

**AI Prompt Template:**
```
You are a real estate contract assistant specializing in wholesaling transactions.

Given the following property information:
- Address: {address}
- Price: {price}
- Buyer: {buyer_name}
- Seller: {seller_name}
- State: {state}

Generate the following contract clauses:
1. Property description (legal description style)
2. Purchase price and earnest money terms
3. Suggested closing timeline

Keep language professional and legally neutral.
Do not provide legal advice.
Output only the clause text, no explanations.
```

**Acceptance Criteria:**
- [ ] AI response generated in under 10 seconds
- [ ] AI never modifies legally-approved template language
- [ ] AI clearly marks generated sections as editable
- [ ] System works if AI fails (manual entry fallback)

---

#### 4.2.6 E-Signature Integration (Documenso)

**Description:** Integration with self-hosted Documenso for document signing workflow.

**User Stories:**
- As a user, I can send contracts for signature via email
- As a signer, I can sign documents easily from email link
- As a user, I can track whether documents were viewed/signed

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ESIG-01 | System creates document in Documenso from template | P0 |
| ESIG-02 | System populates document with contract data | P0 |
| ESIG-03 | System sends signing request via email | P0 |
| ESIG-04 | Signer receives email with signing link | P0 |
| ESIG-05 | Signer can view and sign on any device | P0 |
| ESIG-06 | System receives webhook on document viewed | P0 |
| ESIG-07 | System receives webhook on document signed | P0 |
| ESIG-08 | Completed PDF stored in system | P0 |
| ESIG-09 | Multiple signers supported (buyer + seller) | P0 |
| ESIG-10 | Signing order enforced if needed | P2 |

**Documenso Integration Flow:**
```
1. User clicks "Send Contract"
2. System calls Documenso API:
   - Create document from template
   - Fill in field values
   - Add recipients (signers)
   - Send signing request
3. Documenso sends email to signers
4. Signer clicks link, views document
5. Documenso sends "viewed" webhook → Update status
6. Signer signs document
7. Documenso sends "completed" webhook → Update status
8. System downloads signed PDF
```

**Webhook Events to Handle:**
| Event | Action |
|-------|--------|
| document.sent | Update status to "Sent" |
| document.viewed | Update status to "Viewed", record timestamp |
| document.signed | Update status to "Completed", download PDF |

**Acceptance Criteria:**
- [ ] Email delivered within 1 minute of sending
- [ ] Status updates reflect in dashboard within 30 seconds
- [ ] Signed PDF accessible from contract detail page
- [ ] Signing works on mobile devices

---

#### 4.2.7 Contract Status Tracking

**Description:** Track and display contract lifecycle status.

**User Stories:**
- As a user, I can see the current status of all my contracts
- As a user, I know when a contract was viewed so I can follow up
- As a user, I can filter contracts by status

**Contract Statuses:**

| Status | Description | Trigger |
|--------|-------------|---------|
| Draft | Created but not sent | User saves without sending |
| Sent | Sent to signer(s) | User clicks send |
| Viewed | Opened by at least one signer | Documenso webhook |
| Completed | All parties signed | Documenso webhook |

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| STAT-01 | Contract status visible on dashboard | P0 |
| STAT-02 | Status auto-updates from webhooks | P0 |
| STAT-03 | Timestamp recorded for each status change | P0 |
| STAT-04 | Filter contracts by status | P0 |
| STAT-05 | Visual status indicators (colors/icons) | P0 |
| STAT-06 | Status history viewable on contract detail | P1 |

**Status Display:**
```
● Completed (green)
● Viewed (blue)
○ Sent (yellow)
○ Draft (gray)
```

**Acceptance Criteria:**
- [ ] Status updates within 30 seconds of webhook
- [ ] Status clearly visible at glance on dashboard
- [ ] Filtering by status works correctly

---

#### 4.2.8 Dashboard & Contract Management

**Description:** Main interface for viewing and managing all contracts.

**User Stories:**
- As a user, I can see all my contracts in one place
- As a user, I can quickly find contracts using filters
- As a user, I can search for contracts by address or name
- As a user, I can sort contracts by date or status

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| DASH-01 | Display all contracts for user's company | P0 |
| DASH-02 | Show: address, buyer, status, date | P0 |
| DASH-03 | Filter by status | P0 |
| DASH-04 | Filter by date range | P0 |
| DASH-05 | Search by address | P0 |
| DASH-06 | Search by buyer/seller name | P1 |
| DASH-07 | Sort by date (newest/oldest) | P0 |
| DASH-08 | Sort by status | P1 |
| DASH-09 | Pagination (20 per page) | P0 |
| DASH-10 | Quick actions (view, resend, delete draft) | P1 |
| DASH-11 | "New Contract" button prominent | P0 |

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  WholesaleSign                    [Company Name]  [User Menu ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contracts                               [+ New Contract]       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Filters: [All Status ▼] [Date Range] [Search...    🔍]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Address          │ Buyer      │ Status    │ Created     │   │
│  │─────────────────────────────────────────────────────────│   │
│  │ 123 Main St      │ John Doe   │ ● Complete│ Jan 15, 2025│   │
│  │ 456 Oak Ave      │ Jane Smith │ ● Viewed  │ Jan 14, 2025│   │
│  │ 789 Pine Rd      │ Bob Wilson │ ○ Sent    │ Jan 13, 2025│   │
│  │ 321 Elm St       │ Sue Brown  │ ○ Draft   │ Jan 12, 2025│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 1-20 of 45 contracts          [< Prev] [Next >]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Dashboard loads in under 2 seconds
- [ ] Filters apply instantly
- [ ] Search returns results as user types (debounced)
- [ ] Mobile responsive

---

#### 4.2.9 Property-Based Organization

**Description:** Automatic organization of contracts by property address.

**User Stories:**
- As a user, I can see all contracts for a single property grouped together
- As a user, contracts are auto-organized so I don't have to manually folder them
- As a user, I can easily find all documents related to a deal

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| PROP-01 | Contracts grouped by property address | P0 |
| PROP-02 | Click address to see all related contracts | P0 |
| PROP-03 | Property "folder" created automatically on first contract | P0 |
| PROP-04 | Address normalization (123 Main St = 123 Main Street) | P1 |
| PROP-05 | Property list view available | P1 |
| PROP-06 | Property shows count of contracts | P1 |

**Property View Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                            │
│                                                                 │
│  Property: 123 Main St, Dallas, TX 75201                       │
│                                                                 │
│  Contracts (3)                          [+ New Contract]        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Purchase Agreement    │ ● Completed │ Jan 10, 2025      │   │
│  │ Assignment Contract   │ ● Viewed    │ Jan 12, 2025      │   │
│  │ Addendum             │ ○ Draft     │ Jan 14, 2025      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Same address always groups together
- [ ] Address matching handles minor variations
- [ ] Easy navigation between property and dashboard views

---

#### 4.2.10 Stripe Billing Integration

**Description:** Subscription billing using Stripe.

**User Stories:**
- As a new user, I can select and pay for a subscription plan
- As a user, I can view and manage my subscription
- As a user, I can upgrade/downgrade my plan
- As a manager, I can update payment method

**Subscription Tiers:**

| Plan | Price | Contracts/mo | Team Members |
|------|-------|--------------|--------------|
| Starter | $49/mo | 25 | 1 |
| Professional | $99/mo | 100 | 5 |
| Team | $199/mo | Unlimited | 15 |
| Enterprise | Custom | Unlimited | Unlimited |

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| BILL-01 | Stripe Checkout for initial signup | P0 |
| BILL-02 | Subscription status stored in database | P0 |
| BILL-03 | Webhook handles payment success/failure | P0 |
| BILL-04 | User can view current plan | P0 |
| BILL-05 | User can access Stripe Customer Portal | P1 |
| BILL-06 | Usage limits enforced based on plan | P1 |
| BILL-07 | Warning when approaching limits | P2 |
| BILL-08 | Grace period for failed payments | P1 |

**Acceptance Criteria:**
- [ ] Payment processed securely via Stripe
- [ ] Subscription active immediately after payment
- [ ] Failed payment notifies user via email
- [ ] User cannot create contracts beyond plan limit

---

#### 4.2.11 Team Member Management

**Description:** Allow managers to invite and manage team members.

**User Stories:**
- As a manager, I can invite team members via email
- As a manager, I can see all team members
- As a manager, I can remove team members
- As an invited user, I can join an existing company

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| TEAM-01 | Manager can access team settings page | P1 |
| TEAM-02 | Manager can invite user by email | P1 |
| TEAM-03 | System sends invite email with link | P1 |
| TEAM-04 | Invited user creates password and joins | P1 |
| TEAM-05 | Manager can view all team members | P1 |
| TEAM-06 | Manager can deactivate team member | P1 |
| TEAM-07 | Deactivated users cannot log in | P1 |
| TEAM-08 | Team member count enforced by plan | P1 |

**Team Settings Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Team Settings                                                  │
│                                                                 │
│  Team Members (3 of 5)                  [+ Invite Member]       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Name           │ Email              │ Role    │ Actions  │   │
│  │────────────────────────────────────────────────────────│   │
│  │ John Doe       │ john@company.com   │ Manager │          │   │
│  │ Jane Smith     │ jane@company.com   │ User    │ [Remove] │   │
│  │ Bob Wilson     │ bob@company.com    │ User    │ [Remove] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Pending Invites                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ sue@company.com │ Invited Jan 14 │ [Resend] [Cancel]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Invite email delivered within 1 minute
- [ ] Invite link expires after 7 days
- [ ] Removed users lose access immediately
- [ ] Cannot invite beyond plan limit

---

## 5. Technical Architecture

### 5.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    Next.js (Vercel)                            │
│         ┌─────────────────────────────────────────┐            │
│         │  Pages: Auth, Dashboard, Contracts,     │            │
│         │         Settings, Admin                 │            │
│         └─────────────────────────────────────────┘            │
└─────────────────────────────────┬───────────────────────────────┘
                              │ API Routes
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                  Next.js API Routes                            │
│         ┌─────────────────────────────────────────┐            │
│         │  /api/auth, /api/contracts,             │            │
│         │  /api/templates, /api/webhooks          │            │
│         └─────────────────────────────────────────┘            │
└───────┬─────────────────┬─────────────────┬─────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   Supabase    │ │   Documenso   │ │   External    │
│               │ │  (Railway)    │ │   Services    │
│ - Auth        │ │               │ │               │
│ - Database    │ │ - Templates   │ │ - OpenAI      │
│ - Storage     │ │ - E-sign      │ │ - Stripe      │
│               │ │ - Webhooks    │ │               │
└───────────────┘ └───────────────┘ └───────────────┘
```

### 5.2 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Frontend | Next.js 14 (App Router) | Modern React, SSR, API routes |
| Styling | Tailwind CSS | Rapid development |
| UI Components | shadcn/ui | Consistent, accessible |
| Backend | Next.js API Routes | Single codebase |
| Database | Supabase (PostgreSQL) | Managed, real-time, auth |
| Authentication | Supabase Auth | Integrated, secure |
| File Storage | Supabase Storage | Integrated with auth |
| E-Signature | Documenso (self-hosted) | Open source, full control |
| AI | OpenAI API (GPT-4) | Best quality for text |
| Payments | Stripe | Industry standard |
| Hosting (App) | Vercel | Optimized for Next.js |
| Hosting (Documenso) | Railway | Easy Docker hosting |
| Email | Resend or Supabase | Transactional emails |

### 5.3 Database Schema

```sql
-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'starter',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'manager' or 'user'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invites
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state VARCHAR(2) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  documenso_template_id VARCHAR(255),
  ai_clause_config JSONB, -- Fields AI can fill
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  address VARCHAR(255) NOT NULL,
  address_normalized VARCHAR(255), -- For matching
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  property_id UUID REFERENCES properties(id),
  template_id UUID REFERENCES templates(id),
  created_by UUID REFERENCES users(id),

  -- Contract details
  buyer_name VARCHAR(255),
  buyer_email VARCHAR(255),
  seller_name VARCHAR(255),
  seller_email VARCHAR(255),
  price DECIMAL(12,2),
  ai_clauses JSONB, -- Generated clause text

  -- Documenso integration
  documenso_document_id VARCHAR(255),

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, completed
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Signed document
  signed_pdf_url VARCHAR(500),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contract Status History
CREATE TABLE contract_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id),
  status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB -- Additional event data
);

-- Indexes
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_property ON contracts(property_id);
CREATE INDEX idx_properties_company ON properties(company_id);
CREATE INDEX idx_properties_address ON properties(address_normalized);
CREATE INDEX idx_users_company ON users(company_id);
```

### 5.4 API Endpoints

**Authentication**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| POST | /api/auth/reset-password | Request password reset |

**Contracts**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contracts | List all contracts (filtered) |
| POST | /api/contracts | Create new contract |
| GET | /api/contracts/:id | Get contract details |
| PUT | /api/contracts/:id | Update contract |
| DELETE | /api/contracts/:id | Delete draft contract |
| POST | /api/contracts/:id/send | Send contract for signing |

**Templates (Admin)**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/templates | List all templates |
| POST | /api/admin/templates | Create template |
| PUT | /api/admin/templates/:id | Update template |
| DELETE | /api/admin/templates/:id | Delete template |

**AI**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/generate-clauses | Generate AI clauses |

**Webhooks**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/webhooks/documenso | Handle Documenso events |
| POST | /api/webhooks/stripe | Handle Stripe events |

**Team**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/team | List team members |
| POST | /api/team/invite | Invite team member |
| DELETE | /api/team/:id | Remove team member |

### 5.5 Third-Party Integrations

**Documenso**
- Self-hosted on Railway
- API for document creation and sending
- Webhooks for status updates
- Template management

**Stripe**
- Checkout for subscriptions
- Customer Portal for management
- Webhooks for payment events

**OpenAI**
- GPT-4 API for clause generation
- Structured prompts for consistent output

**Supabase**
- Auth for user management
- PostgreSQL for data
- Storage for signed PDFs
- Real-time subscriptions (optional)

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Page load time: < 2 seconds
- API response time: < 500ms (except AI)
- AI clause generation: < 10 seconds
- Dashboard with 1000 contracts: < 3 seconds

### 6.2 Security
- All data encrypted in transit (HTTPS)
- Passwords hashed with bcrypt
- Row-level security in Supabase
- API rate limiting
- Input validation and sanitization
- CORS configured properly

### 6.3 Scalability
- Support 1000+ concurrent users
- Handle 10,000+ contracts per company
- Horizontal scaling via Vercel

### 6.4 Availability
- 99.9% uptime target
- Automated health checks
- Error monitoring (Sentry)

### 6.5 Compliance
- Contract templates legally approved
- Audit trail for all contract actions
- Data retention policies

---

## 7. User Interface Designs

### 7.1 Key Screens

1. **Login/Signup** - Clean, minimal auth forms
2. **Onboarding** - Company setup wizard
3. **Dashboard** - Contract list with filters
4. **New Contract** - Multi-step creation form
5. **Contract Detail** - Full contract view with status
6. **Property View** - All contracts for an address
7. **Team Settings** - Manage team members
8. **Admin Templates** - Template management

### 7.2 Design Principles
- Clean, professional appearance
- Mobile-responsive
- Accessible (WCAG 2.1 AA)
- Consistent component library (shadcn/ui)
- Clear status indicators
- Minimal clicks to complete tasks

---

## 8. Release Plan

### 8.1 MVP (v1.0) - Week 1-8

**Week 1-2: Foundation**
- [ ] Project setup (Next.js, Supabase, Tailwind)
- [ ] Authentication flow
- [ ] Company creation
- [ ] Basic database schema
- [ ] UI component library setup

**Week 3-4: Core Contracts**
- [ ] Documenso self-hosting setup
- [ ] Template management (admin)
- [ ] Contract creation flow
- [ ] AI clause integration
- [ ] Documenso integration

**Week 5-6: Tracking & Dashboard**
- [ ] Contract status tracking
- [ ] Webhook handling
- [ ] Dashboard UI
- [ ] Filters and search
- [ ] Property organization

**Week 7: Billing & Team**
- [ ] Stripe integration
- [ ] Subscription plans
- [ ] Team invites
- [ ] Role management

**Week 8: Polish**
- [ ] Testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Documentation

### 8.2 Post-MVP Roadmap

**v1.1 - Month 3**
- [ ] GoHighLevel integration
- [ ] Advanced analytics
- [ ] Email notifications
- [ ] Mobile optimization

**v1.2 - Month 4**
- [ ] Additional template types
- [ ] Bulk contract actions
- [ ] Export/reporting
- [ ] API for integrations

---

## 9. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Documenso limitations | High | Medium | Evaluate early, have backup (DocuSeal) |
| AI generates bad clauses | High | Low | Human review required, restrict AI scope |
| Legal compliance issues | High | Low | Use lawyer-approved templates only |
| Stripe integration complexity | Medium | Low | Use Stripe Checkout (simple) |
| Scale issues | Medium | Low | Vercel auto-scales |
| Scope creep | High | High | Strict MVP definition, defer features |

---

## 10. Success Criteria

### MVP Launch Criteria
- [ ] User can sign up and pay
- [ ] User can create contract from template
- [ ] AI fills clauses correctly
- [ ] Contract can be sent for signature
- [ ] Status tracking works
- [ ] Dashboard displays all contracts
- [ ] No critical bugs

### 30-Day Post-Launch Criteria
- [ ] 20+ paying customers
- [ ] < 5 critical bug reports
- [ ] 80%+ contracts successfully signed
- [ ] < 3 minute average contract creation time

---

## 11. Appendix

### 11.1 Glossary

| Term | Definition |
|------|------------|
| Wholesaling | Real estate strategy of contracting properties and assigning contracts to buyers |
| Assignment Contract | Contract that transfers rights from original buyer to end buyer |
| Earnest Money | Deposit showing buyer's good faith |
| GHL | GoHighLevel - CRM platform popular with wholesalers |

### 11.2 References
- Documenso Documentation: https://documenso.com/docs
- Supabase Documentation: https://supabase.com/docs
- Stripe Documentation: https://stripe.com/docs
- GoHighLevel API: https://marketplace.gohighlevel.com/docs

### 11.3 Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Jan 2025 | Initial PRD | [Name] |
