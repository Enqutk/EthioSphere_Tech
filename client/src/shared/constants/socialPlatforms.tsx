import type { ReactNode } from 'react';
import type { DesignLinks } from '@/shared/constants/disciplines';

export type SocialLinkKey =
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'tiktok'
  | 'threads'
  | 'bluesky'
  | 'mastodon'
  | 'discord'
  | 'telegram';

export type SocialLinks = Partial<Record<SocialLinkKey, string>>;

export type LinkCategoryId = 'professional' | 'design' | 'social' | 'community';

export type StoredLinkField =
  | { kind: 'scalar'; field: 'githubUrl' | 'portfolioUrl' }
  | { kind: 'design'; field: keyof DesignLinks }
  | { kind: 'social'; field: SocialLinkKey };

export type SocialPlatformDef = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  category: LinkCategoryId;
  storage: StoredLinkField;
  icon: ReactNode;
  /** Hide for company accounts unless optional group expanded */
  developerOnly?: boolean;
};

const iconClass = 'h-5 w-5';

function IconGitHub() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.4 3.4 5.6 3.4 9s-1.2 6.6-3.4 9c-2.2-2.4-3.4-5.6-3.4-9s1.2-6.6 3.4-9Z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.919-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.39c0 3.83-2.66 7.01-6.56 7.87-1.95.41-3.97.15-5.75-.73-1.78-.88-3.15-2.35-3.85-4.12-.7-1.77-.72-3.72-.05-5.51.67-1.79 2.01-3.28 3.75-4.09 1.74-.81 3.71-.95 5.55-.4v4.09c-1.03-.33-2.16-.28-3.15.15-.99.43-1.77 1.22-2.17 2.19-.4.97-.4 2.07-.01 3.04.39.97 1.17 1.75 2.14 2.15.97.4 2.07.4 3.04.01.97-.39 1.75-1.17 2.15-2.14.2-.48.3-.99.3-1.51V.02h3.92z" />
    </svg>
  );
}

function IconThreads() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.435 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-.584-2.043-1.587-3.583-3.018-4.684-1.428-1.1-3.307-1.673-5.59-1.688-2.905.018-5.113.928-6.565 2.708-1.336 1.637-2.019 3.997-2.031 7.006v.017c.012 3.01.695 5.37 2.031 7.006 1.452 1.78 3.66 2.69 6.565 2.708 2.283-.015 4.162-.588 5.59-1.688 1.431-1.101 2.434-2.641 3.018-4.684.327-1.145.485-2.411.485-3.812 0-1.226-.127-2.306-.376-3.213-.25-.907-.62-1.668-1.1-2.268-.48-.6-1.07-1.05-1.76-1.35-.69-.3-1.48-.45-2.36-.45-.88 0-1.67.15-2.36.45-.69.3-1.28.75-1.76 1.35-.48.6-.85 1.36-1.1 2.268-.25.907-.376 1.987-.376 3.213 0 .88.07 1.69.21 2.43.14.74.35 1.38.63 1.92.28.54.63.96 1.05 1.26.42.3.9.45 1.44.45.54 0 1.02-.15 1.44-.45.42-.3.77-.72 1.05-1.26.28-.54.49-1.18.63-1.92.14-.74.21-1.55.21-2.43h2.04c0 1.4-.16 2.67-.485 3.812-.584 2.043-1.587 3.583-3.018 4.684-1.428 1.1-3.307 1.673-5.59 1.688z" />
    </svg>
  );
}

function IconBluesky() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.913 0 3.583 0 4.755c0 .694.117 5.803.194 6.674.379 4.017 1.75 5.364 3.748 5.687 2.192.356 4.012-1.032 4.012-1.032s-.725 1.316-2.625 1.754c-1.9.438-3.975-.438-5.437-1.678-1.462-1.24-2.625-3.675-2.625-3.675S1.5 14.025 1.5 17.25c0 3.225 2.625 5.85 5.85 5.85 3.225 0 5.85-2.625 5.85-5.85 0-3.225-2.625-5.85-5.85-5.85-.694 0-1.35.117-1.95.329 1.087-2.114 4.046-6.053 6.798-7.995C21.434.944 22.439 1.266 23.098 1.565c.763.348.902 2.018.902 3.19 0 .694-.117 5.803-.194 6.674-.379 4.017-1.75 5.364-3.748 5.687-2.192.356-4.012-1.032-4.012-1.032s.725 1.316 2.625 1.754c1.9.438 3.975-.438 5.437-1.678 1.462-1.24 2.625-3.675 2.625-3.675s1.875 2.475 1.875 5.7c0 3.225-2.625 5.85-5.85 5.85-3.225 0-5.85-2.625-5.85-5.85 0-3.225 2.625-5.85 5.85-5.85.694 0 1.35.117 1.95.329z" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function IconFigma() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm-4 4a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-12a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm8 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm-4 8a4 4 0 0 1 4-4h4v4a4 4 0 1 1-8 0z" />
    </svg>
  );
}

function IconBehance() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.987h-6.466V3.985h8.988c2.702 0 5.111 1.17 5.111 4.005 0 2.586-1.923 3.952-3.893 4.088v.071c2.512.104 4.039 1.823 4.039 4.438 0 3.345-2.53 4.49-5.779 4.49zM4.911 13.12h4.427c1.593 0 2.419-.864 2.419-2.074 0-1.303-.955-1.958-2.419-1.958H4.911V13.12zm0 6.314h4.715c1.769 0 2.586-1.017 2.586-2.305 0-1.443-1.008-2.117-2.915-2.117H4.911v4.422z" />
    </svg>
  );
}

function IconDribbble() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.375 0 0 5.375 0 12s5.375 12 12 12 12-5.375 12-12S18.625 0 12 0zm9.885 11.441c-2.575-.422-4.943-.445-7.103-.073-.072-.164-.146-.329-.224-.494 2.063-1.001 3.9-2.419 5.521-4.256 1.411 1.607 2.352 3.757 2.806 5.823zm-3.442-6.774c-1.411 1.608-3.067 2.876-4.952 3.803-1.416-2.386-2.956-4.381-4.581-5.946C7.523 2.287 10.088 1.5 12 1.5c1.669 0 3.276.333 4.443.967zM4.881 3.297C6.545 4.915 8.128 7.015 9.592 9.549c-2.685.812-5.482.986-8.392.552.903-2.783 2.889-5.015 5.681-6.804zM1.5 12.001c0-.276.022-.551.044-.826 3.268.548 6.329.337 9.179-.601.078.157.152.322.22.49-3.239 1.213-6.037 3.315-8.337 6.299C1.87 16.294 1.5 14.188 1.5 12.001zm2.999 5.329c1.996-2.609 4.484-4.495 7.433-5.651.933 2.406 1.656 4.989 2.164 7.741-3.906 1.108-7.174-.337-9.597-2.09zm11.249 2.532c-.519-2.563-1.187-4.958-2.001-7.178 1.861-.287 3.833-.027 5.916.784-1.032 2.174-2.721 4.078-4.915 5.394z" />
    </svg>
  );
}

export const LINK_CATEGORY_META: Record<
  LinkCategoryId,
  { title: string; description: string }
> = {
  professional: {
    title: 'Professional',
    description: 'Work profiles, portfolios, and code repositories visitors trust first.',
  },
  design: {
    title: 'Design portfolios',
    description: 'Showcase creative work on platforms your discipline uses most.',
  },
  social: {
    title: 'Social networks',
    description: 'Public channels where your audience or community already follows you.',
  },
  community: {
    title: 'Community & chat',
    description: 'Invite links to groups, servers, or channels — not private DMs.',
  },
};

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  {
    id: 'github',
    label: 'GitHub',
    description: 'Open-source work and contributions',
    placeholder: 'https://github.com/yourname',
    category: 'professional',
    storage: { kind: 'scalar', field: 'githubUrl' },
    icon: <IconGitHub />,
    developerOnly: true,
  },
  {
    id: 'portfolio',
    label: 'Portfolio site',
    description: 'Personal site, GitHub Pages, Vercel, or Notion portfolio',
    placeholder: 'https://yoursite.dev',
    category: 'professional',
    storage: { kind: 'scalar', field: 'portfolioUrl' },
    icon: <IconGlobe />,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Professional profile or company page',
    placeholder: 'https://linkedin.com/in/you',
    category: 'professional',
    storage: { kind: 'social', field: 'linkedin' },
    icon: <IconLinkedIn />,
  },
  {
    id: 'figma',
    label: 'Figma',
    description: 'Design files and community profile',
    placeholder: 'https://figma.com/@yourname',
    category: 'design',
    storage: { kind: 'design', field: 'figma' },
    icon: <IconFigma />,
    developerOnly: true,
  },
  {
    id: 'behance',
    label: 'Behance',
    description: 'Creative projects and case studies',
    placeholder: 'https://behance.net/yourname',
    category: 'design',
    storage: { kind: 'design', field: 'behance' },
    icon: <IconBehance />,
    developerOnly: true,
  },
  {
    id: 'dribbble',
    label: 'Dribbble',
    description: 'Shots, UI work, and visual explorations',
    placeholder: 'https://dribbble.com/yourname',
    category: 'design',
    storage: { kind: 'design', field: 'dribbble' },
    icon: <IconDribbble />,
    developerOnly: true,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    description: 'Updates, threads, and public conversation',
    placeholder: 'https://x.com/yourname',
    category: 'social',
    storage: { kind: 'social', field: 'twitter' },
    icon: <IconX />,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Visual brand and behind-the-scenes content',
    placeholder: 'https://instagram.com/yourname',
    category: 'social',
    storage: { kind: 'social', field: 'instagram' },
    icon: <IconInstagram />,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Talks, tutorials, or company channel',
    placeholder: 'https://youtube.com/@yourname',
    category: 'social',
    storage: { kind: 'social', field: 'youtube' },
    icon: <IconYouTube />,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Page or public profile',
    placeholder: 'https://facebook.com/yourpage',
    category: 'social',
    storage: { kind: 'social', field: 'facebook' },
    icon: <IconFacebook />,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Short-form video and reach',
    placeholder: 'https://tiktok.com/@yourname',
    category: 'social',
    storage: { kind: 'social', field: 'tiktok' },
    icon: <IconTikTok />,
  },
  {
    id: 'threads',
    label: 'Threads',
    description: 'Text updates on Meta’s Threads network',
    placeholder: 'https://threads.net/@yourname',
    category: 'social',
    storage: { kind: 'social', field: 'threads' },
    icon: <IconThreads />,
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    description: 'Decentralized social profile',
    placeholder: 'https://bsky.app/profile/you.bsky.social',
    category: 'social',
    storage: { kind: 'social', field: 'bluesky' },
    icon: <IconBluesky />,
  },
  {
    id: 'mastodon',
    label: 'Mastodon',
    description: 'Fediverse profile on your home instance',
    placeholder: 'https://mastodon.social/@you',
    category: 'social',
    storage: { kind: 'social', field: 'mastodon' },
    icon: <IconGlobe />,
  },
  {
    id: 'discord',
    label: 'Discord',
    description: 'Server invite — use a permanent invite link',
    placeholder: 'https://discord.gg/your-invite',
    category: 'community',
    storage: { kind: 'social', field: 'discord' },
    icon: <IconDiscord />,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Public channel or group link',
    placeholder: 'https://t.me/yourchannel',
    category: 'community',
    storage: { kind: 'social', field: 'telegram' },
    icon: <IconTelegram />,
  },
];

export type SocialPresenceForm = {
  githubUrl: string;
  portfolioUrl: string;
  designLinks: DesignLinks;
  socialLinks: SocialLinks;
};

export function emptySocialPresenceForm(): SocialPresenceForm {
  return {
    githubUrl: '',
    portfolioUrl: '',
    designLinks: {},
    socialLinks: {},
  };
}

export function readLinkValue(form: SocialPresenceForm, platform: SocialPlatformDef): string {
  const { storage } = platform;
  if (storage.kind === 'scalar') return form[storage.field] || '';
  if (storage.kind === 'design') return form.designLinks[storage.field] || '';
  return form.socialLinks[storage.field] || '';
}

export function writeLinkValue(
  form: SocialPresenceForm,
  platform: SocialPlatformDef,
  value: string,
): SocialPresenceForm {
  const { storage } = platform;
  if (storage.kind === 'scalar') return { ...form, [storage.field]: value };
  if (storage.kind === 'design') {
    return {
      ...form,
      designLinks: { ...form.designLinks, [storage.field]: value || undefined },
    };
  }
  return {
    ...form,
    socialLinks: { ...form.socialLinks, [storage.field]: value || undefined },
  };
}

export function countConnectedLinks(form: SocialPresenceForm, isCompany: boolean): number {
  return SOCIAL_PLATFORMS.filter((p) => {
    if (isCompany && p.developerOnly) return false;
    return readLinkValue(form, p).trim().length > 0;
  }).length;
}

export function formFromProfile(data: {
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  designLinks?: DesignLinks | null;
  socialLinks?: SocialLinks | null;
}): SocialPresenceForm {
  return {
    githubUrl: data.githubUrl ?? '',
    portfolioUrl: data.portfolioUrl ?? '',
    designLinks: data.designLinks ?? {},
    socialLinks: data.socialLinks ?? {},
  };
}

export function buildSocialPresencePayload(form: SocialPresenceForm) {
  const designLinks: DesignLinks = {};
  if (form.designLinks.figma?.trim()) designLinks.figma = form.designLinks.figma.trim();
  if (form.designLinks.behance?.trim()) designLinks.behance = form.designLinks.behance.trim();
  if (form.designLinks.dribbble?.trim()) designLinks.dribbble = form.designLinks.dribbble.trim();

  const socialLinks: SocialLinks = {};
  for (const key of [
    'linkedin',
    'twitter',
    'instagram',
    'youtube',
    'facebook',
    'tiktok',
    'threads',
    'bluesky',
    'mastodon',
    'discord',
    'telegram',
  ] as SocialLinkKey[]) {
    const v = form.socialLinks[key]?.trim();
    if (v) socialLinks[key] = v;
  }

  return {
    githubUrl: form.githubUrl.trim() || null,
    portfolioUrl: form.portfolioUrl.trim() || null,
    designLinks,
    socialLinks,
  };
}

export const SOCIAL_PLATFORM_BY_KEY = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.id, p]),
) as Record<string, SocialPlatformDef>;
