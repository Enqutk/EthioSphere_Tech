export const GENDER_VALUES = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'];

export const GENDER_LABELS = {
  MALE: 'Male',
  FEMALE: 'Female',
  NON_BINARY: 'Non-binary',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

const MIN_AGE_YEARS = 13;
const MAX_AGE_YEARS = 120;

export function parseGender(input) {
  if (!input || typeof input !== 'string') return null;
  const key = input.trim().toUpperCase().replace(/-/g, '_').replace(/\s+/g, '_');
  const aliases = {
    MAN: 'MALE',
    WOMAN: 'FEMALE',
    NONBINARY: 'NON_BINARY',
    NON_BINARY: 'NON_BINARY',
    PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY',
    OTHER: 'PREFER_NOT_TO_SAY',
  };
  const mapped = aliases[key] || key;
  return GENDER_VALUES.includes(mapped) ? mapped : null;
}

/** Parse YYYY-MM-DD; returns Date at UTC midnight or throws with message. */
export function parseDateOfBirth(input) {
  if (!input || typeof input !== 'string') {
    const err = new Error('Date of birth is required.');
    err.status = 400;
    throw err;
  }
  const trimmed = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const err = new Error('Date of birth must be YYYY-MM-DD.');
    err.status = 400;
    throw err;
  }
  const [y, m, d] = trimmed.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    const err = new Error('Date of birth is not a valid calendar date.');
    err.status = 400;
    throw err;
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (date.getTime() > todayUtc) {
    const err = new Error('Date of birth cannot be in the future.');
    err.status = 400;
    throw err;
  }

  const minBirth = new Date(todayUtc);
  minBirth.setUTCFullYear(minBirth.getUTCFullYear() - MIN_AGE_YEARS);
  if (date.getTime() > minBirth.getTime()) {
    const err = new Error(`You must be at least ${MIN_AGE_YEARS} years old to register.`);
    err.status = 400;
    throw err;
  }

  const maxBirth = new Date(todayUtc);
  maxBirth.setUTCFullYear(maxBirth.getUTCFullYear() - MAX_AGE_YEARS);
  if (date.getTime() < maxBirth.getTime()) {
    const err = new Error('Please enter a valid date of birth.');
    err.status = 400;
    throw err;
  }

  return date;
}
