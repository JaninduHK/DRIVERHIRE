import { useState } from 'react';
import ImageLightbox from './ImageLightbox.jsx';

/**
 * Vehicle photos shown inside a chat offer bubble, as a row of small squares.
 * Tapping one opens it full size in a lightbox.
 *
 * Squares keep the bubble compact in a message thread while still showing every
 * photo the driver uploaded (capped at 5 by the upload middleware, so the row
 * fits without paging). Renders nothing when the vehicle has no photos, so older
 * offers keep their original layout.
 */
const OfferVehicleImages = ({ images, alt = 'Vehicle', className = '' }) => {
  // Track failures per URL so one dead image hides itself instead of leaving a
  // broken-image icon in the row — and so the lightbox never opens on it.
  const [failed, setFailed] = useState(() => new Set());
  const [openIndex, setOpenIndex] = useState(null);

  const list = (Array.isArray(images) ? images : []).filter(
    (url) => Boolean(url) && !failed.has(url)
  );

  if (list.length === 0) return null;

  return (
    <>
      <div className={`flex gap-1.5 overflow-x-auto ${className}`}>
        {list.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={list.length > 1 ? `View ${alt} photo ${index + 1}` : `View ${alt} photo`}
            className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[10px] border border-[#e8edf0] bg-canvas transition hover:border-brand focus:border-brand focus:outline-none"
          >
            <img
              src={url}
              alt={list.length > 1 ? `${alt} photo ${index + 1}` : alt}
              loading="lazy"
              onError={() => setFailed((prev) => new Set(prev).add(url))}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <ImageLightbox
        images={list}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
        alt={alt}
      />
    </>
  );
};

export default OfferVehicleImages;
