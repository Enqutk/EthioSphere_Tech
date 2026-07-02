import { api } from './http';

export type CompanyProfile = {
  company: {
    id: string;
    legalName: string;
    website: string;
    description?: string | null;
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
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

  me: (token: string) =>
    api<{
      id: string;
      legalName: string;
      website: string;
      description?: string | null;
      verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
      verificationNote?: string | null;
      verificationRequestedAt?: string | null;
      verifiedAt?: string | null;
    }>('/api/companies/me', { token }),

  updateMe: (
    token: string,
    body: { legalName?: string; website?: string; description?: string },
  ) =>
    api<{
      id: string;
      legalName: string;
      website: string;
      description?: string | null;
      verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
      verificationNote?: string | null;
      verificationRequestedAt?: string | null;
      verifiedAt?: string | null;
    }>('/api/companies/me', { method: 'PATCH', body: JSON.stringify(body), token }),

  applyVerification: (token: string, body: { message?: string }) =>
    api<{
      message: string;
      company: {
        id: string;
        legalName: string;
        website: string;
        description?: string | null;
        verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
        verificationNote?: string | null;
        verificationRequestedAt?: string | null;
        verifiedAt?: string | null;
      };
    }>('/api/companies/me/apply-verification', { method: 'POST', body: JSON.stringify(body), token }),
};
