import { Link } from 'react-router-dom';
import { SITE } from '@/shared/config/site';

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="label-system">Legal</p>
      <h1 className="mt-2 font-mono text-3xl font-semibold text-slate-100">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: June 2026</p>

      <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
        <section>
          <h2 className="font-mono text-lg text-slate-200">Acceptance</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            By creating an account or using {SITE.name}, you agree to these Terms and our{' '}
            <Link to="/privacy" className="text-brand-400 hover:underline">Privacy Policy</Link>.
            If you do not agree, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Acceptable use</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-400">
            <li>Be respectful. Harassment, hate speech, and spam are prohibited.</li>
            <li>Do not impersonate others or misrepresent company affiliations.</li>
            <li>Do not attempt to disrupt, scrape, or compromise the platform or other users&apos; accounts.</li>
            <li>Company accounts must represent legitimate organizations; false verification may result in suspension.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Your content</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            You retain ownership of content you submit. By posting publicly, you grant us a non-exclusive license to display
            and distribute that content on the platform. You are responsible for ensuring you have the right to share what you post.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Enforcement</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            We may warn, temporarily restrict, or permanently suspend accounts that violate these Terms. Suspensions may be
            time-limited or indefinite depending on severity. You may submit a written appeal for review; approval is at our discretion.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            The platform is provided &quot;as is&quot; without warranties. We are not liable for user-generated content or
            third-party links. Use your judgment when interacting with other members or external opportunities posted on the site.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-lg text-slate-200">Changes</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            We may update these Terms from time to time. Continued use after changes constitutes acceptance of the revised Terms.
          </p>
        </section>
      </div>

      <p className="mt-12 text-sm text-slate-500">
        <Link to="/" className="text-brand-400 hover:underline">← Back home</Link>
      </p>
    </div>
  );
}
