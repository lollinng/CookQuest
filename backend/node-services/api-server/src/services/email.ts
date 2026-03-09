import nodemailer from 'nodemailer';
import { logger } from './logger';

const DAILY_LIMIT = 500;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 15000]; // ms — exponential-ish backoff

// In-memory daily send counter (resets on server restart or midnight)
let dailySendCount = 0;
let dailyResetDate = new Date().toDateString();

function checkAndIncrementDaily(): boolean {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) {
    dailySendCount = 0;
    dailyResetDate = today;
  }
  if (dailySendCount >= DAILY_LIMIT) {
    return false;
  }
  dailySendCount++;
  return true;
}

export function getDailyEmailStats() {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) {
    return { sent: 0, remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
  }
  return { sent: dailySendCount, remaining: DAILY_LIMIT - dailySendCount, limit: DAILY_LIMIT };
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as Record<string, unknown>).responseCode as number | undefined;
  const msg = ((err as Record<string, unknown>).message || '') as string;
  // Gmail rate limit / temporary errors
  if (code && (code === 421 || code === 454 || code === 450)) return true;
  if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) return true;
  if (msg.includes('Too many') || msg.includes('rate') || msg.includes('try again')) return true;
  return false;
}

async function sendWithRetry(mailOptions: nodemailer.SendMailOptions): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return;
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      const retryable = isRetryableError(err);

      if (isLast || !retryable) {
        throw err;
      }

      const delay = RETRY_DELAYS[attempt] || 15000;
      logger.warn({ err, attempt: attempt + 1, nextRetryMs: delay }, 'Email send failed, retrying...');
      await sleep(delay);
    }
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  // Check daily limit before attempting
  if (!checkAndIncrementDaily()) {
    const stats = getDailyEmailStats();
    logger.error({ to, stats }, 'Gmail daily send limit reached (500/day). Email not sent.');
    throw new EmailLimitError('Daily email limit reached. Please try again tomorrow.');
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/waitlist/verify?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#fffbeb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color:#f59e0b;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">CookQuest</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Verify your email</h2>
              <p style="margin:0 0 24px;color:#4b5563;font-size:16px;line-height:1.5;">
                Thanks for joining the CookQuest waitlist! Click the button below to verify your email address.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display:inline-block;background-color:#f59e0b;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 32px;border-radius:8px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verifyUrl}" style="color:#f59e0b;word-break:break-all;">${verifyUrl}</a>
              </p>
              <p style="margin:16px 0 0;color:#9ca3af;font-size:13px;">
                This link expires in 24 hours.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background-color:#f9fafb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                You received this email because someone signed up for the CookQuest waitlist with this address.
                If this wasn't you, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await sendWithRetry({
      from: `"CookQuest" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Verify your CookQuest waitlist email',
      html,
    });
    logger.info({ to, dailySent: dailySendCount }, 'Verification email sent');
  } catch (err) {
    // Rollback counter on failure
    dailySendCount = Math.max(0, dailySendCount - 1);
    logger.error({ err, to }, 'Failed to send verification email');
    throw err;
  }
}

export class EmailLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailLimitError';
  }
}
