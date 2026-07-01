export type PrimaryDiscipline = 'DEVELOPER' | 'UI_UX' | 'GRAPHICS' | 'DEVOPS' | 'PM';

export type DesignLinks = {
  figma?: string;
  behance?: string;
  dribbble?: string;
};

export type User = {
  id: string;
  email?: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rank: string;
  accountType?: 'DEVELOPER' | 'COMPANY';
  primaryDiscipline?: PrimaryDiscipline;
  designLinks?: DesignLinks | null;
  company?: {
    id: string;
    legalName: string;
    website: string;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  } | null;
  /** Set at registration when GitHub is linked */
  githubUrl?: string | null;
  /** Self-hosted mini portfolio (GitHub Pages, Vercel, etc.) */
  portfolioUrl?: string | null;
  skills?: string[];
  profileSections?: { title: string; content: string }[];
  isAdmin?: boolean;
};

export type FollowForViewer = {
  direction: string;
  status: string | null;
  id: string | null;
};

export type DiscoverUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rank: string;
  rankLabel?: string;
  primaryDiscipline?: PrimaryDiscipline;
  disciplineLabel?: string;
  skills?: string[];
  projectsOwned: { id: string; title: string; githubFullName?: string | null }[];
  posts: { id: string; title: string; section: string }[];
  followForViewer: FollowForViewer | null;
};
