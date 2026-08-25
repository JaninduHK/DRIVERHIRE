import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, MessageCircle, RotateCcw, XCircle } from 'lucide-react';
import { Avatar } from '../../components/dashboard/primitives.jsx';
import { formatCurrency, formatDate, formatDateTime, tagClass } from './adminFormatters.js';

const OFFER_STATUS_TAGS = { pending: 'amber', accepted: 'green', declined: 'red' };

const CONVERSATION_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

const hasFlaggedMessage = (conversation) =>
  Array.isArray(conversation.messages) && conversation.messages.some((message) => Boolean(message.warning));

const ConversationsPanel = ({ state, onReload, onStatusChange, onDelete }) => {
  const { items, loading, error, updatingId, deletingId } = state;
  const [filterValue, setFilterValue] = useState('all');
  const [selectedId, setSelectedId] = useState('');

  const flaggedCount = useMemo(() => items.filter(hasFlaggedMessage).length, [items]);

  const visibleThreads = useMemo(
    () => (filterValue === 'flagged' ? items.filter(hasFlaggedMessage) : items),
    [items, filterValue]
  );

  useEffect(() => {
    if (!visibleThreads.some((c) => c.id === selectedId)) {
      setSelectedId(visibleThreads[0]?.id || '');
    }
  }, [visibleThreads, selectedId]);

  const selected = visibleThreads.find((c) => c.id === selectedId) || null;

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading conversations…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={onReload} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[18px] bg-surface text-center text-sm text-muted shadow-card">
        <MessageCircle className="h-9 w-9 text-muted-soft" />
        <p>No conversations in progress.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[340px_1fr] items-start gap-4">
      <div className="rounded-[18px] bg-surface shadow-card">
        <div className="flex gap-2 border-b border-hairline p-3.5">
          <button type="button" onClick={() => setFilterValue('flagged')} className={tagClass(filterValue === 'flagged' ? 'green' : 'grey')}>Flagged {flaggedCount}</button>
          <button type="button" onClick={() => setFilterValue('all')} className={tagClass(filterValue === 'all' ? 'green' : 'grey')}>All {items.length}</button>
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {visibleThreads.length === 0 ? (
            <p className="p-5 text-center text-[13px] text-muted-soft">No threads match this filter.</p>
          ) : (
            visibleThreads.map((conversation) => {
              const flagged = hasFlaggedMessage(conversation);
              const lastMessage = conversation.lastMessage;
              const isActive = conversation.id === selectedId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-hairline px-4 py-3.5 text-left transition ${
                    isActive ? 'bg-brand-tint' : flagged ? 'bg-rose-50/60 dark:bg-rose-400/10 hover:bg-rose-50 dark:hover:bg-rose-400/20' : 'hover:bg-canvas'
                  }`}
                  style={{ borderLeft: `3px solid ${isActive ? '#10a35a' : flagged ? '#e11d48' : 'transparent'}` }}
                >
                  <Avatar name={conversation.traveler?.name} tone="ink" className="h-[38px] w-[38px] flex-shrink-0 text-[13px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <b className="truncate text-[13.5px] text-ink">{conversation.traveler?.name || 'Traveller'}</b>
                      <span className="flex-shrink-0 text-[11px] font-bold text-muted-soft">{formatDateTime(conversation.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-[12px] font-semibold text-muted-soft">{lastMessage?.body || 'No messages yet.'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selected ? (
        <ConversationDetail
          conversation={selected}
          isUpdating={updatingId === selected.id}
          isDeleting={deletingId === selected.id}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ) : (
        <div className="flex min-h-[400px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card">
          Select a conversation to view its history.
        </div>
      )}
    </div>
  );
};

const ConversationDetail = ({ conversation, isUpdating, isDeleting, onStatusChange, onDelete }) => {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];

  return (
    <div className="flex min-h-[600px] flex-col rounded-[18px] bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4">
        <Avatar name={conversation.traveler?.name} tone="amber" className="h-10 w-10 flex-shrink-0 text-[13.5px]" />
        <div className="min-w-0 flex-1">
          <b className="text-[15px] text-ink">{conversation.traveler?.name || 'Traveller'} ↔ {conversation.driver?.name || 'Driver'}</b>
          <p className="text-[12px] text-muted-soft">Vehicle: {conversation.vehicle?.model || '—'} · Unread T:{conversation.travelerUnreadCount ?? 0} D:{conversation.driverUnreadCount ?? 0}</p>
        </div>
        <select
          value={conversation.status}
          onChange={(event) => onStatusChange?.(conversation.id, event.target.value)}
          disabled={isUpdating}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink focus:border-ink focus:outline-none"
        >
          {CONVERSATION_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => { if (window.confirm('Delete this conversation and its messages?')) onDelete?.(conversation.id); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <XCircle className="h-3.5 w-3.5" /> {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {conversation.booking ? (
        <div className="flex items-center gap-3 border-b border-hairline bg-brand-tint/40 px-5 py-3">
          <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand-dark" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <b className="text-[13px] text-ink">
                {conversation.booking.status === 'confirmed' ? 'Booking confirmed' : 'Booking requested'}
              </b>
              <span className={tagClass(conversation.booking.status === 'confirmed' ? 'green' : 'amber')}>{conversation.booking.status}</span>
            </div>
            <p className="truncate text-[12px] text-muted-soft">
              {conversation.booking.vehicleModel || 'Vehicle'} · {formatDate(conversation.booking.startDate)} – {formatDate(conversation.booking.endDate)} · {formatCurrency(conversation.booking.totalPrice || 0)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/60 p-5">
        {messages.length === 0 ? (
          <p className="text-center text-[13px] text-muted-soft">
            {conversation.lastMessage?.body || 'No messages yet.'}
          </p>
        ) : (
          messages.map((message) => {
            const isTraveller = message.senderRole === 'guest';
            const isAdmin = message.senderRole === 'admin';
            const align = isTraveller ? 'items-start' : 'items-end';

            if (message.type === 'offer' && message.offer) {
              const offer = message.offer;
              return (
                <div key={message.id} className={`flex flex-col gap-1 ${align}`}>
                  <div className="max-w-[74%] rounded-2xl border-[1.5px] border-brand-tint bg-surface px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={tagClass('green')}>Offer</span>
                      <span className={tagClass(OFFER_STATUS_TAGS[offer.status] || 'grey')}>{offer.status}</span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] font-bold text-ink">{offer.vehicle?.model || 'Vehicle'}</p>
                    <p className="text-[12px] text-muted-soft">
                      {formatDate(offer.startDate)} – {formatDate(offer.endDate)} · {offer.totalKms} km included · ${offer.pricePerExtraKm}/extra km
                    </p>
                    <p className="mt-1.5 text-[15px] font-extrabold text-brand-dark">{formatCurrency(offer.totalPrice || 0)}</p>
                    {message.body ? (
                      <p className="mt-2 whitespace-pre-line border-t border-hairline pt-2 text-[12px] leading-relaxed text-muted-soft">{message.body}</p>
                    ) : null}
                  </div>
                  {message.warning ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> {message.warning}
                    </div>
                  ) : null}
                  <span className="text-[11px] font-bold text-muted-soft">{message.sender?.name || 'System'} · {formatDateTime(message.createdAt)}</span>
                </div>
              );
            }

            const bubble = isAdmin
              ? 'bg-[#0f1f2d] text-white'
              : isTraveller
                ? 'bg-surface text-ink border border-[#e8edf0]'
                : 'bg-brand-tint text-ink';
            return (
              <div key={message.id} className={`flex flex-col gap-1 ${align}`}>
                <div className={`max-w-[74%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${bubble}`}>
                  {message.body}
                </div>
                {message.warning ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> {message.warning}
                  </div>
                ) : null}
                <span className="text-[11px] font-bold text-muted-soft">{message.sender?.name || 'System'} · {formatDateTime(message.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationsPanel;
