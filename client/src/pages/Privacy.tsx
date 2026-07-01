import { Link } from 'react-router-dom';
import { SITE } from '@/shared/config/site';

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="label-system">Legal</p>
      <h1 className="mt-2 font-mono text-3xl font-semibold text-slate-100">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: June 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
        <section>
          <h2 className="font-mono text-lg text-slate-200">Overview</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {SITE.name} (&quot;we&quot;, &quot;our&quot;, &quot;the platform&quot;) respects your privacy. This policy describes what
            information we collect when you use our developer community platform, how we use it, and the choices you have.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Information we collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-400">
            <li>Account details you provide at registration (name, email, username, optional GitHub profile or company information).</li>
            <li>Content you post (projects, community posts, messages, challenge submissions).</li>
            <li>Technical data such as IP address and browser type, used for security and abuse prevention.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">How we use your information</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-400">
            <li>To operate your account and display your public profile.</li>
            <li>To moderate the community, enforce our Terms, and respond to abuse reports.</li>
            <li>To improve platform reliability and security.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Sharing</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            We do not sell your personal data. Public profile fields and posts you choose to publish are visible to other users.
            We may disclose information when required by law or to protect users and the platform from harm.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Account suspension & appeals</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            If your account is suspended, you may submit an appeal with an explanation. Appeal materials are reviewed only by
            authorized administrators and are retained for audit purposes.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Contact</h2>
          <p className="mt-2 text-sm text-slate-400">
            Questions about this policy:{' '}
            <a href={`mailto:${SITE.supportEmail}`} className="text-brand-400 hover:underline">
              {SITE.supportEmail}
            </a>
          </p>
        </section>
      </div>

      <p className="mt-12 text-sm text-slate-500">
        <Link to="/" className="text-brand-400 hover:underline">← Back home</Link>
      </p>
    </div>
  );
}
