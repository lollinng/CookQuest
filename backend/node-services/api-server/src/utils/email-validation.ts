import dns from 'dns';
import { logger } from '../services/logger';

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'tempmail.com',
  'tempmail.net',
  'yopmail.com',
  'yopmail.fr',
  'throwaway.email',
  'temp-mail.org',
  'fakeinbox.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'dispostable.com',
  'mailnesia.com',
  'maildrop.cc',
  'discard.email',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'trashmail.org',
  'mytemp.email',
  'mohmal.com',
  'getnada.com',
  'tempail.com',
  'emailondeck.com',
  'harakirimail.com',
  'tempr.email',
  'mailsac.com',
  'burnermail.io',
  'inboxkitten.com',
  'jetable.org',
  'spamgourmet.com',
  'mailexpire.com',
  'incognitomail.org',
  'mailcatch.com',
  'mintemail.com',
  'sneakemail.com',
  'spamfree24.org',
  'trash-mail.com',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'tempinbox.com',
  '10minutemail.com',
  'guerrillamail.de',
  'mailtemp.info',
  'tempmailaddress.com',
  'mailnator.com',
  'receiveee.com',
  'disposableemailaddresses.emailmiser.com',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  // 1. Format check
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, reason: 'Invalid email format.' };
  }

  const domain = email.split('@')[1].toLowerCase();

  // 2. MX record check
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: 'Email domain does not accept mail.' };
    }
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return { valid: false, reason: 'Email domain does not accept mail.' };
    }
    // DNS errors (timeout, etc.) = soft-fail — allow through with warning
    logger.warn({ domain, err: err.message }, 'DNS MX lookup failed (soft-fail)');
  }

  // 3. Disposable domain blocklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable email addresses are not allowed.' };
  }

  return { valid: true };
}
