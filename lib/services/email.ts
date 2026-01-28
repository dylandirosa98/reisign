import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || 'REI Sign <noreply@reisign.com>'

interface SendSigningInviteEmailParams {
  to: string
  recipientName: string
  companyName: string
  propertyAddress: string
  signingUrl: string
  contractType: 'purchase' | 'assignment'
  isThreeParty?: boolean
  signerRole?: 'seller' | 'buyer'
}

/**
 * Send email inviting someone to sign a document
 */
export async function sendSigningInviteEmail({
  to,
  recipientName,
  companyName,
  propertyAddress,
  signingUrl,
  contractType,
  isThreeParty,
  signerRole,
}: SendSigningInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] RESEND_API_KEY not configured, skipping email')
    return { success: false, error: 'Email not configured' }
  }

  const contractTypeName = contractType === 'purchase' ? 'Purchase Agreement' : 'Assignment Contract'
  const subject = `${companyName} has invited you to sign a document`

  const roleText = isThreeParty && signerRole
    ? signerRole === 'seller'
      ? ' as the Seller'
      : ' as the Buyer/Assignee'
    : ''

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Document Ready for Signature</h1>
      </div>

      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Hi ${recipientName},</p>

        <p><strong>${companyName}</strong> has invited you to sign a document${roleText}.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a1a2e;">Document Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Property:</td>
              <td style="padding: 8px 0; font-weight: 500;">${propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">From:</td>
              <td style="padding: 8px 0; font-weight: 500;">${companyName}</td>
            </tr>
          </table>
        </div>

        <p>Please review and sign the document by clicking the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${signingUrl}"
             style="display: inline-block; background: #16a34a; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Review & Sign Document
          </a>
        </div>

        <p style="font-size: 14px; color: #666;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${signingUrl}" style="color: #1a1a2e; word-break: break-all;">${signingUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 12px; color: #999;">
          This is an automated notification sent on behalf of ${companyName} via REI Sign.
          If you have questions about this document, please contact ${companyName} directly.
        </p>
      </div>
    </body>
    </html>
  `

  const textContent = `
Document Ready for Signature

Hi ${recipientName},

${companyName} has invited you to sign a document${roleText}.

Document Details:
- Property: ${propertyAddress}
- From: ${companyName}

Please review and sign the document by visiting:
${signingUrl}

This is an automated notification sent on behalf of ${companyName} via REI Sign.
If you have questions about this document, please contact ${companyName} directly.
  `.trim()

  try {
    console.log(`[Email] Sending signing invite email to: ${to}`)

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error('[Email] Failed to send signing invite email:', error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Signing invite email sent successfully, id: ${data?.id}`)
    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending signing invite email:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

interface SendSellerSignedEmailParams {
  to: string
  sellerName: string
  propertyAddress: string
  companyName: string
}

/**
 * Send email to seller after they sign a 3-party contract (waiting for buyer)
 * ONLY used for 3-party signature contracts
 */
export async function sendSellerSignedEmail({
  to,
  sellerName,
  propertyAddress,
  companyName,
}: SendSellerSignedEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] RESEND_API_KEY not configured, skipping email')
    return { success: false, error: 'Email not configured' }
  }

  const subject = `Signature Received - Waiting for Buyer`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Signature Received!</h1>
      </div>

      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Hi ${sellerName},</p>

        <p>Thank you for signing the contract for <strong>${propertyAddress}</strong>.</p>

        <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0369a1;">
            <strong>What's next?</strong><br>
            We're now waiting for the buyer to sign. Once all parties have signed, you'll receive a copy of the fully executed contract via email.
          </p>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          This is an automated notification sent on behalf of ${companyName} via REI Sign.
        </p>
      </div>
    </body>
    </html>
  `

  const textContent = `
Signature Received!

Hi ${sellerName},

Thank you for signing the contract for ${propertyAddress}.

What's next?
We're now waiting for the buyer to sign. Once all parties have signed, you'll receive a copy of the fully executed contract via email.

This is an automated notification sent on behalf of ${companyName} via REI Sign.
  `.trim()

  try {
    console.log(`[Email] Sending seller signed email to: ${to}`)

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error('[Email] Failed to send seller signed email:', error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Seller signed email sent successfully, id: ${data?.id}`)
    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending seller signed email:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

interface SendSignedContractEmailParams {
  to: string[]
  contractId: string
  propertyAddress: string
  sellerName: string
  buyerName: string
  completedAt: string
  pdfBuffer?: Buffer
}

/**
 * Send email notification when a contract is fully signed
 */
export async function sendSignedContractEmail({
  to,
  contractId,
  propertyAddress,
  sellerName,
  buyerName,
  completedAt,
  pdfBuffer,
}: SendSignedContractEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] RESEND_API_KEY not configured, skipping email')
    return { success: false, error: 'Email not configured' }
  }

  if (to.length === 0) {
    console.log('[Email] No recipients, skipping email')
    return { success: false, error: 'No recipients' }
  }

  const formattedDate = new Date(completedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const subject = `Contract Signed: ${propertyAddress}`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Contract Signed</h1>
      </div>

      <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Great news! A contract has been fully signed by all parties.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a1a2e;">Contract Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Property:</td>
              <td style="padding: 8px 0; font-weight: 500;">${propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Seller:</td>
              <td style="padding: 8px 0; font-weight: 500;">${sellerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Buyer:</td>
              <td style="padding: 8px 0; font-weight: 500;">${buyerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Completed:</td>
              <td style="padding: 8px 0; font-weight: 500;">${formattedDate}</td>
            </tr>
          </table>
        </div>

        <p>The signed contract document is attached to this email for your records.</p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reisign.com'}/dashboard/contracts/${contractId}"
             style="display: inline-block; background: #1a1a2e; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            View Contract
          </a>
        </div>

        <p style="margin-top: 30px; font-size: 12px; color: #999;">
          This is an automated notification from REI Sign. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `

  const textContent = `
Contract Signed

Great news! A contract has been fully signed by all parties.

Contract Details:
- Property: ${propertyAddress}
- Seller: ${sellerName}
- Buyer: ${buyerName}
- Completed: ${formattedDate}

The signed contract document is attached to this email for your records.

View contract: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.reisign.com'}/dashboard/contracts/${contractId}

This is an automated notification from REI Sign.
  `.trim()

  try {
    console.log(`[Email] Sending signed contract email to: ${to.join(', ')}`)

    const attachments = pdfBuffer ? [{
      filename: `signed-contract-${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      content: pdfBuffer,
    }] : []

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: htmlContent,
      text: textContent,
      attachments,
    })

    if (error) {
      console.error('[Email] Failed to send email:', error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Email sent successfully, id: ${data?.id}`)
    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending email:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
