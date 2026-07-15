import dns from 'node:dns/promises';

/** Common disposable / throwaway providers (lowercase hosts). */
const DISPOSABLE_HOSTS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'discard.email',
  'fakeinbox.com',
  'emailondeck.com',
]);

const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/**
 * @param {string} email
 * @returns {{ ok: true, email: string } | { ok: false, error: string }}
 */
export function parseStrictEmail(email) {
  if (typeof email !== 'string') return { ok: false, error: 'Enter a valid email address.' };
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  const [local, host] = normalized.split('@');
  if (!local || !host || local.length > 64) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (host.includes('..') || host.startsWith('.') || host.endsWith('.')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  const labels = host.split('.');
  const tld = labels[labels.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]+$/i.test(tld)) {
    return { ok: false, error: 'Email domain looks invalid. Use a real email provider.' };
  }
  // Reject nonsense hosts: long random labels with embedded digits
  for (const label of labels.slice(0, -1)) {
    if (label.length > 63) {
      return { ok: false, error: 'Email domain looks invalid. Use a real email provider.' };
    }
    const digits = (label.match(/\d/g) || []).length;
    if (label.length >= 10 && digits >= 3) {
      return { ok: false, error: 'Email domain looks invalid. Use a real email provider.' };
    }
    if (label.length >= 20) {
      return { ok: false, error: 'Email domain looks invalid. Use a real email provider.' };
    }
  }
  if (DISPOSABLE_HOSTS.has(host)) {
    return { ok: false, error: 'Disposable email addresses are not allowed. Use a permanent email.' };
  }
  return { ok: true, email: normalized };
}

async function domainResolves(host) {
  try {
    const mx = await dns.resolveMx(host);
    if (Array.isArray(mx) && mx.length > 0) return true;
  } catch {
    /* try A/AAAA */
  }
  try {
    await dns.resolve4(host);
    return true;
  } catch {
    /* try AAAA */
  }
  try {
    await dns.resolve6(host);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format + disposable checks, then DNS so random non-existent domains fail.
 * Skip DNS when EMAIL_SKIP_DNS_CHECK=1 (local offline) or NODE_ENV=test.
 */
export async function validateDeliverableEmail(rawEmail) {
  const parsed = parseStrictEmail(rawEmail);
  if (!parsed.ok) return parsed;

  const skipDns =
    process.env.EMAIL_SKIP_DNS_CHECK === '1' ||
    process.env.NODE_ENV === 'test';

  if (!skipDns) {
    const host = parsed.email.split('@')[1];
    const ok = await domainResolves(host);
    if (!ok) {
      return {
        ok: false,
        error: 'That email domain does not appear to exist. Check for typos or use another address.',
      };
    }
  }

  return parsed;
}

/** express-validator custom async check for registration. */
export async function assertDeliverableEmail(value) {
  const result = await validateDeliverableEmail(value);
  if (!result.ok) throw new Error(result.error);
  return true;
}
