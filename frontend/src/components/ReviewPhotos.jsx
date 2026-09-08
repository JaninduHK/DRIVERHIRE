import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

// Thumbnail row for photos attached to a review; click a thumbnail to view it full size
// in a lightbox overlay (arrow keys / on-screen arrows move between photos).
// Pass `onRemove(src)` (admin-only) to overlay a delete button on each thumbnail;
// omit it for the read-only public display.
const ReviewPhotos = ({ images, className = '', onRemove, removingImage = '' }) => {
  const list = Array.isArray(images) ? images.filter(Boolean).slice(0, 4) : [];
  const [openIndex, setOpenIndex] = useState(null);
  const isOpen = openIndex !== null;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenIndex(null);
      else if (event.key === 'ArrowRight') setOpenIndex((i) => (i + 1) % list.length);
      else if (event.key === 'ArrowLeft') setOpenIndex((i) => (i - 1 + list.length) % list.length);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, list.length]);

  if (list.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`mt-2.5 flex flex-wrap gap-1.5 ${className}`}>
        {list.map((src, index) => (
          <div key={`${src}-${index}`} className="group relative h-14 w-14">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="block h-14 w-14 overflow-hidden rounded-lg border border-[#eef1f0] bg-[#f2f5f4]"
              aria-label="View review photo"
            >
              <img src={src} alt="Review photo" loading="lazy" className="h-full w-full object-cover" />
            </button>
            {onRemove ? (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onRemove(src); }}
                disabled={removingImage === src}
                aria-label="Delete photo"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#0f1f2d]/80 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-100"
              >
                {removingImage === src ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={list[openIndex]}
            alt="Review photo"
            className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Close"
          >
            Close
          </button>
          {list.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((i) => (i - 1 + list.length) % list.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-lg text-white backdrop-blur transition hover:bg-white/25"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((i) => (i + 1) % list.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-lg text-white backdrop-blur transition hover:bg-white/25"
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default ReviewPhotos;
