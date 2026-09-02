import { useEffect } from 'react';

/**
 * Full-screen image viewer overlay.
 *
 * Behaviour mirrors the lightbox already used for review photos (Escape closes,
 * arrow keys page, click the backdrop to dismiss, body scroll locked while open)
 * so image viewing feels the same everywhere in the app.
 *
 * Controlled: the parent owns `index` and clears it to close.
 */
const ImageLightbox = ({ images, index, onIndexChange, onClose, alt = 'Photo' }) => {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const isOpen = index !== null && index !== undefined && list.length > 0;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') onIndexChange((index + 1) % list.length);
      else if (event.key === 'ArrowLeft') onIndexChange((index - 1 + list.length) % list.length);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, index, list.length, onClose, onIndexChange]);

  if (!isOpen) return null;

  const safeIndex = Math.min(Math.max(index, 0), list.length - 1);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <img
        src={list[safeIndex]}
        alt={alt}
        className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
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
              onIndexChange((safeIndex - 1 + list.length) % list.length);
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
              onIndexChange((safeIndex + 1) % list.length);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-lg text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Next photo"
          >
            ›
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">
            {safeIndex + 1} / {list.length}
          </span>
        </>
      ) : null}
    </div>
  );
};

export default ImageLightbox;
