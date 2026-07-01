/** Normalize company challenge language requirements (e.g. Python, JavaScript). */
export function normalizeRequiredLanguages(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t) continue;
    const key = t.slice(0, 40);
    if (!out.some((x) => x.toLowerCase() === key.toLowerCase())) out.push(key);
  }
  return out.slice(0, 10);
}

export function languageMatchesRequirement(language, requiredLanguages) {
  if (!requiredLanguages?.length) return true;
  if (!language || typeof language !== 'string') return false;
  const norm = language.trim().toLowerCase();
  return requiredLanguages.some((r) => {
    const req = r.trim().toLowerCase();
    return norm === req || norm.includes(req) || req.includes(norm);
  });
}

export function repoMatchesLanguageRequirements(primaryLanguage, languagesMap, requiredLanguages) {
  if (!requiredLanguages?.length) return true;
  const keys = languagesMap && typeof languagesMap === 'object' ? Object.keys(languagesMap) : [];
  const candidates = [primaryLanguage, ...keys].filter(Boolean).map((s) => String(s).toLowerCase());
  return requiredLanguages.some((req) => {
    const r = req.trim().toLowerCase();
    return candidates.some((c) => c === r || c.includes(r) || r.includes(c));
  });
}
