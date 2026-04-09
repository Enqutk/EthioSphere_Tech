export type User = {
  id: string;
  email?: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rank: string;
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
  skills?: string[];
  projectsOwned: { id: string; title: string; githubFullName?: string | null }[];
  posts: { id: string; title: string; section: string }[];
  followForViewer: FollowForViewer | null;
};
