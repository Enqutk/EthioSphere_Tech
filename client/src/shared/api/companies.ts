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
  get: (username: string) =>
    api<CompanyProfile>(`/api/companies/${encodeURIComponent(username)}`),

  review: (username: string, body: { rating: number; body: string }) =>
    api(`/api/companies/${encodeURIComponent(username)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  toggleLike: (username: string) =>
    api<{ liked: boolean; likeCount: number }>(`/api/companies/${encodeURIComponent(username)}/like`, {
      method: 'POST',
    }),

  me: () =>
    api<{
      id: string;
      legalName: string;
      website: string;
      description?: string | null;
      verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
      verificationNote?: string | null;
      verificationRequestedAt?: string | null;
      verifiedAt?: string | null;
    }>('/api/companies/me'),

  updateMe: (body: { legalName?: string; website?: string; description?: string }) =>
    api<{
      id: string;
      legalName: string;
      website: string;
      description?: string | null;
      verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
      verificationNote?: string | null;
      verificationRequestedAt?: string | null;
      verifiedAt?: string | null;
    }>('/api/companies/me', { method: 'PATCH', body: JSON.stringify(body) }),

  applyVerification: (body: { message?: string }) =>
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
    }>('/api/companies/me/apply-verification', { method: 'POST', body: JSON.stringify(body) }),
};
