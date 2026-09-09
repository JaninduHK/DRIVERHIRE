import { ImageIcon } from 'lucide-react';

// Stand-in for a real photo slot. The blog has no CMS/upload pipeline yet, so rather
// than fabricate stock photography, this renders a labeled placeholder — the `alt`
// text stays visible as a caption so the intended shot is still communicated. Swap
// for a real <img> once photography exists; every call site already carries the alt
// text it would need.
const ImagePlaceholder = ({ alt, shape = 'rect', className = '' }) => (
  <div
    className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#e9f8ef] to-[#dcf1e6] text-center ${
      shape === 'rounded' ? 'rounded-[20px]' : ''
    } ${className}`}
  >
    <ImageIcon className="h-6 w-6 flex-shrink-0 text-brand-dark/50" strokeWidth={1.6} />
    {alt ? <span className="max-w-[85%] px-2 text-[11px] font-semibold leading-snug text-brand-dark/60">{alt}</span> : null}
  </div>
);

export default ImagePlaceholder;
