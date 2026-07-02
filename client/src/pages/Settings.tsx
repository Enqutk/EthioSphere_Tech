import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { usersApi, companiesApi } from '@/shared/api';
import type { NotificationPrefs } from '@/shared/api/users';
import { authApi } from '@/shared/api/auth';
import { canApplyForVerification, hasVerificationUnderReview } from '@/shared/constants/verification';
import { SocialPresenceSettings } from '@/shared/components/settings/SocialPresenceSettings';
import type { DesignLinks } from '@/shared/constants/disciplines';
import type { SocialLinks } from '@/shared/constants/socialPlatforms';
import { GENDER_LABELS, type Gender } from '@/shared/constants/demographics';

type SettingsData = {
  email: string;
  username: string;
  name: string;
  accountType?: 'DEVELOPER' | 'COMPANY';
  hasPassword?: boolean;
  googleLinked?: boolean;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  notificationPrefs: NotificationPrefs;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  designLinks?: DesignLinks | null;
  socialLinks?: SocialLinks | null;
  company?: {
    id: string;
    legalName: string;
    website: string;
    description?: string | null;
    verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    verificationNote?: string | null;
    verificationRequestedAt?: string | null;
  } | null;
};

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-brand-400">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-800/80 bg-surface-900/50 px-4 py-3">
      <span>
        <span className="block text-sm text-slate-200">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-600 text-brand-500 focus:ring-brand-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, ready, updateSessionUser } = useAuth();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const [legalName, setLegalName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [companySaving, setCompanySaving] = useState(false);

  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifySaving, setVerifySaving] = useState(false);

  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    authApi.googleStatus().then((r) => setGoogleEnabled(r.enabled)).catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login', { state: { from: '/settings' } });
      return;
    }
    setLoading(true);
    setError('');
    usersApi
      .me()
      .then(async (raw) => {
        const d = raw as SettingsData;
        if (d.accountType === 'COMPANY' && !d.company) {
          try {
            d.company = await companiesApi.me();
          } catch {
            /* company record may be missing */
          }
        }
        setData(d);
        setPrefs(
          d.notificationPrefs ?? {
            emailOnMessage: true,
            emailOnFollow: true,
            emailOnChallenge: true,
            emailOnProjectInvite: true,
            emailOnCommunityReply: true,
          },
        );
        if (d.company) {
          setLegalName(d.company.legalName);
          setWebsite(d.company.website);
          setDescription(d.company.description || '');
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load settings'))
      .finally(() => setLoading(false));
  }, [ready, user, navigate]);

  useEffect(() => {
    if (loading || !data) return;
    const hash = window.location.hash.replace('#', '');
    if (hash === 'verification' || hash === 'social') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, data]);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await usersApi.changePassword({
        currentPassword: data?.hasPassword ? currentPassword : undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setData((d) => (d ? { ...d, hasPassword: true } : d));
      setMsg('Password updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function savePrefs() {
    if (!prefs) return;
    setPrefsSaving(true);
    setMsg('');
    setError('');
    try {
      await usersApi.updateSettings({ notificationPrefs: prefs });
      setMsg('Notification preferences saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferences');
    } finally {
      setPrefsSaving(false);
    }
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    setCompanySaving(true);
    setMsg('');
    setError('');
    try {
      const updated = await companiesApi.updateMe({ legalName, website, description });
      setData((d) =>
        d ? { ...d, name: updated.legalName, company: { ...d.company!, ...updated } } : d,
      );
      updateSessionUser({ name: updated.legalName });
      setMsg('Company profile updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update company');
    } finally {
      setCompanySaving(false);
    }
  }

  async function applyVerification() {
    setVerifySaving(true);
    setMsg('');
    setError('');
    try {
      const res = await companiesApi.applyVerification({ message: verifyMessage });
      setData((d) => (d?.company ? { ...d, company: { ...d.company, ...res.company } } : d));
      setMsg(res.message);
      setVerifyMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit verification');
    } finally {
      setVerifySaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-slate-400">Loading settings…</div>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-red-400">{error || 'Could not load settings'}</p>
        <Link to="/" className="mt-4 inline-block text-brand-400 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const isCompany = data.accountType === 'COMPANY';
  const company = data.company;
  const vStatus = company?.verificationStatus;
  const vRequestedAt = company?.verificationRequestedAt;
  const showVerifyApply = canApplyForVerification(vStatus, vRequestedAt);
  const showVerifyPending = hasVerificationUnderReview(vStatus, vRequestedAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-slate-100">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your account, security, and preferences.</p>
        <nav className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="Settings sections">
          <a href="#social" className="rounded-md border border-slate-800 px-2.5 py-1 text-slate-400 hover:border-brand-500/40 hover:text-brand-300">
            Online presence
          </a>
          {isCompany && (
            <a href="#verification" className="rounded-md border border-slate-800 px-2.5 py-1 text-slate-400 hover:border-brand-500/40 hover:text-brand-300">
              Verification
            </a>
          )}
        </nav>
      </div>

      {msg && <p className="mb-4 rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">{msg}</p>}
      {error && <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <div className="space-y-6">
        <SettingsSection title="Account">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-800/80 pb-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-mono text-slate-200">{data.email}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-800/80 pb-3">
              <dt className="text-slate-500">Username</dt>
              <dd className="font-mono text-slate-200">@{data.username}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-800/80 pb-3">
              <dt className="text-slate-500">Account type</dt>
              <dd className="text-slate-200">{isCompany ? 'Company' : 'Developer'}</dd>
            </div>
            {data.dateOfBirth && (
              <div className="flex justify-between gap-4 border-b border-slate-800/80 pb-3">
                <dt className="text-slate-500">Date of birth</dt>
                <dd className="text-slate-200">
                  {new Date(data.dateOfBirth).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </dd>
              </div>
            )}
            {data.gender && (
              <div className={`flex justify-between gap-4 ${data.dateOfBirth ? '' : 'border-t border-slate-800/80 pt-3'}`}>
                <dt className="text-slate-500">Gender</dt>
                <dd className="text-slate-200">{GENDER_LABELS[data.gender as Gender] ?? data.gender}</dd>
              </div>
            )}
          </dl>
          <Link to="/profile/edit" className="btn-secondary inline-block text-xs">
            Edit public profile
          </Link>
          <Link to="/settings#social" className="btn-secondary ml-2 inline-block text-xs">
            Manage social links
          </Link>
        </SettingsSection>

        <SocialPresenceSettings
          isCompany={isCompany}
          initial={{
            githubUrl: data.githubUrl,
            portfolioUrl: data.portfolioUrl,
            designLinks: data.designLinks,
            socialLinks: data.socialLinks,
          }}
          onMessage={setMsg}
          onError={setError}
        />

        <SettingsSection title="Security">
          {googleEnabled && (
            <div className="rounded-lg border border-slate-800/80 bg-surface-900/50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-200">Google account</p>
                  <p className="text-xs text-slate-500">
                    {data.googleLinked ? 'Connected — you can sign in with Google.' : 'Not connected.'}
                  </p>
                </div>
                {!data.googleLinked && !isCompany && (
                  <a href={authApi.googleAuthUrl('/settings')} className="btn-secondary py-1.5 text-xs">
                    Connect Google
                  </a>
                )}
              </div>
            </div>
          )}

          <form onSubmit={savePassword} className="space-y-3">
            <p className="text-sm text-slate-400">
              {data.hasPassword ? 'Change your password.' : 'Set a password so you can also sign in with email.'}
            </p>
            {data.hasPassword && (
              <input
                type="password"
                className="input w-full"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            )}
            <input
              type="password"
              className="input w-full"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <input
              type="password"
              className="input w-full"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button type="submit" className="btn-primary text-xs" disabled={passwordSaving}>
              {passwordSaving ? 'Saving…' : data.hasPassword ? 'Update password' : 'Set password'}
            </button>
          </form>
        </SettingsSection>

        {prefs && (
          <SettingsSection title="Notifications">
            <p className="text-sm text-slate-400">Choose which email notifications you want to receive.</p>
            <ToggleRow
              label="Direct messages"
              description="When someone sends you a message"
              checked={prefs.emailOnMessage}
              onChange={(v) => setPrefs({ ...prefs, emailOnMessage: v })}
            />
            <ToggleRow
              label="Follow requests"
              description="When someone follows you or accepts your request"
              checked={prefs.emailOnFollow}
              onChange={(v) => setPrefs({ ...prefs, emailOnFollow: v })}
            />
            <ToggleRow
              label="Challenges"
              description="Updates on challenges you joined or created"
              checked={prefs.emailOnChallenge}
              onChange={(v) => setPrefs({ ...prefs, emailOnChallenge: v })}
            />
            <ToggleRow
              label="Project invites"
              description="When you are invited to a project team"
              checked={prefs.emailOnProjectInvite}
              onChange={(v) => setPrefs({ ...prefs, emailOnProjectInvite: v })}
            />
            <ToggleRow
              label="Community replies"
              description="When someone replies to your post or comment"
              checked={prefs.emailOnCommunityReply}
              onChange={(v) => setPrefs({ ...prefs, emailOnCommunityReply: v })}
            />
            <button type="button" className="btn-primary text-xs" onClick={savePrefs} disabled={prefsSaving}>
              {prefsSaving ? 'Saving…' : 'Save notification preferences'}
            </button>
          </SettingsSection>
        )}

        {isCompany && company && (
          <SettingsSection title="Company profile">
            <form onSubmit={saveCompany} className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-400">Legal name</span>
                <input className="input mt-1 w-full" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Website</span>
                <input
                  className="input mt-1 w-full"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Description</span>
                <textarea
                  className="input mt-1 w-full min-h-[5rem]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                />
              </label>
              <button type="submit" className="btn-primary text-xs" disabled={companySaving}>
                {companySaving ? 'Saving…' : 'Save company details'}
              </button>
            </form>
          </SettingsSection>
        )}

        {isCompany && (
          <section id="verification" className="card scroll-mt-24 p-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-brand-400">Verification badge</h2>
            <div className="mt-4 space-y-4">
              {!company ? (
                <p className="text-sm text-amber-400">
                  Company profile could not be loaded. Try refreshing, or sign out and back in.
                </p>
              ) : (
                <>
                  {vStatus === 'VERIFIED' && (
                    <p className="text-sm text-emerald-400">
                      Your company is verified. The badge appears on your public profile.
                    </p>
                  )}
                  {showVerifyPending && (
                    <p className="text-sm text-amber-400">
                      Your verification request is under review
                      {vRequestedAt ? ` (submitted ${new Date(vRequestedAt).toLocaleDateString()})` : ''}.
                    </p>
                  )}
                  {vStatus === 'REJECTED' && (
                    <div className="space-y-2">
                      <p className="text-sm text-red-400">Your previous verification request was not approved.</p>
                      {company.verificationNote && (
                        <p className="text-xs text-slate-500">Note: {company.verificationNote}</p>
                      )}
                    </div>
                  )}
                  {showVerifyApply && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-400">
                        Apply for a verified company badge so others know your organization is legitimate. Verified
                        companies can also publish challenges.
                      </p>
                      <textarea
                        className="input w-full min-h-[4rem]"
                        placeholder="Tell us about your company — website, registration, LinkedIn, etc. (optional but helps)"
                        value={verifyMessage}
                        onChange={(e) => setVerifyMessage(e.target.value)}
                        maxLength={1000}
                      />
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        onClick={applyVerification}
                        disabled={verifySaving}
                      >
                        {verifySaving ? 'Submitting…' : 'Request verification'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        <SettingsSection title="Legal">
          <p className="text-sm text-slate-400">
            Review our policies and terms of use for Programmers World.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/privacy" className="text-sm text-brand-400 hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-brand-400 hover:underline">
              Terms of Service
            </Link>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
