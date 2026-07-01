import { api } from './http';

export type CompanyProfile = {
  company: {
    id: string;
    legalName: string;
    website: string;
    description?: string | null;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    verifiedAt?: string | null;
    likeCount: number;
    averageRating: number | null;
    reviewCount: number;
    viewerLiked: boolean;
    viewerReview?: {
      id: string;
      rating: number;
      body: string;
      createdAt: string;
      author: { id: string; username: string; name: string; avatarUrl?: string | null };
    } | null;
  };
  reviews: {
    id: string;
    rating: number;
    body: string;
    createdAt: string;
    author: { id: string; username: string; name: string; avatarUrl?: string | null };
  }[];
  username: string;
  userId: string;
};

export const companiesApi = {
  get: (username: string, token?: string | null) =>
    api<CompanyProfile>(`/api/companies/${encodeURIComponent(username)}`, { token: token || undefined }),

  review: (token: string, username: string, body: { rating: number; body: string }) =>
    api(`/api/companies/${encodeURIComponent(username)}/reviews`, {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    }),

  toggleLike: (token: string, username: string) =>
    api<{ liked: boolean; likeCount: number }>(`/api/companies/${encodeURIComponent(username)}/like`, {
      method: 'POST',
      token,
    }),
};
