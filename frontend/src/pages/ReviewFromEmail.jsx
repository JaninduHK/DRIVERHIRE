import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from '../i18n/router.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { CheckCircle2, Loader2, PlusCircle, Star, X } from 'lucide-react';
import { fetchReviewInvite, submitReviewFromToken } from '../services/reviewApi.js';

const MAX_REVIEW_PHOTOS = 2;

// English pages always showed British-style dates here ("5 Jan 2027").
const formatDateRange = (start, end, intl = 'en-GB') => {
  if (!start || !end) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    const from = new Date(start).toLocaleDateString(intl, opts);
    const to = new Date(end).toLocaleDateString(intl, opts);
    return from === to ? from : `${from} – ${to}`;
  } catch {
    return '';
  }
};

const Panel = ({ children }) => (
  <div className="mx-auto w-full max-w-[560px] px-4 py-10">
    <div className="rounded-[20px] border border-[#e5ebe8] bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,31,45,.35)] sm:p-8">
      {children}
    </div>
  </div>
);

const ReviewFromEmail = () => {
  const { t, locale, intl, lp } = useI18n();
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, invite: null, error: '' });
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  const handleImages = (event) => {
    const picked = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    setImages((prev) => [...prev, ...picked].slice(0, MAX_REVIEW_PHOTOS));
    event.target.value = '';
  };
  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));
  const imagePreviews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => imagePreviews.forEach((url) => URL.revokeObjectURL(url)), [imagePreviews]);

  const load = useCallback(async () => {
    setState({ loading: true, invite: null, error: '' });
    try {
      const invite = await fetchReviewInvite(token);
      setState({ loading: false, invite, error: '' });
    } catch (error) {
      setState({ loading: false, invite: null, error: error.message || t('emailPages.linkError') });
    }
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (rating < 1) {
      setFormError(t('emailPages.review.errors.rating'));
      return;
    }
    if (comment.trim().length < 10) {
      setFormError(t('emailPages.review.errors.tooShort'));
      return;
    }
    setSubmitting(true);
    try {
      await submitReviewFromToken(token, { rating, title: title.trim(), comment: comment.trim(), images });
      setDone(true);
    } catch (error) {
      setFormError(error.message || t('emailPages.review.errors.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading) {
    return (
      <Panel>
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> {t('emailPages.review.opening')}
        </div>
      </Panel>
    );
  }

  if (state.error) {
    return (
      <Panel>
        <h1 className="text-[20px] font-extrabold text-ink">{t('emailPages.review.errorTitle')}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{state.error}</p>
        <a href={lp('/')} className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
          {t('emailPages.goHome')}
        </a>
      </Panel>
    );
  }

  if (done) {
    return (
      <Panel>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-brand" />
          <h1 className="mt-3 text-[20px] font-extrabold text-ink">{t('emailPages.review.thanksTitle')}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {t('emailPages.review.thanksBody')}
          </p>
          <a href={lp('/')} className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
            {t('emailPages.backHome')}
          </a>
        </div>
      </Panel>
    );
  }

  const { invite } = state;
  const dates = formatDateRange(invite.startDate, invite.endDate, locale === 'en' ? 'en-GB' : intl);

  return (
    <Panel>
      <h1 className="text-[22px] font-extrabold leading-tight text-ink">
        {t('emailPages.review.title', { name: invite.driverName })}
      </h1>
      <p className="mt-1.5 text-[13.5px] text-muted-soft">
        {invite.vehicleModel ? `${invite.vehicleModel}` : t('emailPages.review.yourTrip')}
        {dates ? ` · ${dates}` : ''}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <span className="block text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">{t('emailPages.review.rating')}</span>
          <div className="mt-2 flex gap-1.5" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = (hovered || rating) >= value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={t('emailPages.review.stars', { count: value })}
                  onMouseEnter={() => setHovered(value)}
                  onClick={() => setRating(value)}
                  className="rounded-lg p-1 transition hover:scale-110"
                >
                  <Star className={`h-8 w-8 ${active ? 'fill-[#f0b429] text-[#f0b429]' : 'text-[#d6dedd]'}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="review-title" className="block text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">
            {t('emailPages.review.titleLabel')} <span className="font-semibold normal-case text-muted-soft">{t('emailPages.review.optional')}</span>
          </label>
          <input
            id="review-title"
            type="text"
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('emailPages.review.titlePlaceholder')}
            className="mt-1.5 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3.5 py-3 text-[14px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="review-comment" className="block text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">
            {t('emailPages.review.comment')}
          </label>
          <textarea
            id="review-comment"
            rows={5}
            maxLength={1200}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t('emailPages.review.commentPlaceholder')}
            className="mt-1.5 w-full resize-y rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3.5 py-3 text-[14px] leading-relaxed text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
          />
          <p className="mt-1 text-right text-[11.5px] text-muted-soft">{comment.length}/1200</p>
        </div>

        <div>
          <span className="block text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">
            {t('emailPages.review.photos')} <span className="font-semibold normal-case text-muted-soft">{t('emailPages.review.optional')}</span>
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {images.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#e2e8ea]">
                <img src={imagePreviews[index]} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label={t('emailPages.review.removePhoto')}
                  className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < MAX_REVIEW_PHOTOS ? (
              <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border-[1.5px] border-dashed border-[#cbd5d1] text-muted-soft transition hover:border-brand hover:text-brand">
                <PlusCircle className="h-5 w-5" />
                <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
              </label>
            ) : null}
          </div>
          <p className="mt-1 text-[11.5px] text-muted-soft">{t('emailPages.review.photosHelp', { count: MAX_REVIEW_PHOTOS })}</p>
        </div>

        {formError ? <p className="text-[13px] font-semibold text-[#e11d48]">{formError}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> {t('emailPages.review.submitting')}</>) : t('emailPages.review.submit')}
        </button>
        <p className="text-center text-[12px] text-muted-soft">
          {t('emailPages.review.checked')}
        </p>
      </form>
    </Panel>
  );
};

export default ReviewFromEmail;
