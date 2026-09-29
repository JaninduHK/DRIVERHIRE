import { AlertTriangle } from 'lucide-react';
import { contactWarningMessage } from '../lib/contactWarning.js';

/**
 * Inline warning shown to a DRIVER while they type, when the text looks like it
 * contains contact details. Renders nothing otherwise. Travellers never see this —
 * their contact details are redacted too, but they are not the ones being policed.
 */
const ContactWarning = ({ value, className = '' }) => {
  const message = contactWarningMessage(value);
  if (!message) return null;
  return (
    <p className={`mt-1.5 flex items-start gap-1.5 rounded-lg bg-[#fdf0d8] px-2.5 py-2 text-[11.5px] font-semibold leading-[1.5] text-[#a86a15] ${className}`}>
      <AlertTriangle className="mt-[1px] h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
};

export default ContactWarning;
