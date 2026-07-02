import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/components/AuthProvider';
import { getStoredToken } from '@/shared/components/AuthProvider';
import { usersApi, companiesApi } from '@/shared/api';
import type { NotificationPrefs } from '@/shared/api/users';
import { authApi } from '@/shared/api/auth';

type SettingsData = {
  email: string;
  username: string;
  name: string;
  accountType?: 'DEVELOPER' | 'COMPANY';
  hasPassword?: boolean;
  googleLinked?: boolean;
  notificationPrefs: NotificationPrefs;
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
    const token = getStoredToken();
    if (!token) {
      navigate('/login', { state: { from: '/settings' } });
      return;
    }
    setLoading(true);
    setError('');
    usersApi
      .me(token)
      .then((raw) => {
        const d = raw as SettingsData;
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

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    const token = getStoredToken();
    if (!token) return;
    setPasswordSaving(true);
    try {
      await usersApi.changePassword(token, {
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
    const token = getStoredToken();
    if (!token) return;
    setPrefsSaving(true);
    setMsg('');
    setError('');
    try {
      await usersApi.updateSettings(token, { notificationPrefs: prefs });
      setMsg('Notification preferences saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferences');
    } finally {
      setPrefsSaving(false);
    }
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token) return;
    setCompanySaving(true);
    setMsg('');
    setError('');
    try {
      const updated = await companiesApi.updateMe(token, { legalName, website, description });
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
    const token = getStoredToken();
    if (!token) return;
    setVerifySaving(true);
    setMsg('');
    setError('');
    try {
      const res = await companiesApi.applyVerification(token, { message: verifyMessage });
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
  const vStatus = data.company?.verificationStatus;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-slate-100">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your account, security, and preferences.</p>
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
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Account type</dt>
              <dd className="text-slate-200">{isCompany ? 'Company' : 'Developer'}</dd>
            </div>
          </dl>
          <Link to="/profile/edit" className="btn-secondary inline-block text-xs">
            Edit public profile
          </Link>
        </SettingsSection>

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

        {isCompany && data.company && (
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

        {isCompany && data.company && (
          <SettingsSection title="Verification badge">
            {vStatus === 'VERIFIED' && (
              <p className="text-sm text-emerald-400">Your company is verified. The badge appears on your public profile.</p>
            )}
            {vStatus === 'PENDING' && (
              <p className="text-sm text-amber-400">
                Your verification request is under review
                {data.company.verificationRequestedAt
                  ? ` (submitted ${new Date(data.company.verificationRequestedAt).toLocaleDateString()})`
                  : ''}
                .
              </p>
            )}
            {vStatus === 'REJECTED' && (
              <div className="space-y-2">
                <p className="text-sm text-red-400">Your previous verification request was not approved.</p>
                {data.company.verificationNote && (
                  <p className="text-xs text-slate-500">Note: {data.company.verificationNote}</p>
                )}
              </div>
            )}
            {(vStatus === 'UNVERIFIED' || vStatus === 'REJECTED') && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  Apply for a verified company badge so others know your organization is legitimate. Verified companies
                  can also publish challenges.
                </p>
                <textarea
                  className="input w-full min-h-[4rem]"
                  placeholder="Optional message for the review team (website, registration docs, etc.)"
                  value={verifyMessage}
                  onChange={(e) => setVerifyMessage(e.target.value)}
                  maxLength={1000}
                />
                <button type="button" className="btn-primary text-xs" onClick={applyVerification} disabled={verifySaving}>
                  {verifySaving ? 'Submitting…' : 'Apply for verification'}
                </button>
              </div>
            )}
          </SettingsSection>
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
