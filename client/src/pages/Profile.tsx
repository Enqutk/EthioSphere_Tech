import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { companiesApi, followApi, usersApi } from '@/shared/api';
import type { CompanyProfile } from '@/shared/api';
import { useAuth } from '@/shared/components/AuthProvider';
import { ReportProfileButton } from '@/shared/components/ReportProfileButton';
import {
  disciplineBadgeLabel,
  type PrimaryDiscipline,
  type DesignLinks,
} from '@/shared/constants/disciplines';
import { canApplyForVerification, hasVerificationUnderReview } from '@/shared/constants/verification';
import { ProfileSocialLinks } from '@/shared/components/ProfileSocialLinks';
import type { SocialLinks } from '@/shared/api/types';

type Profile = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rank: string;
  primaryDiscipline?: PrimaryDiscipline;
  designLinks?: DesignLinks | null;
  socialLinks?: SocialLinks | null;
  isBanned?: boolean;
  banReason?: string | null;
  accountType?: 'DEVELOPER' | 'COMPANY';
  company?: {
    id: string;
    legalName: string;
    website: string;
    description?: string | null;
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    verificationRequestedAt?: string | null;
    verifiedAt?: string | null;
    _count?: { likes: number; reviews: number };
  } | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[];
  profileSections?: { title: string; content: string }[];
  followersCount?: number;
  followingCount?: number;
  followForViewer?: {
    direction: string;
    status: string | null;
    id: string | null;
  } | null;
  projectsOwned?: {
    id: string;
    title: string;
    status: string;
    type?: string;
    visibility?: string;
    seekingReview?: boolean;
    githubFullName?: string | null;
    githubHtmlUrl?: string | null;
  }[];
  badges?: { badgeType: string; earnedAt: string }[];
};

const RANK_LABELS: Record<string, string> = {
  NEWBIE: 'Newbie',
  JUNIOR_DEV: 'Junior Dev',
  PRO_DEV: 'Pro Dev',
  ELITE_ARCHITECT: 'Elite Architect',
};

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user: me, token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyData, setCompanyData] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    if (companyData?.company.viewerReview) {
      setReviewRating(companyData.company.viewerReview.rating);
      setReviewBody(companyData.company.viewerReview.body);
    }
  }, [companyData?.company.viewerReview?.id]);

  useEffect(() => {
    if (!username?.trim()) {
      setLoading(false);
      setError('Invalid profile link');
      setProfile(null);
      return;
    }
    setLoading(true);
    setError('');
    setProfile(null);
    const u = username.trim().toLowerCase();
    usersApi
      .getByUsername(u, token)
      .then(async (data) => {
        const p = data as Profile;
        setProfile(p);
        if (p.accountType === 'COMPANY') {
          const cd = await companiesApi.get(u, token);
          setCompanyData(cd);
        } else {
          setCompanyData(null);
        }
      })
      .catch((err) => {
        setProfile(null);
        setError(err instanceof Error ? err.message : 'Could not load profile');
      })
      .finally(() => setLoading(false));
  }, [username, token]);

  async function reloadProfile() {
    if (!username?.trim()) return;
    const u = username.trim().toLowerCase();
    const data = await usersApi.getByUsername(u, token);
    const p = data as Profile;
    setProfile(p);
    if (p.accountType === 'COMPANY') {
      setCompanyData(await companiesApi.get(u, token));
    }
  }

  const isCompany = profile?.accountType === 'COMPANY';
  const verification = profile?.company?.verificationStatus;

  function verificationBadge() {
    if (!isCompany || !verification) return null;
    if (verification === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 1a4 4 0 0 0-4 4v1.5H3.5a1 1 0 0 0-1 1V13a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7.5a1 1 0 0 0-1-1H12V5a4 4 0 0 0-4-4Zm0 1.5A2.5 2.5 0 0 1 10.5 5v1.5h-5V5A2.5 2.5 0 0 1 8 2.5ZM8 9a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 8 9Z" />
          </svg>
          Verified company
        </span>
      );
    }
    if (hasVerificationUnderReview(verification, profile?.company?.verificationRequestedAt)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.5h1.5v4.25H7.25V4.5Zm0 5.75h1.5V12h-1.5v-1.75Z" />
          </svg>
          Verification pending
        </span>
      );
    }
    if (canApplyForVerification(verification, profile?.company?.verificationRequestedAt)) {
      return isOwn ? (
        <Link
          to="/settings#verification"
          className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-xs text-brand-400 hover:bg-brand-500/25"
        >
          Request verification →
        </Link>
      ) : null;
    }
    if (verification === 'PENDING') {
      return null;
    }
    if (verification === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM5.8 5.1 6.9 4l2.1 2.1L11.1 4l1.1 1.1L9.1 7.2l2.1 2.1-1.1 1.1L8 8.3 5.9 10.4 4.8 9.3l2.1-2.1L4.8 5.1Z" />
          </svg>
          Verification rejected
        </span>
      );
    }
    return null;
  }

  if (loading) return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-slate-400">Loading profile…</div>;
  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-red-400">{error || 'Profile not found'}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand-400 hover:underline">Back to home</Link>
      </div>
    );
  }

  const isOwn = me?.username?.toLowerCase() === profile.username?.toLowerCase();

  if (profile.isBanned) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="card p-8 text-center">
          <p className="font-mono text-lg text-red-400">Account suspended</p>
          <p className="mt-2 text-slate-400">@{profile.username} is not available.</p>
          {profile.banReason && <p className="mt-4 text-sm text-slate-500">{profile.banReason}</p>}
          <Link to="/" className="mt-6 inline-block text-brand-400 hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-400">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-slate-400">@{profile.username}</span>
      </div>
      <div className="card p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-surface-800">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-slate-500">{profile.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-mono text-2xl font-semibold text-slate-100">{profile.name}</h1>
            <p className="text-slate-400">@{profile.username}</p>
            <p className="mt-1 text-xs text-slate-500">
              {profile.followersCount ?? 0} followers · {profile.followingCount ?? 0} following
            </p>
            <span className="mt-2 inline-block rounded-full bg-brand-500/20 px-3 py-0.5 text-sm font-medium text-brand-400">
              {isCompany
                ? 'Company'
                : disciplineBadgeLabel(profile.primaryDiscipline, RANK_LABELS[profile.rank] || profile.rank)}
            </span>
            {verificationBadge() && <span className="ml-2 mt-2 inline-block">{verificationBadge()}</span>}
            {isCompany && profile.company?.website && (
              <p className="mt-2">
                <a href={profile.company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-400 hover:underline">
                  {profile.company.website.replace(/^https?:\/\//, '')} ↗
                </a>
              </p>
            )}
            {(profile.bio || (isCompany && profile.company?.description)) ? (
              <p className="mt-3 text-slate-300">{isCompany ? profile.company?.description || profile.bio : profile.bio}</p>
            ) : isOwn ? (
              <p className="mt-3 text-sm text-slate-500">
                No bio yet.{' '}
                <Link to="/profile/edit" className="text-brand-400 hover:underline">Add one</Link>
              </p>
            ) : null}
            <ProfileSocialLinks
              githubUrl={profile.githubUrl}
              portfolioUrl={profile.portfolioUrl}
              designLinks={profile.designLinks}
              socialLinks={profile.socialLinks}
              isCompany={isCompany}
            />
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {isOwn && (
              <>
                <Link to="/settings" className="btn-secondary text-sm">Settings</Link>
                <Link to="/profile/edit" className="btn-secondary text-sm">Edit profile</Link>
              </>
            )}
            {!isOwn && token && (
              <div className="flex flex-wrap gap-2">
                {!isCompany && <Link to={`/inbox/${profile.id}`} className="btn-secondary text-sm">Message</Link>}
                <ReportProfileButton token={token} targetUsername={profile.username} targetType={isCompany ? 'company' : 'user'} />
                {!isCompany && (profile.followForViewer?.direction === 'none' || !profile.followForViewer ? (
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={async () => {
                      await followApi.follow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Request follow
                  </button>
                ) : null)}
                {!isCompany && profile.followForViewer?.direction === 'outbound' && profile.followForViewer.status === 'PENDING' && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={async () => {
                      await followApi.unfollow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Cancel request
                  </button>
                )}
                {!isCompany && profile.followForViewer?.direction === 'outbound' && profile.followForViewer.status === 'ACCEPTED' && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={async () => {
                      await followApi.unfollow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Unfollow
                  </button>
                )}
                {!isCompany && profile.followForViewer?.direction === 'outbound' && profile.followForViewer.status === 'REJECTED' && (
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={async () => {
                      await followApi.follow(token, profile.username);
                      await reloadProfile();
                    }}
                  >
                    Request follow
                  </button>
                )}
                {!isCompany && profile.followForViewer?.direction === 'inbound' && profile.followForViewer.status === 'PENDING' && profile.followForViewer.id && (
                  <>
                    <span className="self-center text-xs text-amber-400">Wants to follow you</span>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={async () => {
                        await followApi.accept(token, profile.followForViewer!.id!);
                        await reloadProfile();
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={async () => {
                        await followApi.reject(token, profile.followForViewer!.id!);
                        await reloadProfile();
                      }}
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {isCompany && companyData && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-2xl font-semibold text-slate-100">
                  {companyData.company.averageRating ?? '—'}
                  <span className="text-sm font-normal text-slate-500"> / 5</span>
                </p>
                <p className="text-xs text-slate-500">{companyData.company.reviewCount} review(s)</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-100">{companyData.company.likeCount}</p>
                <p className="text-xs text-slate-500">trust likes</p>
              </div>
              {!isOwn && token && (
                <button
                  type="button"
                  className={`btn-secondary text-sm ${companyData.company.viewerLiked ? 'border-brand-500 text-brand-400' : ''}`}
                  onClick={async () => {
                    await companiesApi.toggleLike(token, profile.username);
                    await reloadProfile();
                  }}
                >
                  {companyData.company.viewerLiked ? 'Liked ✓' : 'Like company'}
                </button>
              )}
            </div>

            {!isOwn && token && (
              <form
                className="mt-6 rounded-lg border border-slate-700 bg-surface-950/40 p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setReviewSaving(true);
                  setReviewMsg('');
                  try {
                    await companiesApi.review(token, profile.username, { rating: reviewRating, body: reviewBody.trim() });
                    setReviewMsg('Review saved.');
                    setReviewBody('');
                    await reloadProfile();
                  } catch (err) {
                    setReviewMsg(err instanceof Error ? err.message : 'Could not save review');
                  } finally {
                    setReviewSaving(false);
                  }
                }}
              >
                <h2 className="font-mono text-sm font-medium text-slate-400">Write a review</h2>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-sm text-slate-400">Rating</label>
                  <select className="input w-auto" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="input mt-2 min-h-[80px]"
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder="Share your experience (min 10 characters)"
                  minLength={10}
                  required
                />
                {reviewMsg && <p className="mt-2 text-sm text-brand-400">{reviewMsg}</p>}
                <button type="submit" className="btn-primary mt-2 text-sm" disabled={reviewSaving}>
                  {reviewSaving ? 'Saving…' : companyData.company.viewerReview ? 'Update review' : 'Post review'}
                </button>
              </form>
            )}

            {companyData.reviews.length > 0 && (
              <ul className="mt-6 space-y-4">
                {companyData.reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-800 bg-surface-950/30 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link to={`/profile/${r.author.username}`} className="font-medium text-brand-400 hover:underline">
                        {r.author.name}
                      </Link>
                      <span className="text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!isCompany && profile.portfolioUrl ? (
          <div className="mt-6 rounded-lg border border-brand-600/40 bg-surface-950/60 p-5">
            <p className="label-system">Hosted portfolio</p>
            <div className="mt-4">
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                Open portfolio ↗
              </a>
            </div>
          </div>
        ) : !isCompany && isOwn ? (
          <div className="mt-6 rounded-lg border border-dashed border-brand-900/50 bg-surface-950/40 p-4 text-sm text-slate-500">
            <span className="font-mono text-xs text-brand-500/80">[PORTFOLIO]</span>{' '}
            Link a self-hosted mini-site from{' '}
            <Link to="/profile/edit" className="text-brand-400 hover:underline">edit profile</Link>.
          </div>
        ) : null}

        {isOwn && isCompany && profile.company && profile.company.verificationStatus !== 'VERIFIED' && (
          <div className="mt-6 rounded-lg border border-brand-600/40 bg-brand-500/5 p-5">
            <p className="font-mono text-xs uppercase tracking-wide text-brand-400">Company verification</p>
            <p className="mt-2 text-sm text-slate-300">
              {canApplyForVerification(profile.company.verificationStatus, profile.company.verificationRequestedAt)
                ? 'Get a verified badge on your profile and unlock publishing challenges.'
                : 'Your verification request is being reviewed by our team.'}
            </p>
            {canApplyForVerification(profile.company.verificationStatus, profile.company.verificationRequestedAt) && (
              <Link to="/settings#verification" className="btn-primary mt-4 inline-block text-xs">
                Request verification
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-slate-700 pt-6">
          <h2 className="font-mono text-sm font-medium text-slate-400">{isCompany ? 'Tags' : 'Skills'}</h2>
          {profile.skills && profile.skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="rounded-md bg-surface-800 px-2 py-1 text-sm text-slate-300">{s}</span>
              ))}
            </div>
          ) : isOwn ? (
            <p className="mt-2 text-sm text-slate-500">
              <Link to="/profile/edit" className="text-brand-400 hover:underline">Add skills</Link> on your profile.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No skills listed.</p>
          )}
        </div>
        {profile.profileSections && profile.profileSections.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            {profile.profileSections.map((s, i) => (
              <section key={`${s.title}-${i}`} className={i > 0 ? 'mt-6' : ''}>
                <h2 className="font-mono text-sm font-medium uppercase tracking-wide text-slate-400">{s.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{s.content}</p>
              </section>
            ))}
          </div>
        )}
        {!isCompany && profile.projectsOwned && profile.projectsOwned.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Projects</h2>
            <ul className="mt-2 space-y-2">
              {profile.projectsOwned.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Link to={`/projects/${p.id}`} className="text-brand-400 hover:underline">{p.title}</Link>
                  <span className="text-xs text-slate-500">{p.status}</span>
                  {p.seekingReview && (
                    <span className="text-xs text-brand-400">review</span>
                  )}
                  {p.githubHtmlUrl && p.githubFullName && (
                    <a href={p.githubHtmlUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-brand-400">
                      {p.githubFullName} ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile.badges && profile.badges.length > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Badges</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.badges.map((b) => (
                <span key={b.badgeType} className="rounded-md bg-amber-500/20 px-2 py-1 text-sm text-amber-400">{b.badgeType}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
