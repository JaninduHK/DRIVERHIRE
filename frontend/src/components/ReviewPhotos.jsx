// Thumbnail row for photos attached to a review; each opens full size in a new tab.
const ReviewPhotos = ({ images, className = '' }) => {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }
  return (
    <div className={`mt-2.5 flex flex-wrap gap-1.5 ${className}`}>
      {images.slice(0, 4).map((src, index) => (
        <a
          key={`${src}-${index}`}
          href={src}
          target="_blank"
          rel="noreferrer"
          className="block h-14 w-14 overflow-hidden rounded-lg border border-[#eef1f0] bg-[#f2f5f4]"
        >
          <img src={src} alt="Review photo" loading="lazy" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
};

export default ReviewPhotos;
