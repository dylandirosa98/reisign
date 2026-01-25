import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || 'REI Sign <noreply@reisign.com>'

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
