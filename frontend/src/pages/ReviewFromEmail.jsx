import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Star } from 'lucide-react';
import { fetchReviewInvite, submitReviewFromToken } from '../services/reviewApi.js';

const formatDateRange = (start, end) => {
  if (!start || !end) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    const from = new Date(start).toLocaleDateString('en-GB', opts);
    const to = new Date(end).toLocaleDateString('en-GB', opts);
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
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, invite: null, error: '' });
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setState({ loading: true, invite: null, error: '' });
    try {
      const invite = await fetchReviewInvite(token);
      setState({ loading: false, invite, error: '' });
    } catch (error) {
      setState({ loading: false, invite: null, error: error.message || 'This link could not be opened.' });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (rating < 1) {
      setFormError('Please choose a star rating.');
      return;
    }
    if (comment.trim().length < 10) {
      setFormError('Please share a little more detail (at least 10 characters).');
      return;
    }
    setSubmitting(true);
    try {
      await submitReviewFromToken(token, { rating, title: title.trim(), comment: comment.trim() });
      setDone(true);
    } catch (error) {
      setFormError(error.message || 'Unable to submit your review right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading) {
    return (
      <Panel>
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> Opening your review…
        </div>
      </Panel>
    );
  }

  if (state.error) {
    return (
      <Panel>
        <h1 className="text-[20px] font-extrabold text-ink">We couldn&apos;t open this review</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{state.error}</p>
        <a href="/" className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
          Go to homepage
        </a>
      </Panel>
    );
  }

  if (done) {
    return (
      <Panel>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-brand" />
          <h1 className="mt-3 text-[20px] font-extrabold text-ink">Thank you for your review</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            It will appear on the site once our team has approved it.
          </p>
          <a href="/" className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
            Back to homepage
          </a>
        </div>
      </Panel>
    );
  }

  const { invite } = state;
  const dates = formatDateRange(invite.startDate, invite.endDate);

  return (
    <Panel>
      <h1 className="text-[22px] font-extrabold leading-tight text-ink">
        How was your trip with {invite.driverName}?
      </h1>
      <p className="mt-1.5 text-[13.5px] text-muted-soft">
        {invite.vehicleModel ? `${invite.vehicleModel}` : 'Your trip'}
        {dates ? ` · ${dates}` : ''}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <span className="block text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">Your rating</span>
          <div className="mt-2 flex gap-1.5" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = (hovered || rating) >= value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
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
            Title <span className="font-semibold normal-case text-muted-soft">(optional)</span>
          </label>
          <input
            id="review-title"
            type="text"
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Excellent driver, very punctual"
            className="mt-1.5 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3.5 py-3 text-[14px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="review-comment" className="block text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">
            Your review
          </label>
          <textarea
            id="review-comment"
            rows={5}
            maxLength={1200}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What stood out about the driver, the vehicle and the trip?"
            className="mt-1.5 w-full resize-y rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3.5 py-3 text-[14px] leading-relaxed text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
          />
          <p className="mt-1 text-right text-[11.5px] text-muted-soft">{comment.length}/1200</p>
        </div>

        {formError ? <p className="text-[13px] font-semibold text-[#e11d48]">{formError}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>) : 'Submit review'}
        </button>
        <p className="text-center text-[12px] text-muted-soft">
          Your review is checked by our team before it appears on the site.
        </p>
      </form>
    </Panel>
  );
};

export default ReviewFromEmail;
