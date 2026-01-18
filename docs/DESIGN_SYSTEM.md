# WholesaleSign Design System

## Design Philosophy

**Professional B2B SaaS Aesthetic** - Think Salesforce, DocuSign, HubSpot. NOT trendy startup design with excessive gradients, shadows, or playful elements.

### Core Principles
1. **Conservative & Enterprise-focused** - Users are business professionals who value trust and reliability
2. **Clean & Functional** - Every element should serve a purpose
3. **Consistent** - Uniform patterns across all pages
4. **Accessible** - WCAG 2.1 AA compliant

---

## Color Palette

### Primary Colors (Navy)
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary-900` | `#1a365d` | Primary buttons, headers, main CTA |
| `--primary-800` | `#1e4a7c` | Button hover states |
| `--primary-700` | `#2563eb` | Links, focus rings |
| `--primary-600` | `#3b82f6` | Secondary accents |
| `--primary-50` | `#eff6ff` | Light backgrounds, hover states |

### Neutral Colors (Gray)
| Token | Hex | Usage |
|-------|-----|-------|
| `--gray-900` | `#111827` | Primary text, headings |
| `--gray-700` | `#374151` | Secondary text |
| `--gray-600` | `#4b5563` | Tertiary text |
| `--gray-500` | `#6b7280` | Placeholder text |
| `--gray-400` | `#9ca3af` | Disabled text |
| `--gray-300` | `#d1d5db` | Borders |
| `--gray-200` | `#e5e7eb` | Dividers, light borders |
| `--gray-100` | `#f3f4f6` | Table row hover |
| `--gray-50` | `#f9fafb` | Page background |

### Status Colors
| Status | Dark (Text/Icon) | Light (Background) |
|--------|------------------|-------------------|
| Success | `#15803d` | `#dcfce7` |
| Warning | `#a16207` | `#fef9c3` |
| Error | `#b91c1c` | `#fee2e2` |
| Info | `#1d4ed8` | `#dbeafe` |

---

## Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes
| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| `text-xs` | 12px | 16px | Labels, captions |
| `text-sm` | 14px | 20px | Body text, table cells |
| `text-base` | 16px | 24px | Standard body |
| `text-lg` | 18px | 28px | Section headers |
| `text-xl` | 20px | 28px | Page titles |
| `text-2xl` | 24px | 32px | Main headings |

### Font Weights
- `font-normal` (400): Body text
- `font-medium` (500): Labels, table headers
- `font-semibold` (600): Section headers, buttons
- `font-bold` (700): Page titles only

---

## Spacing

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing, icon gaps |
| `space-2` | 8px | Input padding, small gaps |
| `space-3` | 12px | Button padding |
| `space-4` | 16px | Card padding, section gaps |
| `space-6` | 24px | Large section spacing |
| `space-8` | 32px | Page margins |

---

## Border Radius

**Maximum border radius: 4px** - No rounded corners beyond this.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 2px | Small elements, tags |
| `--radius` | 4px | Buttons, inputs, cards |
| `--radius-md` | 6px | Modals (rare exception) |

```css
/* CORRECT */
border-radius: 4px;

/* WRONG - Too rounded */
border-radius: 8px;
border-radius: 12px;
rounded-full; /* Never for containers */
```

---

## Shadows

**DO NOT USE SHADOWS ON CARDS.** Use borders instead.

```css
/* WRONG */
box-shadow: 0 1px 3px rgba(0,0,0,0.1);

/* CORRECT */
border: 1px solid var(--gray-200);
```

### Allowed Shadow Usage
- Dropdowns/popovers only: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- Focus states: `box-shadow: 0 0 0 2px var(--primary-700)`

---

## Components

### Buttons

#### Primary Button
```css
background-color: var(--primary-900);
color: white;
padding: 8px 16px;
border-radius: 4px;
font-weight: 600;
font-size: 14px;

&:hover {
  background-color: var(--primary-800);
}
```

#### Secondary Button
```css
background-color: white;
color: var(--gray-700);
border: 1px solid var(--gray-300);
padding: 8px 16px;
border-radius: 4px;

&:hover {
  background-color: var(--gray-50);
}
```

#### Destructive Button
```css
background-color: var(--error-700);
color: white;
/* Same padding/radius as primary */
```

### Input Fields
```css
border: 1px solid var(--gray-300);
border-radius: 4px;
padding: 8px 12px;
font-size: 14px;
background-color: white;

&:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-700);
  border-color: var(--primary-700);
}

&::placeholder {
  color: var(--gray-500);
}
```

### Cards
```css
background-color: white;
border: 1px solid var(--gray-200);
border-radius: 4px;
padding: 16px;
/* NO SHADOW */
```

### Tables
```css
/* Header */
background-color: var(--gray-50);
font-weight: 500;
color: var(--gray-700);
font-size: 12px;
text-transform: uppercase;
letter-spacing: 0.05em;

/* Row */
border-bottom: 1px solid var(--gray-200);

/* Row Hover */
background-color: var(--gray-100);
```

### Status Badges
```css
/* Draft */
background-color: var(--gray-100);
color: var(--gray-700);

/* Sent */
background-color: var(--info-100);
color: var(--info-700);

/* Viewed */
background-color: var(--warning-100);
color: var(--warning-700);

/* Completed */
background-color: var(--success-100);
color: var(--success-700);

/* Common */
padding: 2px 8px;
border-radius: 2px;
font-size: 12px;
font-weight: 500;
```

---

## Layout

### Navigation
**Use TOP NAVIGATION BAR, not sidebar.**

```
+------------------------------------------------------------------+
| Logo        Dashboard  Contracts  Properties  Templates  Settings |  [User Menu]
+------------------------------------------------------------------+
|                                                                    |
|                         Page Content                               |
|                                                                    |
+------------------------------------------------------------------+
```

#### Top Nav Styles
```css
background-color: white;
border-bottom: 1px solid var(--gray-200);
height: 64px;
padding: 0 24px;

/* Nav Links */
color: var(--gray-600);
font-size: 14px;
font-weight: 500;

/* Active Link */
color: var(--primary-900);
border-bottom: 2px solid var(--primary-900);
```

### Page Structure
```css
/* Page Container */
max-width: 1200px;
margin: 0 auto;
padding: 24px;

/* Page Header */
margin-bottom: 24px;

/* Page Title */
font-size: 24px;
font-weight: 700;
color: var(--gray-900);
```

---

## Icons

- Use Lucide React icons
- Default size: 16px (small) or 20px (standard)
- Color: Match text color or use `var(--gray-500)` for decorative

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

---

## Do's and Don'ts

### DO
- Use consistent 4px spacing increments
- Keep borders subtle (`gray-200` or `gray-300`)
- Use proper contrast ratios (4.5:1 minimum)
- Keep forms clean and scannable
- Use loading states for async actions

### DON'T
- Use gradients on buttons or backgrounds
- Use shadows on cards or containers
- Use border-radius larger than 4px
- Use playful or trendy design elements
- Use excessive animation or transitions
- Use sidebar navigation
- Use bright/saturated colors as backgrounds

---

## Example Component Patterns

### Page Header with Actions
```jsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
    <p className="text-sm text-gray-600">Manage your real estate contracts</p>
  </div>
  <Button>
    <Plus className="w-4 h-4 mr-2" />
    New Contract
  </Button>
</div>
```

### Data Table Header
```jsx
<thead className="bg-gray-50">
  <tr>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
      Property
    </th>
    {/* ... */}
  </tr>
</thead>
```

### Empty State
```jsx
<div className="text-center py-12">
  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
  <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts yet</h3>
  <p className="text-sm text-gray-600 mb-4">Get started by creating your first contract</p>
  <Button>Create Contract</Button>
</div>
```
