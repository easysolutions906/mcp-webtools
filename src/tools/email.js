import dns from 'node:dns/promises';
import disposableDomains from '../data/disposable-domains.js';
import freeProviders from '../data/free-providers.js';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const MIN_TLD_LENGTH = 2;
const DNS_TIMEOUT_MS = 5000;
const MAX_MX_RESULTS = 5;

const SCORE_WEIGHTS = Object.freeze({
  domainExists: 20,
  hasMx: 30,
  notDisposable: 25,
  notFree: 10,
  multipleMx: 15,
  singleMx: 5,
});

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), ms)),
]);

const validateSyntax = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required and must be a string' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return { valid: false, reason: `Email exceeds maximum length of ${MAX_EMAIL_LENGTH} characters` };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, reason: 'Invalid email syntax' };
  }

  const [local, domain] = trimmed.split('@');

  if (local.length > MAX_LOCAL_LENGTH) {
    return { valid: false, reason: `Local part exceeds maximum length of ${MAX_LOCAL_LENGTH} characters` };
  }

  if (!domain || !domain.includes('.')) {
    return { valid: false, reason: 'Domain must contain at least one dot' };
  }

  const tld = domain.split('.').pop();
  if (tld.length < MIN_TLD_LENGTH) {
    return { valid: false, reason: `Top-level domain must be at least ${MIN_TLD_LENGTH} characters` };
  }

  return { valid: true, local, domain, email: trimmed };
};

const checkMxRecords = async (domain) => {
  try {
    const records = await withTimeout(dns.resolveMx(domain), DNS_TIMEOUT_MS);
    if (records && records.length > 0) {
      const sorted = records
        .sort((a, b) => a.priority - b.priority)
        .map(({ exchange, priority }) => ({ exchange, priority }));
      return { hasMx: true, records: sorted };
    }
    return { hasMx: false, records: [] };
  } catch {
    return { hasMx: false, records: [] };
  }
};

const checkDomain = async (domain) => {
  try {
    const addresses = await withTimeout(dns.resolve4(domain), DNS_TIMEOUT_MS);
    return { exists: addresses.length > 0 };
  } catch {
    try {
      const addresses = await withTimeout(dns.resolve6(domain), DNS_TIMEOUT_MS);
      return { exists: addresses.length > 0 };
    } catch {
      return { exists: false };
    }
  }
};

const computeScore = (domainExists, hasMx, isDisposable, isFree, mxCount) => [
  domainExists ? SCORE_WEIGHTS.domainExists : 0,
  hasMx ? SCORE_WEIGHTS.hasMx : 0,
  !isDisposable ? SCORE_WEIGHTS.notDisposable : 0,
  !isFree ? SCORE_WEIGHTS.notFree : 0,
  mxCount > 1 ? SCORE_WEIGHTS.multipleMx : (hasMx ? SCORE_WEIGHTS.singleMx : 0),
].reduce((sum, n) => sum + n, 0);

const determineReason = (domainExists, hasMx, isDisposable) => {
  if (!domainExists) { return 'Domain does not exist'; }
  if (!hasMx) { return 'No MX records found - domain cannot receive email'; }
  if (isDisposable) { return 'Disposable/temporary email address detected'; }
  return 'Valid email address';
};

const validate = async (email) => {
  const syntax = validateSyntax(email);

  if (!syntax.valid) {
    return {
      email: email || '',
      valid: false,
      reason: syntax.reason,
      checks: { syntax: false, domain: false, mx: false, disposable: false, free: false },
    };
  }

  const { domain, email: normalized } = syntax;
  const isDisposable = disposableDomains.has(domain);
  const isFree = freeProviders.has(domain);

  const [mx, domainCheck] = await Promise.all([
    checkMxRecords(domain),
    checkDomain(domain),
  ]);

  const valid = domainCheck.exists && mx.hasMx && !isDisposable;
  const score = computeScore(domainCheck.exists, mx.hasMx, isDisposable, isFree, mx.records.length);

  return {
    email: normalized,
    valid,
    score,
    reason: determineReason(domainCheck.exists, mx.hasMx, isDisposable),
    checks: {
      syntax: true,
      domain: domainCheck.exists,
      mx: mx.hasMx,
      disposable: isDisposable,
      free: isFree,
    },
    mx: mx.records.slice(0, MAX_MX_RESULTS),
    domain: {
      name: domain,
      tld: domain.split('.').pop(),
    },
  };
};

export { validate };
