import { Loader2, Star } from 'lucide-react';
import { Avatar } from './dashboard/primitives.jsx';
import ReviewPhotos from './ReviewPhotos.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * The traveller-reviews widget: average, rating breakdown, rating/sort controls
 * and the review cards. Shared by the vehicle page and the driver profile so the
 * two cannot drift apart.
 *
 * Filtering is driven by props rather than owned here, because the vehicle page
 * refetches from the server with filter params while the driver page filters an
 * already-aggregated in-memory list.
 */
// Same date rendering the vehicle page used before this was extracted.
const formatDate = (value, intl = 'en-US') => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString(intl, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const ReviewsSection = ({
  reviews, reviewMeta, reviewsLoading, reviewsError, averageRatingLabel, ratingCounts,
  ratingOptions, reviewFilters, handleReviewRatingFilter, handleReviewSortChange, handleReviewReload, firstName,
}) => {
  const { t, intl } = useI18n();
  const maxCount = Math.max(...(ratingCounts || [1]), 1);
  return (
    <div className="rounded-[18px] border border-[#e7ebe9] bg-white p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-3.5">
          <div className="text-center">
            <div className="text-[36px] font-extrabold leading-none text-ink">{averageRatingLabel}</div>
            <div className="mt-1 text-[11px] text-muted-soft">{t('reviews.count', { count: reviewMeta.total })}</div>
          </div>
          <div className="flex w-[130px] flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-2.5 text-[10.5px] text-muted-soft">{star}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${((ratingCounts[star - 1] || 0) / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          {ratingOptions.map((option) => {
            const isActive = reviewFilters.rating === option.value;
            return (
              <button key={option.value} type="button" onClick={() => handleReviewRatingFilter(option.value)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${isActive ? 'bg-brand text-white' : 'bg-canvas text-muted hover:text-ink'}`}>
                {option.label} <span className={isActive ? 'text-white/70' : 'text-muted-soft'}>{option.count}</span>
              </button>
            );
          })}
          <select value={reviewFilters.sort} onChange={(e) => handleReviewSortChange(e.target.value)}
            className="rounded-full border border-[#e2e8ea] bg-white px-3 py-1.5 text-[12px] font-bold text-muted focus:border-brand focus:outline-none">
            <option value="recent">{t('reviews.sort.newest')}</option>
            <option value="ratingDesc">{t('reviews.sort.highest')}</option>
            <option value="ratingAsc">{t('reviews.sort.lowest')}</option>
            <option value="oldest">{t('reviews.sort.oldest')}</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        {reviewsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin text-brand" /> {t('reviews.loading')}</div>
        ) : reviewsError ? (
          <div className="text-sm text-muted">
            <p className="text-[#e11d48]">{reviewsError}</p>
            <button type="button" onClick={handleReviewReload} className="mt-2 rounded-full border border-[#e2e8ea] px-3 py-1.5 text-xs font-bold text-ink">{t('reviews.tryAgain')}</button>
          </div>
        ) : reviews.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-hairline bg-canvas p-5 text-[13px] text-muted-soft">
            {t('reviews.empty', { name: firstName })}
          </p>
        ) : (
          // Two flowing columns (not a grid) so a short review isn't stretched to match a
          // long one beside it; each card keeps its own height.
          <div className="gap-4 sm:columns-2">
            {reviews.map((review) => {
              const reviewDateLabel = formatDate(
                review.reviewDate || review.publishedAt || review.visitedStartDate || review.createdAt,
                intl,
              );
              const travelerName = review.travelerName || t('reviews.traveller');
              return (
                <article key={review.id} className="mb-4 break-inside-avoid rounded-[16px] border border-[#eef1f0] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={travelerName} tone="purple" className="h-9 w-9 rounded-[11px] text-[13px]" />
                      <div>
                        <b className="text-[13.5px] text-ink">{travelerName}</b>
                        <div className="text-[11px] text-muted-soft">{reviewDateLabel || t('reviews.recentTrip')}</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[13px] font-extrabold text-ink"><Star className="h-3.5 w-3.5" fill="#f5b400" stroke="none" /> {review.rating}</span>
                  </div>
                  {review.title ? <p className="mt-2.5 text-[13.5px] font-bold text-ink">{review.title}</p> : null}
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{review.comment}</p>
                  <ReviewPhotos images={review.images} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsSection;
