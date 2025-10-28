import { Resend } from 'resend'

// Define the structure for the parameters used in the template
interface EmailParams {
  greeting?: string
  body_text: string
  action_url: string
  action_text: string
  footer_text: string
}

// Define the arguments for the sendEmail function
interface SendEmailArgs {
  to: string
  subject: string
  params: EmailParams
}

// Define the arguments for the new Vue Email sendEmail function
interface VueEmailSendArgs {
  to: string
  subject: string
  template: string
  props: Record<string, any>
  locale?: string
}

const RESEND_API_KEY = process.env.RESEND_API_KEY

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL

if (!RESEND_API_KEY) {
  console.warn(
    'RESEND_API_KEY environment variable is not set. Email sending will be disabled.',
  )
}
// Update warning message to check for RESEND_FROM_EMAIL
if (!RESEND_FROM_EMAIL) {
  console.warn(
    'RESEND_FROM_EMAIL environment variable is not set. Email sending may fail.',
  )
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// Enhanced template-based sendEmail function with conditionals
export const sendEmail = async ({ to, subject, template, props, locale = 'en' }: VueEmailSendArgs) => {
  // Check for RESEND_FROM_EMAIL
  if (!resend || !RESEND_FROM_EMAIL) {
    console.error(
      'Email prerequisites not met (Resend key/instance or RESEND_FROM_EMAIL). Skipping email send.',
    )
    return Promise.resolve() // Resolve promise even if email not sent to avoid breaking auth flow
  }

  try {
    // Generate HTML content based on template type
    let htmlContent = ''
    let textContent = ''

    switch (template) {
      case 'PasswordReset':
        htmlContent = generatePasswordResetHTML(props, subject)
        textContent = generatePasswordResetText(props)
        break
      case 'EmailVerificationOTP':
        htmlContent = generateOTPHTML(props, subject, 'email-verification')
        textContent = generateOTPText(props, 'email-verification')
        break
      case 'SignInOTP':
        htmlContent = generateOTPHTML(props, subject, 'sign-in')
        textContent = generateOTPText(props, 'sign-in')
        break
      default:
        throw new Error(`Unknown email template: ${template}`)
    }

    console.log(
      `Attempting to send email via Resend to ${to} with subject: ${subject}`,
    )

    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: subject,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error(`Resend API Error sending email to ${to}:`, error)
      throw error
    }

    console.log(`Email successfully sent to ${to}, ID: ${data?.id}`)
    return data
  } catch (error) {
    console.error(`Caught error during email sending process to ${to}:`, error)
    throw error
  }
}

// HTML template generators with conditionals
function generatePasswordResetHTML(props: any, subject: string): string {
  const { greeting, bodyText, actionUrl, actionText, footerText } = props
  const currentYear = new Date().getFullYear()

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
    .header h1 { color: #4CAF50; margin: 0; }
    .content { padding: 20px 0; }
    .content p { margin-bottom: 15px; }
    .button { display: inline-block; background-color: #4CAF50; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; text-transform: uppercase; text-align: center; margin-top: 10px; margin-bottom: 20px; }
    .footer { text-align: center; font-size: 0.9em; color: #777; padding-top: 20px; border-top: 1px solid #eeeeee; }
    a { color: #4CAF50; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ApexPro</h1>
    </div>
    <div class="content">
      <p>${greeting}</p>
      <p>${bodyText}</p>
      ${actionUrl ? `<p style="text-align: center;"><a href="${actionUrl}" class="button">${actionText}</a></p>` : ''}
      <p>${footerText}</p>
    </div>
    <div class="footer">
      <p>&copy; ${currentYear} ApexPro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

function generateOTPHTML(props: any, subject: string, type: string): string {
  const { greeting, bodyText, otp, footerText } = props
  const currentYear = new Date().getFullYear()

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee; }
    .header h1 { color: #4CAF50; margin: 0; }
    .content { padding: 20px 0; }
    .content p { margin-bottom: 15px; }
    .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; margin: 20px 0; padding: 20px; background-color: #f8f9fa; border: 2px dashed #4CAF50; border-radius: 8px; text-align: center; }
    .footer { text-align: center; font-size: 0.9em; color: #777; padding-top: 20px; border-top: 1px solid #eeeeee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ApexPro</h1>
    </div>
    <div class="content">
      <p>${greeting}</p>
      <p>${bodyText}</p>
      <div class="otp-code">${otp}</div>
      <p>${footerText}</p>
    </div>
    <div class="footer">
      <p>&copy; ${currentYear} ApexPro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

function generatePasswordResetText(props: any): string {
  const { greeting, bodyText, actionUrl, actionText, footerText } = props
  return `${greeting}\n\n${bodyText}\n\n${actionUrl ? `Please visit: ${actionUrl}` : ''}\n\n${footerText}`
}

function generateOTPText(props: any, type: string): string {
  const { greeting, bodyText, otp, footerText } = props
  return `${greeting}\n\n${bodyText}\n\nYour code: ${otp}\n\n${footerText}`
}

// Legacy sendEmail function for backward compatibility
export const sendEmailLegacy = async ({ to, subject, params }: SendEmailArgs) => {
  // Check for RESEND_FROM_EMAIL
  if (!resend || !RESEND_FROM_EMAIL) {
    console.error(
      'Email prerequisites not met (Resend key/instance or RESEND_FROM_EMAIL). Skipping email send.',
    )
    return Promise.resolve() // Resolve promise even if email not sent to avoid breaking auth flow
  }

  // Simple text version (can be improved)
  const textContent = `${params.greeting || 'Hello,'}\n\n${params.body_text}\n\nPlease visit: ${params.action_url}\n\n${params.footer_text}`

  console.log(
    `Attempting to send email via Resend to ${to} with subject: ${subject}`,
  )
  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: subject,
      html: `<div style="font-family: sans-serif; padding: 20px;"><h1>ApexPro</h1><p>${params.greeting || 'Hello,'}</p><p>${params.body_text}</p><a href="${params.action_url}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">${params.action_text}</a><p>${params.footer_text}</p></div>`,
      text: textContent,
    })

    if (error) {
      console.error(`Resend API Error sending email to ${to}:`, error)
      throw error
    }

    console.log(`Email successfully sent to ${to}, ID: ${data?.id}`)
    return data
  } catch (error) {
    console.error(`Caught error during email sending process to ${to}:`, error)
    throw error
  }
}
