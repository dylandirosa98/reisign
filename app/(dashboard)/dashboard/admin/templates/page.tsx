'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  RotateCcw,
  Eye,
  Code,
  Sparkles,
  Plus,
  X,
  Pencil,
  Trash2,
} from 'lucide-react'

interface AdminTemplateData {
  id: string
  name: string
  description: string | null
  html_content: string
  signature_layout: string
  is_active: boolean
  sort_order: number
  overrides?: AdminOverrideData[]
}

interface AdminOverrideData {
  id: string
  admin_template_id: string
  state_code: string
  html_content: string
}

interface PlaceholderInfo {
  label: string
  category: string
}

// Standard placeholders available
const STANDARD_PLACEHOLDERS: Record<string, PlaceholderInfo> = {
  contract_date: { label: 'Contract Date', category: 'Contract' },
  seller_name: { label: 'Seller Name', category: 'Seller' },
  seller_email: { label: 'Seller Email', category: 'Seller' },
  seller_phone: { label: 'Seller Phone', category: 'Seller' },
  seller_address: { label: 'Seller Address', category: 'Seller' },
  company_name: { label: 'Company Name', category: 'Buyer' },
  company_email: { label: 'Company Email', category: 'Buyer' },
  company_phone: { label: 'Company Phone', category: 'Buyer' },
  company_address: { label: 'Company Address', category: 'Buyer' },
  company_signer_name: { label: 'Company Signer Name', category: 'Buyer' },
  property_address: { label: 'Property Address', category: 'Property' },
  property_city: { label: 'Property City', category: 'Property' },
  property_state: { label: 'Property State', category: 'Property' },
  property_zip: { label: 'Property Zip', category: 'Property' },
  full_property_address: { label: 'Full Property Address', category: 'Property' },
  apn: { label: 'APN / Parcel Number', category: 'Property' },
  purchase_price: { label: 'Purchase Price', category: 'Financial' },
  earnest_money: { label: 'Earnest Money', category: 'Financial' },
  assignment_fee: { label: 'Assignment Fee', category: 'Financial' },
  close_of_escrow: { label: 'Close of Escrow Date', category: 'Dates' },
  inspection_period: { label: 'Inspection Period (days)', category: 'Dates' },
  escrow_agent_name: { label: 'Escrow Agent Name', category: 'Escrow' },
  escrow_agent_address: { label: 'Escrow Agent Address', category: 'Escrow' },
  escrow_officer: { label: 'Escrow Officer', category: 'Escrow' },
  escrow_agent_email: { label: 'Escrow Agent Email', category: 'Escrow' },
  personal_property: { label: 'Personal Property Included', category: 'Other' },
  additional_terms: { label: 'Additional Terms', category: 'Other' },
  ai_clauses: { label: 'AI-Generated Clauses', category: 'Other' },
  buyer_signature_img: { label: 'Buyer Signature Image', category: 'Signatures' },
}

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  contract_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  seller_name: 'John Smith',
  seller_email: 'john.smith@email.com',
  seller_phone: '(555) 123-4567',
  seller_address: '123 Main St, Anytown, FL 12345',
  company_name: 'ABC Investments LLC',
  company_email: 'contact@abcinvestments.com',
  company_phone: '(555) 987-6543',
  company_address: '456 Business Ave',
  company_signer_name: 'Jane Doe',
  property_address: '789 Oak Lane',
  property_city: 'Springfield',
  property_state: 'FL',
  property_zip: '32801',
  full_property_address: '789 Oak Lane, Springfield, FL 32801',
  apn: '12-34-56-7890-00-001',
  purchase_price: '250,000',
  earnest_money: '5,000',
  assignment_fee: '15,000',
  close_of_escrow: 'January 30, 2025',
  inspection_period: '10',
  escrow_agent_name: 'First Title Company',
  escrow_agent_address: '100 Title Way, Orlando, FL 32801',
  escrow_officer: 'Sarah Johnson',
  escrow_agent_email: 'sarah@firsttitle.com',
  personal_property: 'Washer, Dryer, Refrigerator',
  additional_terms: 'Property sold as-is. Seller to provide clear title at closing.',
  assignee_name: 'Mike Wilson',
  assignee_email: 'mike.wilson@email.com',
  assignee_phone: '(555) 456-7890',
  assignee_address: '321 Buyer Blvd, Miami, FL 33101',
  ai_clauses: '<p><strong>12.6</strong> <em>AS-IS Condition:</em> Buyer accepts property in as-is condition.</p>',
}

// US states list for the state override sidebar
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

// Replace placeholders with sample data
function fillPlaceholders(html: string): string {
  let result = html

  // Handle conditional blocks - remove {{#if ai_clauses}}...{{/if}} blocks
  result = result.replace(/\{\{#if ai_clauses\}\}[\s\S]*?\{\{\/if\}\}/g, '')

  // Handle other conditional blocks - remove the conditional syntax but keep content
  result = result.replace(/\{\{#if [^}]+\}\}/g, '')
  result = result.replace(/\{\{\/if\}\}/g, '')

  // Replace placeholders with sample data
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }

  // Remove any unfilled placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '')

  return result
}

type SignatureLayout = 'two-column' | 'two-column-assignment' | 'seller-only' | 'three-party'

// Paginated Template Preview Component
function TemplatePreviewPane({ htmlContent, signatureLayout }: { htmlContent: string; signatureLayout: SignatureLayout }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const filledHtml = fillPlaceholders(htmlContent)

  // Generate signature page HTML based on layout
  const getSignaturePageHtml = () => {
    if (signatureLayout === 'two-column') {
      return `
        <div class="signature-page">
          <p class="signature-header">
            Seller acknowledges and agrees that Seller has read and fully understands the terms and conditions of this Contract and is entering into this Contract voluntarily.
          </p>
          <div class="signature-columns">
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY SELLER ON:</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">SELLER SIGNATURE:</div>
                <div class="signature-box"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">MAILING ADDRESS:</div>
                <div class="signature-line">123 Main St, City, ST 12345</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">seller@example.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 123-4567</div>
              </div>
            </div>
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY BUYER ON:</div>
                <div class="signature-line">January 15, 2025</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">BUYER SIGNATURE:</div>
                <div class="signature-box" style="display: flex; align-items: center; justify-content: center; padding: 2px; font-style: italic; color: #666;">[Pre-signed]</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">COMPANY NAME:</div>
                <div class="signature-line">Acme Investments LLC</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">BUYER SIGNER NAME:</div>
                <div class="signature-line">John Smith</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">buyer@company.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 987-6543</div>
              </div>
            </div>
          </div>
        </div>
      `
    } else if (signatureLayout === 'two-column-assignment') {
      return `
        <div class="signature-page">
          <p class="signature-header">
            Assignee acknowledges and agrees that Assignee has read and fully understands the terms and conditions of this Contract and is entering into this Contract voluntarily.
          </p>
          <div class="signature-columns">
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY ASSIGNEE ON:</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">ASSIGNEE SIGNATURE:</div>
                <div class="signature-box"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">MAILING ADDRESS:</div>
                <div class="signature-line">123 Main St, City, ST 12345</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">assignee@example.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 123-4567</div>
              </div>
            </div>
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY ASSIGNOR ON:</div>
                <div class="signature-line">January 15, 2025</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">ASSIGNOR SIGNATURE:</div>
                <div class="signature-box" style="display: flex; align-items: center; justify-content: center; padding: 2px; font-style: italic; color: #666;">[Pre-signed]</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">COMPANY NAME:</div>
                <div class="signature-line">Acme Investments LLC</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">ASSIGNOR SIGNER NAME:</div>
                <div class="signature-line">John Smith</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">assignor@company.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 987-6543</div>
              </div>
            </div>
          </div>
        </div>
      `
    } else if (signatureLayout === 'seller-only') {
      return `
        <div class="signature-page">
          <p class="signature-header">
            Seller acknowledges and agrees that Seller has read and fully understands the terms and conditions of this Contract.
          </p>
          <div style="max-width: 50%; margin: 0 auto;">
            <div class="signature-row">
              <div class="signature-label">APPROVED AND ACCEPTED BY SELLER ON:</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-row">
              <div class="signature-label">SELLER SIGNATURE:</div>
              <div class="signature-box"></div>
            </div>
            <div class="signature-row">
              <div class="signature-label">PRINTED NAME:</div>
              <div class="signature-line">John Doe</div>
            </div>
            <div class="signature-row">
              <div class="signature-label">MAILING ADDRESS:</div>
              <div class="signature-line">123 Main St, City, ST 12345</div>
            </div>
            <div class="signature-row">
              <div class="signature-label">EMAIL:</div>
              <div class="signature-line">seller@example.com</div>
            </div>
            <div class="signature-row">
              <div class="signature-label">PHONE:</div>
              <div class="signature-line">(555) 123-4567</div>
            </div>
          </div>
          <div style="margin-top: 40pt; padding-top: 20pt; border-top: 1px solid #ccc;">
            <p style="text-align: center; font-size: 10pt; color: #666;">
              Buyer has pre-signed this agreement. Contract date: January 15, 2025
            </p>
          </div>
        </div>
      `
    } else {
      // three-party
      return `
        <div class="signature-page">
          <p class="signature-header">
            All parties acknowledge and agree that they have read and fully understand the terms of this Assignment Contract.
          </p>
          <div style="margin-bottom: 30pt;">
            <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 10pt; border-bottom: 2px solid #000; padding-bottom: 5pt;">ORIGINAL SELLER</h3>
            <div class="signature-columns">
              <div class="signature-column">
                <div class="signature-row">
                  <div class="signature-label">SELLER SIGNATURE:</div>
                  <div class="signature-box"></div>
                </div>
                <div class="signature-row">
                  <div class="signature-label">PRINTED NAME:</div>
                  <div class="signature-line">John Doe</div>
                </div>
              </div>
              <div class="signature-column">
                <div class="signature-row">
                  <div class="signature-label">DATE:</div>
                  <div class="signature-line"></div>
                </div>
                <div class="signature-row">
                  <div class="signature-label">EMAIL:</div>
                  <div class="signature-line">seller@example.com</div>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-bottom: 30pt;">
            <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 10pt; border-bottom: 2px solid #000; padding-bottom: 5pt;">ASSIGNOR (WHOLESALER)</h3>
            <div class="signature-columns">
              <div class="signature-column">
                <div class="signature-row">
                  <div class="signature-label">ASSIGNOR SIGNATURE:</div>
                  <div class="signature-box" style="display: flex; align-items: center; justify-content: center; font-style: italic; color: #666;">[Pre-signed]</div>
                </div>
                <div class="signature-row">
                  <div class="signature-label">COMPANY NAME:</div>
                  <div class="signature-line">Acme Investments LLC</div>
                </div>
              </div>
              <div class="signature-column">
                <div class="signature-row">
                  <div class="signature-label">DATE:</div>
                  <div class="signature-line">January 15, 2025</div>
                </div>
                <div class="signature-row">
                  <div class="signature-label">EMAIL:</div>
                  <div class="signature-line">buyer@company.com</div>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-bottom: 20pt;">
            <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 10pt; border-bottom: 2px solid #000; padding-bottom: 5pt;">ASSIGNEE (END BUYER)</h3>
            <div class="signature-columns">
              <div class="signature-column">
                <div class="signature-row">
                  <div class="signature-label">ASSIGNEE SIGNATURE:</div>
                  <div class="signature-box"></div>
                </div>
                <div class="signature-row">
                  <div class="signature-label">PRINTED NAME:</div>
                  <div class="signature-line">Jane Wilson</div>
                </div>
              </div>
              <div class="signature-column">
                <div class="signature-row">
                  <div class="signature-label">DATE:</div>
                  <div class="signature-line"></div>
                </div>
                <div class="signature-row">
                  <div class="signature-label">EMAIL:</div>
                  <div class="signature-line">assignee@example.com</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }
  }

  // Generate the preview HTML with auto-pagination
  const generatePreviewHtml = () => {
    // Extract style content
    const styleMatch = filledHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
    const styles = styleMatch ? styleMatch[1] : ''

    // Extract body content
    const bodyMatch = filledHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    let bodyContent = bodyMatch ? bodyMatch[1] : filledHtml

    // Check if template already has a signature page
    const hasSignaturePage = bodyContent.includes('class="signature-page"')

    // If no signature page exists, add one
    if (!hasSignaturePage) {
      bodyContent += `
        <p class="center-text" style="text-align: center; font-weight: bold; margin-top: 30pt; padding-top: 15pt; border-top: 1px solid #ccc;">
          [SIGNATURES ON THE FOLLOWING PAGE]
        </p>
        ${getSignaturePageHtml()}
      `
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${styles}

          /* Signature page styles */
          .signature-page {
            page-break-before: always;
          }

          .signature-header {
            text-align: center;
            font-style: italic;
            margin-bottom: 30pt;
            line-height: 1.4;
          }

          .signature-columns {
            display: flex;
            justify-content: space-between;
          }

          .signature-column {
            width: 45%;
          }

          .signature-row {
            margin-bottom: 16pt;
          }

          .signature-label {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4pt;
          }

          .signature-line {
            border-bottom: 1px solid #000;
            min-height: 20pt;
            padding-top: 2pt;
          }

          .signature-box {
            border: 1px solid #000;
            min-height: 35pt;
          }

          /* Preview container styles */
          html, body {
            margin: 0;
            padding: 0;
            background: #e5e7eb;
          }

          #content-measurer {
            position: absolute;
            left: -9999px;
            top: 0;
            width: 6.5in;
            padding: 0;
          }

          #pages-container {
            padding: 20px 0;
          }

          /* Each page styled as a paper sheet */
          .preview-page {
            background: white;
            width: 8.5in;
            height: 11in;
            margin: 0 auto 30px auto;
            padding: 0.75in 1in;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }

          .preview-page:first-child {
            margin-top: 0;
          }

          .page-content {
            height: calc(11in - 1.5in - 50px);
            overflow: hidden;
          }

          /* Page footer with initials */
          .page-footer {
            position: absolute;
            bottom: 0.5in;
            left: 1in;
            right: 1in;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9pt;
            color: #4b5563;
            font-family: 'Times New Roman', Times, serif;
            padding-top: 8px;
            border-top: 1px solid #d1d5db;
          }

          .initials-label {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .initials-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 20px;
            border: 1px solid #000;
            background: white;
            font-size: 8pt;
          }

          .buyer-initials {
            font-family: 'Brush Script MT', cursive;
            font-size: 11pt;
            color: #000;
          }

          .page-number {
            font-size: 9pt;
          }

          /* Signature page footer - no initials needed */
          .signature-page-footer {
            position: absolute;
            bottom: 0.5in;
            left: 1in;
            right: 1in;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 9pt;
            color: #4b5563;
            font-family: 'Times New Roman', Times, serif;
            padding-top: 8px;
            border-top: 1px solid #d1d5db;
          }
        </style>
      </head>
      <body>
        <!-- Hidden content measurer -->
        <div id="content-measurer">${bodyContent}</div>

        <!-- Pages will be generated here -->
        <div id="pages-container"></div>

        <script>
          (function() {
            const USABLE_HEIGHT = (9.5 * 96) - 45;

            const measurer = document.getElementById('content-measurer');
            const container = document.getElementById('pages-container');

            function flattenElements(parent) {
              const result = [];
              const children = Array.from(parent.children);

              children.forEach(el => {
                if (el.classList.contains('signature-page')) {
                  return;
                }

                const rect = el.getBoundingClientRect();
                const hasBlockChildren = Array.from(el.children).some(child => {
                  const display = window.getComputedStyle(child).display;
                  return display === 'block' || display === 'flex' || display === 'grid';
                });

                if (rect.height > USABLE_HEIGHT * 0.4 && hasBlockChildren && el.children.length > 1) {
                  const wrapper = el.cloneNode(false);
                  wrapper.innerHTML = '';
                  result.push({ type: 'wrapper-start', el: wrapper, tag: el.tagName });
                  flattenElements(el).forEach(item => result.push(item));
                  result.push({ type: 'wrapper-end', tag: el.tagName });
                } else {
                  result.push({ type: 'element', el: el });
                }
              });

              return result;
            }

            let signatureElement = measurer.querySelector('.signature-page');
            if (signatureElement) {
              signatureElement = signatureElement.cloneNode(true);
            }

            const flatItems = flattenElements(measurer);

            let pages = [];
            let currentPageHtml = '';
            let currentHeight = 0;
            let wrapperStack = [];

            function getOpeningTag(el) {
              const tag = el.tagName.toLowerCase();
              let attrs = '';
              for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                attrs += ' ' + attr.name + '="' + attr.value + '"';
              }
              return '<' + tag + attrs + '>';
            }

            flatItems.forEach((item) => {
              if (item.type === 'wrapper-start') {
                const openTag = getOpeningTag(item.el);
                wrapperStack.push(openTag);
                currentPageHtml += openTag;
              } else if (item.type === 'wrapper-end') {
                wrapperStack.pop();
                currentPageHtml += '</' + item.tag.toLowerCase() + '>';
              } else {
                const el = item.el;
                const rect = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);
                const marginTop = parseFloat(styles.marginTop) || 0;
                const marginBottom = parseFloat(styles.marginBottom) || 0;
                const totalHeight = rect.height + marginTop + marginBottom;

                if (currentHeight + totalHeight > USABLE_HEIGHT && currentPageHtml.trim()) {
                  let closeTags = '';
                  for (let i = wrapperStack.length - 1; i >= 0; i--) {
                    const match = wrapperStack[i].match(/<(\\w+)/);
                    if (match) closeTags += '</' + match[1] + '>';
                  }
                  pages.push(currentPageHtml + closeTags);

                  currentPageHtml = wrapperStack.join('') + el.outerHTML;
                  currentHeight = totalHeight;
                } else {
                  currentPageHtml += el.outerHTML;
                  currentHeight += totalHeight;
                }
              }
            });

            if (currentPageHtml.trim()) {
              let closeTags = '';
              for (let i = wrapperStack.length - 1; i >= 0; i--) {
                const tag = wrapperStack[i].match(/<(\\w+)/)?.[1];
                if (tag) closeTags += '</' + tag + '>';
              }
              pages.push(currentPageHtml + closeTags);
            }

            const totalContentPages = pages.length;
            const totalPages = totalContentPages + (signatureElement ? 1 : 0);

            pages.forEach((pageHtml, pageIndex) => {
              const pageNum = pageIndex + 1;

              const pageDiv = document.createElement('div');
              pageDiv.className = 'preview-page';

              const contentDiv = document.createElement('div');
              contentDiv.className = 'page-content';
              contentDiv.innerHTML = pageHtml;

              pageDiv.appendChild(contentDiv);

              pageDiv.innerHTML += \`
                <div class="page-footer">
                  <div class="initials-label">
                    Seller Initials: <span class="initials-box">______</span>
                  </div>
                  <span class="page-number">Page \${pageNum} of \${totalPages}</span>
                  <div class="initials-label">
                    Buyer Initials: <span class="initials-box buyer-initials">JD</span>
                  </div>
                </div>
              \`;

              container.appendChild(pageDiv);
            });

            if (signatureElement) {
              const pageDiv = document.createElement('div');
              pageDiv.className = 'preview-page';

              const contentDiv = document.createElement('div');
              contentDiv.className = 'page-content';
              contentDiv.appendChild(signatureElement);

              pageDiv.appendChild(contentDiv);

              pageDiv.innerHTML += \`
                <div class="signature-page-footer">
                  <span class="page-number">Page \${totalPages} of \${totalPages}</span>
                </div>
              \`;

              container.appendChild(pageDiv);
            }

            measurer.style.display = 'none';
          })();
        </script>
      </body>
      </html>
    `
  }

  // Write to iframe
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(generatePreviewHtml())
        doc.close()
      }
    }
  }, [filledHtml, signatureLayout])

  return (
    <div className="h-[600px] overflow-auto bg-gray-200">
      <iframe
        ref={iframeRef}
        title="Template Preview"
        className="w-full border-0"
        style={{ minHeight: '1400px' }}
      />
    </div>
  )
}

export default function AdminTemplatesPage() {
  // Admin templates list
  const [adminTemplates, setAdminTemplates] = useState<AdminTemplateData[]>([])
  const [selectedAdminTemplate, setSelectedAdminTemplate] = useState<AdminTemplateData | null>(null)
  const [overriddenStates, setOverriddenStates] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // "BASE" means editing the admin template's base content, otherwise a state code
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [expandStates, setExpandStates] = useState(false)

  // Editor state
  const [editorContent, setEditorContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [isCustomized, setIsCustomized] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'input'>('input')

  // Plain text input mode
  const [plainTextInput, setPlainTextInput] = useState('')
  const [signatureLayout, setSignatureLayout] = useState<SignatureLayout>('two-column')
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [hasGeneratedHtml, setHasGeneratedHtml] = useState(false)

  // New template modal
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [newTemplateLayout, setNewTemplateLayout] = useState<SignatureLayout>('two-column')
  const [isCreating, setIsCreating] = useState(false)

  // Edit template name/description
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLayout, setEditLayout] = useState<SignatureLayout>('two-column')

  useEffect(() => {
    fetchAdminTemplates()
  }, [])

  const fetchAdminTemplates = async () => {
    try {
      const res = await fetch('/api/admin-templates')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch templates')
      }
      const data: AdminTemplateData[] = await res.json()
      setAdminTemplates(data)

      // Auto-select first template if none selected
      if (data.length > 0 && !selectedAdminTemplate) {
        await selectAdminTemplate(data[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const selectAdminTemplate = async (template: AdminTemplateData) => {
    setSelectedAdminTemplate(template)
    setSignatureLayout(template.signature_layout as SignatureLayout)

    // Fetch overrides to know which states are customized
    try {
      const res = await fetch(`/api/admin-templates/${template.id}/overrides`)
      if (res.ok) {
        const overrides: AdminOverrideData[] = await res.json()
        setOverriddenStates(new Set(overrides.map(o => o.state_code)))
      }
    } catch {
      // Ignore errors fetching overrides
    }

    // Load base template content
    loadBaseContent(template)
  }

  const loadBaseContent = (template: AdminTemplateData) => {
    setSelectedState('BASE')
    setEditorContent(template.html_content)
    setOriginalContent(template.html_content)
    setIsCustomized(true)
    setHasChanges(false)
    setPlainTextInput('')

    if (template.html_content) {
      setHasGeneratedHtml(true)
      setViewMode('code')
    } else {
      setHasGeneratedHtml(false)
      setViewMode('input')
    }
  }

  const loadStateOverrideContent = useCallback(async (stateCode: string) => {
    if (!selectedAdminTemplate) return

    setLoadingContent(true)
    setSelectedState(stateCode)
    setError(null)
    setGenerationError('')

    try {
      const res = await fetch(`/api/admin-templates/${selectedAdminTemplate.id}/overrides/${stateCode}`)
      if (!res.ok) throw new Error('Failed to load template content')
      const data = await res.json()

      const htmlContent = data.html || ''
      setEditorContent(htmlContent)
      setOriginalContent(htmlContent)
      setIsCustomized(data.isOverride || false)
      setHasChanges(false)

      if (htmlContent) {
        setHasGeneratedHtml(true)
        setViewMode('code')
      } else {
        setHasGeneratedHtml(false)
        setViewMode('input')
      }
      setPlainTextInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setLoadingContent(false)
    }
  }, [selectedAdminTemplate])

  // Generate HTML from plain text using AI
  const handleGenerateHtml = async () => {
    if (!plainTextInput.trim()) {
      setGenerationError('Please enter your contract text first')
      return
    }

    setIsGeneratingHtml(true)
    setGenerationError('')

    try {
      const res = await fetch('/api/ai/generate-template-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plainText: plainTextInput,
          signatureLayout,
          placeholders: Object.entries(STANDARD_PLACEHOLDERS).map(([key, info]) => ({
            key,
            label: info.label,
            category: info.category,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate template')
      }

      setEditorContent(data.html)
      setHasGeneratedHtml(true)
      setHasChanges(true)
      setViewMode('code')
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate template')
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  const handleContentChange = (newContent: string) => {
    setEditorContent(newContent)
    setHasChanges(newContent !== originalContent)
  }

  const handleSave = async () => {
    if (!selectedAdminTemplate || !selectedState) return

    setIsSaving(true)
    setError(null)

    try {
      if (selectedState === 'BASE') {
        // Save base template content + signature layout
        const res = await fetch(`/api/admin-templates/${selectedAdminTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html_content: editorContent,
            signature_layout: signatureLayout,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save template')
        }
        const updated = await res.json()
        setSelectedAdminTemplate({ ...selectedAdminTemplate, ...updated })
        // Update in list
        setAdminTemplates(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
      } else {
        // Save state override
        const res = await fetch(`/api/admin-templates/${selectedAdminTemplate.id}/overrides/${selectedState}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html_content: editorContent }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save template')
        }
        setOverriddenStates(prev => new Set([...prev, selectedState]))
      }

      setOriginalContent(editorContent)
      setHasChanges(false)
      setIsCustomized(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selectedAdminTemplate || !selectedState || selectedState === 'BASE') return
    if (!confirm('This will reset the template to the base template. Any state customizations will be lost. Continue?')) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin-templates/${selectedAdminTemplate.id}/overrides/${selectedState}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reset template')
      }

      setOverriddenStates(prev => {
        const next = new Set(prev)
        next.delete(selectedState)
        return next
      })

      await loadStateOverrideContent(selectedState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscard = () => {
    setEditorContent(originalContent)
    setHasChanges(false)
  }

  const handleStartOver = () => {
    setHasGeneratedHtml(false)
    setPlainTextInput('')
    setViewMode('input')
    setHasChanges(false)
  }

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/admin-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          description: newTemplateDescription || null,
          signature_layout: newTemplateLayout,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create template')
      }

      const newTemplate: AdminTemplateData = await res.json()
      setAdminTemplates(prev => [...prev, newTemplate])
      setShowNewTemplateModal(false)
      setNewTemplateName('')
      setNewTemplateDescription('')
      setNewTemplateLayout('two-column')

      // Select the new template
      await selectAdminTemplate(newTemplate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedAdminTemplate) return
    if (!confirm(`Deactivate "${selectedAdminTemplate.name}"? It will no longer appear for users.`)) return

    try {
      const res = await fetch(`/api/admin-templates/${selectedAdminTemplate.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete template')

      setAdminTemplates(prev => prev.filter(t => t.id !== selectedAdminTemplate.id))
      setSelectedAdminTemplate(null)
      setSelectedState(null)
      setEditorContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  const handleEditTemplate = async () => {
    if (!selectedAdminTemplate || !editName.trim()) return

    try {
      const res = await fetch(`/api/admin-templates/${selectedAdminTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          signature_layout: editLayout,
        }),
      })
      if (!res.ok) throw new Error('Failed to update template')

      const updated = await res.json()
      setSelectedAdminTemplate({ ...selectedAdminTemplate, ...updated })
      setAdminTemplates(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
      setSignatureLayout(editLayout)
      setShowEditModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template')
    }
  }

  const openEditModal = () => {
    if (!selectedAdminTemplate) return
    setEditName(selectedAdminTemplate.name)
    setEditDescription(selectedAdminTemplate.description || '')
    setEditLayout(selectedAdminTemplate.signature_layout as SignatureLayout)
    setShowEditModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const getEditorLabel = () => {
    if (!selectedAdminTemplate) return 'Select a Template'
    if (selectedState === 'BASE') return `${selectedAdminTemplate.name} - Base Template`
    const state = US_STATES.find(s => s.code === selectedState)
    if (isCustomized) return `${selectedAdminTemplate.name} - ${state?.name || selectedState} (Customized)`
    return `${selectedAdminTemplate.name} - ${state?.name || selectedState} (Using Base)`
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Top bar - Template selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">Admin Templates</h1>
          <div className="flex items-center gap-1">
            {adminTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => selectAdminTemplate(template)}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium transition-colors
                  ${selectedAdminTemplate?.id === template.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-600'
                  }
                `}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedAdminTemplate && (
            <>
              <button
                onClick={openEditModal}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Settings
              </button>
              <button
                onClick={handleDeleteTemplate}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Deactivate
              </button>
            </>
          )}
          <button
            onClick={() => setShowNewTemplateModal(true)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            New Template
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Base + State overrides */}
        <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          {selectedAdminTemplate ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <p className="text-xs text-gray-600">
                  Edit the base template and state-specific overrides
                </p>
              </div>

              {error && (
                <div className="m-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              )}

              {/* Base Template */}
              <div className="p-2">
                <button
                  onClick={() => loadBaseContent(selectedAdminTemplate)}
                  className={`
                    w-full px-3 py-2 rounded text-left flex items-center gap-2 transition-colors
                    ${selectedState === 'BASE'
                      ? 'bg-blue-50 text-blue-700 border border-blue-300'
                      : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">Base Template</div>
                    <div className="text-xs text-gray-500">Default for all states</div>
                  </div>
                </button>
              </div>

              {/* States section */}
              <div className="p-2 border-t border-gray-200">
                <button
                  onClick={() => setExpandStates(!expandStates)}
                  className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                >
                  <span>State-Specific Overrides</span>
                  {expandStates ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expandStates && (
                  <div className="mt-1 space-y-0.5 max-h-[400px] overflow-y-auto">
                    {US_STATES.map((state) => (
                      <button
                        key={state.code}
                        onClick={() => loadStateOverrideContent(state.code)}
                        className={`
                          w-full px-3 py-1.5 rounded text-left flex items-center gap-2 transition-colors text-sm
                          ${selectedState === state.code
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-100 text-gray-700'
                          }
                        `}
                      >
                        <span className="flex-1 truncate">{state.name}</span>
                        {overriddenStates.has(state.code) && (
                          <span title="Has custom template">
                            <Edit3 className="w-3 h-3 text-blue-600" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 text-sm text-gray-500">
              Select or create a template to get started
            </div>
          )}
        </div>

        {/* Main content - Editor */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loadingContent ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : selectedAdminTemplate && selectedState ? (
            <div className="p-6">
              {/* Header */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {getEditorLabel()}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedState === 'BASE'
                    ? 'This template applies to all states unless they have a custom override.'
                    : 'Customize this template for state-specific requirements, or use the base template.'}
                </p>
              </div>

              {/* Editor Card */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Editor Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedState === 'BASE' ? (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        Base Template
                      </span>
                    ) : isCustomized ? (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        Customized
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                        Using Base Template
                      </span>
                    )}
                    {hasChanges && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isCustomized && selectedState !== 'BASE' && (
                      <button
                        onClick={handleReset}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1"
                        disabled={isSaving}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset to Base
                      </button>
                    )}
                    {hasChanges && (
                      <button
                        onClick={handleDiscard}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
                        disabled={isSaving}
                      >
                        Discard
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      {isSaving ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </div>

                {/* View Mode Tabs */}
                <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2 bg-white">
                  <button
                    onClick={() => setViewMode('input')}
                    className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      viewMode === 'input'
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Text Input
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      viewMode === 'code'
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                    HTML Code
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      viewMode === 'preview'
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[600px]">
                  {viewMode === 'input' ? (
                    <div className="p-6 space-y-4">
                      {/* Signature Layout Selection - only on base template */}
                      {selectedState === 'BASE' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Signature Page Layout
                          </label>
                          <select
                            value={signatureLayout}
                            onChange={(e) => setSignatureLayout(e.target.value as SignatureLayout)}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="two-column">Two Column Purchase (Seller + Buyer)</option>
                            <option value="two-column-assignment">Two Column Assignment (Assignee + Assignor)</option>
                            <option value="seller-only">Seller Only</option>
                            <option value="three-party">Three Party (Seller + Assignor + Assignee)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            {signatureLayout === 'two-column' && 'Standard layout with Seller and Buyer signatures side by side'}
                            {signatureLayout === 'two-column-assignment' && 'Assignment layout with Assignee and Assignor signatures side by side'}
                            {signatureLayout === 'seller-only' && 'Only Seller signs via Documenso. Buyer pre-signs.'}
                            {signatureLayout === 'three-party' && 'For assignments: Seller and Assignee sign via Documenso'}
                          </p>
                        </div>
                      )}

                      {/* Auto-generated Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800 mb-2">What gets added automatically:</p>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>- <strong>Page footers</strong> - Seller & Buyer initials boxes added to each page</li>
                          <li>- <strong>&quot;[SIGNATURES ON FOLLOWING PAGE]&quot;</strong> - Added at the end of your content</li>
                          <li>- <strong>Signature page</strong> - Auto-generated based on layout selection above</li>
                          <li>- <strong>Page breaks</strong> - Content automatically splits into pages</li>
                        </ul>
                      </div>

                      {/* Plain Text Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contract Content
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Paste your contract text below. The AI will format it into professional HTML with proper placeholders.
                        </p>
                        <textarea
                          value={plainTextInput}
                          onChange={(e) => setPlainTextInput(e.target.value)}
                          placeholder={`Paste your contract text here...

Example:
PURCHASE AGREEMENT

This agreement is made between [Seller Name] and [Buyer Company] for the property located at [Property Address].

1. PURCHASE PRICE
The purchase price is $[Amount] to be paid as follows...

2. CLOSING DATE
The closing shall occur on [Date]...`}
                          className="w-full h-[350px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                        />
                      </div>

                      {/* Error Message */}
                      {generationError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {generationError}
                        </div>
                      )}

                      {/* Generate Button */}
                      <button
                        onClick={handleGenerateHtml}
                        disabled={isGeneratingHtml || !plainTextInput.trim()}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                      >
                        {isGeneratingHtml ? (
                          <>
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Formatting Template...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5" />
                            Generate HTML Template
                          </>
                        )}
                      </button>

                      {hasGeneratedHtml && (
                        <p className="text-sm text-center text-green-600">
                          Template generated! Switch to &quot;HTML Code&quot; tab to view and edit.
                        </p>
                      )}
                    </div>
                  ) : viewMode === 'code' ? (
                    <div className="relative">
                      {hasGeneratedHtml && (
                        <button
                          onClick={handleStartOver}
                          className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded flex items-center gap-1 z-10"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Start Over
                        </button>
                      )}
                      <textarea
                        value={editorContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="w-full h-[600px] p-4 font-mono text-sm border-0 resize-none focus:outline-none focus:ring-0 bg-gray-50"
                        spellCheck={false}
                        placeholder="Enter HTML template content..."
                      />
                    </div>
                  ) : (
                    <TemplatePreviewPane htmlContent={editorContent} signatureLayout={signatureLayout} />
                  )}
                </div>

                {/* Footer with placeholders help */}
                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                  <p className="text-xs text-gray-500">
                    <strong>Common Placeholders:</strong>{' '}
                    <code className="bg-gray-200 px-1 rounded">{'{{property_address}}'}</code>,{' '}
                    <code className="bg-gray-200 px-1 rounded">{'{{seller_name}}'}</code>,{' '}
                    <code className="bg-gray-200 px-1 rounded">{'{{purchase_price}}'}</code>,{' '}
                    <code className="bg-gray-200 px-1 rounded">{'{{close_of_escrow}}'}</code>,{' '}
                    <code className="bg-gray-200 px-1 rounded">{'{{ai_clauses}}'}</code>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-500">
              {adminTemplates.length === 0
                ? 'Create your first admin template to get started'
                : 'Select a template from the top bar to edit'}
            </div>
          )}
        </div>
      </div>

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create New Template</h3>
              <button onClick={() => setShowNewTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Florida Purchase Agreement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature Layout</label>
                <select
                  value={newTemplateLayout}
                  onChange={(e) => setNewTemplateLayout(e.target.value as SignatureLayout)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="two-column">Two Column Purchase (Seller + Buyer)</option>
                  <option value="two-column-assignment">Two Column Assignment (Assignee + Assignor)</option>
                  <option value="seller-only">Seller Only</option>
                  <option value="three-party">Three Party (Seller + Assignor + Assignee)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowNewTemplateModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!newTemplateName.trim() || isCreating}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditModal && selectedAdminTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Template Settings</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature Layout</label>
                <select
                  value={editLayout}
                  onChange={(e) => setEditLayout(e.target.value as SignatureLayout)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="two-column">Two Column Purchase (Seller + Buyer)</option>
                  <option value="two-column-assignment">Two Column Assignment (Assignee + Assignor)</option>
                  <option value="seller-only">Seller Only</option>
                  <option value="three-party">Three Party (Seller + Assignor + Assignee)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTemplate}
                disabled={!editName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
