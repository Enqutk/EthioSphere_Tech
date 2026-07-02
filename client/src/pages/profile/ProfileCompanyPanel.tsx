import { Link } from 'react-router-dom';
import type { CompanyProfile } from '@/shared/api';
import { companiesApi } from '@/shared/api';

type Props = {
  username: string;
  companyData: CompanyProfile;
  isOwn: boolean;
  isLoggedIn: boolean;
  reviewRating: number;
  reviewBody: string;
  reviewSaving: boolean;
  reviewMsg: string;
  onReviewRatingChange: (value: number) => void;
  onReviewBodyChange: (value: string) => void;
  onReload: () => Promise<void>;
  onReviewSavingChange: (value: boolean) => void;
  onReviewMsgChange: (value: string) => void;
};

export function ProfileCompanyPanel({
  username,
  companyData,
  isOwn,
  isLoggedIn,
  reviewRating,
  reviewBody,
  reviewSaving,
  reviewMsg,
  onReviewRatingChange,
  onReviewBodyChange,
  onReload,
  onReviewSavingChange,
  onReviewMsgChange,
}: Props) {
  return (
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
        {!isOwn && isLoggedIn && (
          <button
            type="button"
            className={`btn-secondary text-sm ${companyData.company.viewerLiked ? 'border-brand-500 text-brand-400' : ''}`}
            onClick={async () => {
              await companiesApi.toggleLike(username);
              await onReload();
            }}
          >
            {companyData.company.viewerLiked ? 'Liked ✓' : 'Like company'}
          </button>
        )}
      </div>

      {!isOwn && isLoggedIn && (
        <form
          className="mt-6 rounded-lg border border-slate-700 bg-surface-950/40 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            onReviewSavingChange(true);
            onReviewMsgChange('');
            try {
              await companiesApi.review(username, { rating: reviewRating, body: reviewBody.trim() });
              onReviewMsgChange('Review saved.');
              onReviewBodyChange('');
              await onReload();
            } catch (err) {
              onReviewMsgChange(err instanceof Error ? err.message : 'Could not save review');
            } finally {
              onReviewSavingChange(false);
            }
          }}
        >
          <h2 className="font-mono text-sm font-medium text-slate-400">Write a review</h2>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-slate-400">Rating</label>
            <select className="input w-auto" value={reviewRating} onChange={(e) => onReviewRatingChange(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="input mt-2 min-h-[80px]"
            value={reviewBody}
            onChange={(e) => onReviewBodyChange(e.target.value)}
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
  );
}
