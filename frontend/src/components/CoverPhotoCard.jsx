import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { removeCoverPhoto, uploadCoverPhoto } from '../services/driverApi.js';

const MAX_BYTES = 10 * 1024 * 1024; // matches the server's upload limit

const STATUS = {
  pending: { text: 'Waiting for approval', cls: 'bg-[#fdf0d8] text-[#a86a15]' },
  approved: { text: 'Live on your profile', cls: 'bg-brand-tint text-brand-dark' },
  rejected: { text: 'Not approved', cls: 'bg-[#ffe4e9] text-[#e11d48]' },
};

/**
 * Driver dashboard: upload a profile cover photo. It goes live only after an admin
 * approves it; until then (or without one) the profile uses a vehicle photo.
 */
const CoverPhotoCard = ({ profile, className = 'mt-4', onChanged }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [cover, setCover] = useState(() => ({
    coverPhoto: profile?.coverPhoto || '',
    coverPhotoPending: profile?.coverPhotoPending || '',
    coverPhotoStatus: profile?.coverPhotoStatus || 'none',
    coverPhotoNote: profile?.coverPhotoNote || '',
  }));

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Please choose an image under 10 MB.');
      return;
    }
    setBusy('upload');
    try {
      const response = await uploadCoverPhoto(file);
      setCover(response.cover);
      onChanged?.();
      toast.success('Cover photo sent for review. It goes live once approved.');
    } catch (error) {
      toast.error(error?.message || 'Unable to upload the cover photo.');
    } finally {
      setBusy('');
    }
  };

  const handleRemove = async () => {
    setBusy('remove');
    try {
      const response = await removeCoverPhoto();
      setCover(response.cover);
      onChanged?.();
      toast.success('Cover photo removed. Your profile shows a vehicle photo instead.');
    } catch (error) {
      toast.error(error?.message || 'Unable to remove the cover photo.');
    } finally {
      setBusy('');
    }
  };

  const status = STATUS[cover.coverPhotoStatus];
  // Show the photo under review if there is one, else the live one.
  const preview = cover.coverPhotoPending || cover.coverPhoto;

  return (
    <div className={`rounded-[18px] bg-white p-4 shadow-card ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <b className="text-[14px] text-ink">Cover photo</b>
        {status ? <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${status.cls}`}>{status.text}</span> : null}
      </div>
      <div className="relative aspect-[16/6] w-full overflow-hidden rounded-xl bg-canvas">
        {preview ? (
          <img src={preview} alt="Cover photo" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-[12.5px] text-muted-soft">
            No cover photo yet. Your profile shows a photo of your vehicle.
          </div>
        )}
      </div>
      {cover.coverPhotoStatus === 'pending' && cover.coverPhoto ? (
        <p className="mt-2 text-[12px] text-muted-soft">Your current approved cover stays live until this one is approved.</p>
      ) : null}
      {cover.coverPhotoStatus === 'rejected' ? (
        <p className="mt-2 text-[12px] font-semibold text-[#e11d48]">
          {cover.coverPhotoNote ? `Reason: ${cover.coverPhotoNote}` : 'Please upload a different photo.'}
        </p>
      ) : null}
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-soft">
        A wide landscape photo works best (for example 1600 × 600): your vehicle or a place you drive to. No phone numbers, logos or text. Our team checks every cover before it goes live.
      </p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-brand py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {preview ? 'Upload a new cover' : 'Upload cover photo'}
        </button>
        {preview ? (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={handleRemove}
            aria-label="Remove cover photo"
            className="grid w-11 place-items-center rounded-[11px] border-[1.5px] border-[#ffd3d9] text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60"
          >
            {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default CoverPhotoCard;
