import { useMemo, useState } from 'react';
import {
  LINK_CATEGORY_META,
  SOCIAL_PLATFORMS,
  buildSocialPresencePayload,
  countConnectedLinks,
  formFromProfile,
  readLinkValue,
  writeLinkValue,
  type LinkCategoryId,
  type SocialPresenceForm,
} from '@/shared/constants/socialPlatforms';
import { usersApi } from '@/shared/api';

type Props = {
  isCompany: boolean;
  initial: {
    githubUrl?: string | null;
    portfolioUrl?: string | null;
    designLinks?: import('@/shared/constants/disciplines').DesignLinks | null;
    socialLinks?: import('@/shared/constants/socialPlatforms').SocialLinks | null;
  };
  onSaved?: () => void;
  onMessage?: (msg: string) => void;
  onError?: (msg: string) => void;
};

function LinkCategoryBlock({
  category,
  isCompany,
  form,
  setForm,
  showDeveloperExtras,
}: {
  category: LinkCategoryId;
  isCompany: boolean;
  form: SocialPresenceForm;
  setForm: React.Dispatch<React.SetStateAction<SocialPresenceForm>>;
  showDeveloperExtras: boolean;
}) {
  const platforms = SOCIAL_PLATFORMS.filter((p) => {
    if (p.category !== category) return false;
    if (isCompany && p.developerOnly && !showDeveloperExtras) return false;
    return true;
  });
  if (platforms.length === 0) return null;

  const meta = LINK_CATEGORY_META[category];

  return (
    <div className="rounded-xl border border-slate-800/90 bg-surface-900/40">
      <div className="border-b border-slate-800/80 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-medium text-slate-200">{meta.title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{meta.description}</p>
      </div>
      <ul className="divide-y divide-slate-800/60">
        {platforms.map((platform) => {
          const value = readLinkValue(form, platform);
          const connected = value.trim().length > 0;
          return (
            <li key={platform.id} className="px-4 py-4 sm:px-5">
              <div className="flex gap-3 sm:gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                    connected
                      ? 'border-brand-500/30 bg-brand-500/10 text-brand-400'
                      : 'border-slate-700/80 bg-surface-800 text-slate-400'
                  }`}
                >
                  {platform.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-slate-100">{platform.label}</span>
                    {connected ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                        Linked
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-slate-600">Not set</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{platform.description}</p>
                  <input
                    type="url"
                    className="input mt-2.5 w-full text-sm"
                    placeholder={platform.placeholder}
                    value={value}
                    onChange={(e) =>
                      setForm((prev) => writeLinkValue(prev, platform, e.target.value))
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SocialPresenceSettings({ isCompany, initial, onSaved, onMessage, onError }: Props) {
  const [form, setForm] = useState<SocialPresenceForm>(() => formFromProfile(initial));
  const [saving, setSaving] = useState(false);
  const [showDeveloperExtras, setShowDeveloperExtras] = useState(false);

  const connected = useMemo(() => countConnectedLinks(form, isCompany && !showDeveloperExtras), [form, isCompany, showDeveloperExtras]);

  const categories: LinkCategoryId[] = isCompany
    ? ['professional', 'social', 'community', ...(showDeveloperExtras ? (['design'] as LinkCategoryId[]) : [])]
    : ['professional', 'design', 'social', 'community'];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError?.('');
    try {
      const payload = buildSocialPresencePayload(form);
      await usersApi.updateMe(payload);
      onMessage?.('Online presence updated — links are live on your public profile.');
      onSaved?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not save links');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="social" className="card scroll-mt-24 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-brand-400">
            {isCompany ? 'Brand & social presence' : 'Online presence'}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
            {isCompany
              ? 'Connect the channels where clients and candidates find your brand. Your company website is managed in Company profile above.'
              : 'Manage every link that appears on your public profile — grouped by purpose so visitors know where to find you.'}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-surface-900/60 px-3 py-2 text-center">
          <p className="font-mono text-lg font-semibold text-brand-400">{connected}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Connected</p>
        </div>
      </div>

      {isCompany && (
        <button
          type="button"
          className="mt-4 text-xs text-slate-500 hover:text-brand-400"
          onClick={() => setShowDeveloperExtras((v) => !v)}
        >
          {showDeveloperExtras ? '− Hide GitHub & design portfolio links' : '+ Add GitHub or design portfolio links (optional)'}
        </button>
      )}

      <form onSubmit={handleSave} className="mt-5 space-y-4">
        {categories.map((cat) => (
          <LinkCategoryBlock
            key={cat}
            category={cat}
            isCompany={isCompany}
            form={form}
            setForm={setForm}
            showDeveloperExtras={showDeveloperExtras}
          />
        ))}

        <p className="text-xs text-slate-600">
          Use full URLs including <span className="font-mono text-slate-500">https://</span>. Leave a field empty to
          remove it from your profile.
        </p>

        <button type="submit" className="btn-primary text-xs" disabled={saving}>
          {saving ? 'Saving…' : 'Save online presence'}
        </button>
      </form>
    </section>
  );
}
