export type GithubRepoInfo = {
  full_name?: string;
  html_url?: string;
  name?: string;
  description?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  watchers_count?: number;
  subscribers_count?: number;
  default_branch?: string;
  homepage?: string | null;
  topics?: string[];
  archived?: boolean;
  disabled?: boolean;
  fork?: boolean;
  parent?: string | null;
  pushed_at?: string;
  created_at?: string;
  updated_at?: string;
  size?: number;
  language?: string | null;
  visibility?: string;
  owner?: { login?: string; avatar_url?: string; html_url?: string; type?: string } | null;
  license?: { key?: string; name?: string; spdx_id?: string } | null;
};

export type GithubContributor = {
  login: string;
  avatar_url?: string;
  html_url?: string;
  contributions?: number;
};

export type GithubDataBundle = {
  repo?: GithubRepoInfo | null;
  languages?: Record<string, number>;
  readme?: string | null;
  contributors?: GithubContributor[];
};

export type ProjectDetailData = {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  visibility?: string;
  seekingReview?: boolean;
  rolesNeeded?: string[];
  githubHtmlUrl?: string | null;
  githubFullName?: string | null;
  githubData?: GithubDataBundle | null;
  githubSyncedAt?: string | null;
  viewCount?: number;
  likeCount?: number;
  pulseScore?: number;
  likedByViewer?: boolean;
  owner: { id: string; name: string; username: string; avatarUrl?: string | null; rank: string };
  members: { role: string; user: { id: string; name: string; username: string; avatarUrl?: string | null } }[];
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  OPEN_SOURCE: 'Open source',
  HACKATHON: 'Hackathon',
  LEARNING: 'Learning',
};
