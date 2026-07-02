export type Overview = { users: number; posts: number; challenges: number; projects: number };

export type AdminPost = {
  id: string;
  title: string;
  section: string;
  createdAt: string;
  author: { id: string; username: string; name: string };
};

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  isAdmin: boolean;
  accountType?: 'DEVELOPER' | 'COMPANY';
  isBanned?: boolean;
  bannedAt?: string | null;
  banExpiresAt?: string | null;
  banReason?: string | null;
  company?: { legalName: string } | null;
  createdAt: string;
  _count: { posts: number; projectsOwned: number };
};

export type ChallengeRow = {
  id: string;
  title: string;
  difficulty: string;
  rewardPoints: number;
  active: boolean;
  submissionOpensAt?: string | null;
  submissionClosesAt?: string | null;
};

export const SECTION_LABEL: Record<string, string> = {
  GENERAL: 'General',
  DEBUG_HELP: 'Debug help',
  PROJECT_FEEDBACK: 'Project feedback',
  ANNOUNCEMENTS: 'Announcements',
  REACT: 'React',
  NODE: 'Node',
  PYTHON: 'Python',
  OTHER: 'Other',
};
