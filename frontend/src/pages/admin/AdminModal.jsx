import { useEffect } from 'react';
import { X } from 'lucide-react';

// Shared popup shell for admin "create/edit" forms — bottom sheet on mobile,
// centered card on desktop. Mirrors the pattern in BookingDetailsModal.jsx.
const AdminModal = ({ open, onClose, title, subtitle, children, widthClass = 'sm:max-w-2xl' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0f1f2d]/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface sm:rounded-[20px] ${widthClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-hairline bg-surface px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-[12.5px] text-muted-soft">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-muted transition hover:bg-canvas"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default AdminModal;
