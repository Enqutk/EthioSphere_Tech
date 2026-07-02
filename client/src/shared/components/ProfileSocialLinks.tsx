import type { DesignLinks } from '@/shared/constants/disciplines';
import {
  SOCIAL_PLATFORMS,
  readLinkValue,
  formFromProfile,
  type SocialPresenceForm,
} from '@/shared/constants/socialPlatforms';

type Props = {
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  designLinks?: DesignLinks | null;
  socialLinks?: import('@/shared/constants/socialPlatforms').SocialLinks | null;
  isCompany?: boolean;
  compact?: boolean;
};

export function ProfileSocialLinks({
  githubUrl,
  portfolioUrl,
  designLinks,
  socialLinks,
  isCompany = false,
  compact = false,
}: Props) {
  const form: SocialPresenceForm = formFromProfile({ githubUrl, portfolioUrl, designLinks, socialLinks });

  const linked = SOCIAL_PLATFORMS.filter((p) => {
    if (isCompany && p.developerOnly) return false;
    return readLinkValue(form, p).trim().length > 0;
  });

  if (linked.length === 0) return null;

  if (compact) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {linked.map((platform) => {
          const href = readLinkValue(form, platform);
          return (
            <a
              key={platform.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={platform.label}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-surface-900/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-brand-500/40 hover:text-brand-300"
            >
              <span className="text-slate-400">{platform.icon}</span>
              {platform.label}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-800/80 pt-4">
      <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Find me online</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {linked.map((platform) => {
          const href = readLinkValue(form, platform);
          return (
            <li key={platform.id}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-lg border border-slate-800/80 bg-surface-900/40 px-3 py-2.5 transition hover:border-brand-500/30 hover:bg-surface-900/80"
              >
                <span className="text-slate-400 transition group-hover:text-brand-400">{platform.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-200">{platform.label}</span>
                  <span className="block truncate text-xs text-slate-500 group-hover:text-slate-400">
                    {href.replace(/^https?:\/\//, '')}
                  </span>
                </span>
                <span className="text-slate-600 group-hover:text-brand-400" aria-hidden>
                  ↗
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
