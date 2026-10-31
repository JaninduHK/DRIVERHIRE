import { CheckCheck } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';

const formatMessageTime = (value, intl = 'en-US') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(intl, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Timestamp under every message, plus read ticks on your own outgoing ones.
 *
 * Deliberately sits BELOW the bubble rather than inside it: an outgoing bubble is
 * solid brand green, where a green "read" tick would be invisible. On the canvas
 * both the grey and the green read clearly.
 *
 * Ticks only appear on messages you sent — whether you read your own message is
 * not a thing anyone needs to be told.
 */
const MessageMeta = ({ message, mine }) => {
  const { t, intl } = useI18n();
  const time = formatMessageTime(message?.createdAt, intl);
  if (!time) return null;

  const read = Boolean(message?.readByRecipient);

  return (
    <div className={`mt-1 flex items-center gap-1 px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
      <span className="text-[10.5px] font-medium text-muted-soft">{time}</span>
      {mine ? (
        <CheckCheck
          className={`h-3.5 w-3.5 ${read ? 'text-brand' : 'text-muted-soft'}`}
          aria-label={read ? t('chat.read') : t('chat.sent')}
        />
      ) : null}
    </div>
  );
};

export default MessageMeta;
