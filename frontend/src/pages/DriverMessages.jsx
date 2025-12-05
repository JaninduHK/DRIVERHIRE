import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarRange, Loader2, Send } from 'lucide-react';
import {
  fetchConversations,
  fetchMessages,
  sendMessage as sendChatMessage,
  sendOffer,
  markConversationRead,
} from '../services/chatApi.js';
import { fetchDriverVehicles } from '../services/driverApi.js';

const DriverMessages = () => {
  const [conversationsState, setConversationsState] = useState({
    loading: true,
    error: '',
    items: [],
  });
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messagesState, setMessagesState] = useState({
    loading: false,
    error: '',
    items: [],
  });
  const [composerValue, setComposerValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [offerForm, setOfferForm] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    totalPrice: '',
    totalKms: '',
    pricePerExtraKm: '',
    note: '',
  });
  const [sendingOffer, setSendingOffer] = useState(false);
  const [vehiclesState, setVehiclesState] = useState({
    loading: false,
    error: '',
    items: [],
  });

  const navigate = useNavigate();

  const loadConversations = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setConversationsState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));
      }
      try {
        const data = await fetchConversations();
        const items = Array.isArray(data?.conversations) ? data.conversations : [];
        setConversationsState({
          loading: false,
          error: '',
          items,
        });
      } catch (error) {
        const message = error?.message || 'Unable to load conversations.';
        if (!silent) {
          setConversationsState({
            loading: false,
            error: message,
            items: [],
          });
        }
      }
    },
    []
  );

  const loadMessages = useCallback(
    async (conversationId, { silent = false } = {}) => {
      if (!conversationId) {
        setMessagesState({
          loading: false,
          error: '',
          items: [],
        });
        return;
      }
      if (!silent) {
        setMessagesState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));
      }
      try {
        const data = await fetchMessages(conversationId);
        setMessagesState({
          loading: false,
          error: '',
          items: Array.isArray(data?.messages) ? data.messages : [],
        });
        try {
          await markConversationRead(conversationId);
        } catch (readError) {
          console.warn('Unable to mark conversation as read:', readError);
        }
        setConversationsState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === conversationId ? { ...item, unreadCount: 0 } : item
          ),
        }));
      } catch (error) {
        const message = error?.message || 'Unable to load messages.';
        if (!silent) {
          setMessagesState({
            loading: false,
            error: message,
            items: [],
          });
        }
      }
    },
    []
  );

  const loadVehicles = useCallback(async () => {
    setVehiclesState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));
    try {
      const data = await fetchDriverVehicles();
      const items = Array.isArray(data?.vehicles) ? data.vehicles : [];
      setVehiclesState({
        loading: false,
        error: '',
        items,
      });
    } catch (error) {
      const message = error?.message || 'Unable to load your vehicles.';
      setVehiclesState({
        loading: false,
        error: message,
        items: [],
      });
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadVehicles();
  }, [loadConversations, loadVehicles]);

  useEffect(() => {
    const interval = setInterval(() => loadConversations({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (
      conversationsState.items.length > 0 &&
      (!selectedConversationId || !conversationsState.items.some((item) => item.id === selectedConversationId))
    ) {
      setSelectedConversationId(conversationsState.items[0].id);
    }
  }, [conversationsState.items, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    const interval = setInterval(() => loadMessages(selectedConversationId, { silent: true }), 5000);
    return () => clearInterval(interval);
  }, [selectedConversationId, loadMessages]);

  const selectedConversation = useMemo(
    () => conversationsState.items.find((item) => item.id === selectedConversationId) || null,
    [conversationsState.items, selectedConversationId]
  );

  useEffect(() => {
    if (selectedConversation?.vehicle?.id) {
      setOfferForm((prev) => ({
        ...prev,
        vehicleId: prev.vehicleId || selectedConversation.vehicle.id,
      }));
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!selectedConversationId || !composerValue.trim()) {
      return;
    }
    setSendingMessage(true);
    try {
      const payload = await sendChatMessage(selectedConversationId, composerValue.trim());
      const newMessage = payload?.message;
      if (newMessage) {
        setMessagesState((prev) => ({
          loading: false,
          error: '',
          items: [...prev.items, newMessage],
        }));
        setConversationsState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === selectedConversationId
              ? { ...item, lastMessage: newMessage, lastMessageAt: newMessage.createdAt, unreadCount: 0 }
              : item
          ),
        }));
      }
      setComposerValue('');
      await markConversationRead(selectedConversationId);
      loadConversations({ silent: true });
    } catch (error) {
      const message = error?.message || 'Unable to send message.';
      toast.error(message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOfferChange = (field, value) => {
    setOfferForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendOffer = async (event) => {
    event.preventDefault();
    if (!selectedConversationId) {
      toast.error('Select a conversation before sending an offer.');
      return;
    }

    const { startDate, endDate, vehicleId, totalPrice, totalKms, pricePerExtraKm, note } = offerForm;

    if (!startDate || !endDate || !vehicleId || !totalPrice || !totalKms) {
      toast.error('Fill in the offer details before sending.');
      return;
    }

    setSendingOffer(true);
    try {
      const payload = await sendOffer(selectedConversationId, {
        startDate,
        endDate,
        vehicleId,
        totalPrice: Number(totalPrice),
        totalKms: Number(totalKms),
        pricePerExtraKm: Number(pricePerExtraKm || 0),
        note,
      });

      const newMessage = payload?.message;
      if (newMessage) {
        setMessagesState((prev) => ({
          loading: false,
          error: '',
          items: [...prev.items, newMessage],
        }));
        setConversationsState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === selectedConversationId
              ? { ...item, lastMessage: newMessage, lastMessageAt: newMessage.createdAt, unreadCount: 0 }
              : item
          ),
        }));
      }

      toast.success('Offer sent to the traveller.');
      setOfferForm((prev) => ({
        ...prev,
        totalPrice: '',
        totalKms: '',
        pricePerExtraKm: '',
        note: '',
      }));
      loadConversations({ silent: true });
    } catch (error) {
      const message = error?.message || 'Unable to send offer.';
      toast.error(message);
    } finally {
      setSendingOffer(false);
    }
  };

  const conversations = conversationsState.items;
  const messages = messagesState.items;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Traveller messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Coordinate itineraries, share updates, and send formal offers directly from your inbox.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/portal/driver')}
          className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Back to dashboard
        </button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Conversations</h2>
            <button
              type="button"
              onClick={() => loadConversations({ silent: false })}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Refresh
            </button>
          </div>
          {conversationsState.loading ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
              Loading conversations...
            </div>
          ) : conversationsState.error ? (
            <div className="flex min-h-[200px] items-center justify-center text-center text-sm text-rose-600">
              {conversationsState.error}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-center text-sm text-slate-500">
              No messages yet. Travellers can reach out from the vehicle details page.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {conversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId;
                const travellerName =
                  conversation.participants?.traveler?.name ||
                  conversation.participants?.traveler?.email ||
                  'Traveller';
                const preview = conversation.lastMessage?.body || 'Conversation started.';
                const timestamp = formatShortDateTime(conversation.lastMessageAt || conversation.updatedAt);

                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-emerald-300 bg-white shadow-sm'
                          : 'border-transparent bg-white/60 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">{travellerName}</span>
                        <span className="text-xs text-slate-400">{timestamp}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{preview}</p>
                      {conversation.unreadCount > 0 ? (
                        <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          {conversation.unreadCount} new
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="flex h-full flex-col space-y-5">
          <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white">
            {selectedConversation ? (
              <>
                <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedConversation.participants?.traveler?.name || 'Traveller'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedConversation.vehicle?.model
                        ? `Interested in ${selectedConversation.vehicle.model}`
                        : 'General enquiry'}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Driver view
                  </span>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {messagesState.loading && messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                      Loading messages...
                    </div>
                  ) : messagesState.error ? (
                    <div className="flex h-full items-center justify-center text-sm text-rose-600">
                      {messagesState.error}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Welcome the traveller and share itinerary ideas.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isDriver = message.sender?.role === 'driver' || message.senderRole === 'driver';
                      const containerClass = isDriver ? 'justify-end' : 'justify-start';
                      const bubbleClass = isDriver
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200';
                      const timestamp = formatChatTimestamp(message.createdAt);

                      return (
                        <div key={message.id} className={`flex ${containerClass}`}>
                          <div className={`max-w-full rounded-2xl px-4 py-3 text-sm shadow-sm ${bubbleClass}`}>
                            <p className={`text-[11px] font-semibold ${isDriver ? 'text-slate-200/80' : 'text-slate-500'}`}>
                              {isDriver ? 'You' : message.sender?.name || 'Traveller'} • {timestamp}
                            </p>
                            <div className="mt-1 whitespace-pre-wrap text-sm">{message.body}</div>
                            {message.warning ? (
                              <div
                                className={`mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                                  isDriver
                                    ? 'border-slate-700 bg-slate-800/80 text-slate-100'
                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                }`}
                              >
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                                <span>{message.warning}</span>
                              </div>
                            ) : null}
                            {message.type === 'offer' && message.offer ? (
                              <DriverOfferDetails message={message} />
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {messagesState.loading && messages.length > 0 ? (
                    <div className="flex items-center justify-center text-xs text-slate-400">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Refreshing...
                    </div>
                  ) : null}
                </div>

                <footer className="border-t border-slate-200 bg-white px-4 py-3">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!composerValue.trim()) {
                        return;
                      }
                      handleSendMessage();
                    }}
                    className="space-y-2"
                  >
                    <textarea
                      value={composerValue}
                      onChange={(event) => setComposerValue(event.target.value)}
                      placeholder="Reply to your traveller..."
                      className="min-h-[80px] w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <p>Keep communication on Car With Driver. Personal contact details are hidden automatically.</p>
                      <button
                        type="submit"
                        disabled={!composerValue.trim() || sendingMessage}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {sendingMessage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send message
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </footer>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                Select a conversation to view messages.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <h2 className="font-semibold text-slate-900">Send an offer</h2>
              <span className="text-xs text-slate-500">Travellers can book confirmed offers in checkout.</span>
            </div>
            <form onSubmit={handleSendOffer} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Start date
                <input
                  type="date"
                  value={offerForm.startDate}
                  onChange={(event) => handleOfferChange('startDate', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                End date
                <input
                  type="date"
                  value={offerForm.endDate}
                  onChange={(event) => handleOfferChange('endDate', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Vehicle
                <select
                  value={offerForm.vehicleId}
                  onChange={(event) => handleOfferChange('vehicleId', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  required
                >
                  <option value="">Select a vehicle</option>
                  {vehiclesState.items.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.model} • ${vehicle.pricePerDay}/day
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Total price (USD)
                <input
                  type="number"
                  min="0"
                  value={offerForm.totalPrice}
                  onChange={(event) => handleOfferChange('totalPrice', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Included kms
                <input
                  type="number"
                  min="0"
                  value={offerForm.totalKms}
                  onChange={(event) => handleOfferChange('totalKms', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Price per extra km (USD)
                <input
                  type="number"
                  min="0"
                  value={offerForm.pricePerExtraKm}
                  onChange={(event) => handleOfferChange('pricePerExtraKm', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-xs font-medium text-slate-600">Notes to traveller (optional)</span>
                <textarea
                  rows={3}
                  value={offerForm.note}
                  onChange={(event) => handleOfferChange('note', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  placeholder="Share highlights, inclusions, or expectations for this itinerary."
                />
              </label>
              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Travellers will see this offer in their chat and can book it instantly through checkout.
                </p>
                <button
                  type="submit"
                  disabled={sendingOffer || !selectedConversationId}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {sendingOffer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Sending offer...
                    </>
                  ) : (
                    <>
                      <CalendarRange className="h-4 w-4" />
                      Send offer
                    </>
                  )}
                </button>
              </div>
            </form>
            {vehiclesState.loading ? (
              <p className="mt-3 text-xs text-slate-400">Loading vehicles...</p>
            ) : vehiclesState.error ? (
              <p className="mt-3 text-xs text-rose-600">{vehiclesState.error}</p>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
};

const DriverOfferDetails = ({ message }) => {
  const { offer } = message;
  const start = formatDateLabel(offer.startDate);
  const end = formatDateLabel(offer.endDate);
  const totalPrice = formatCurrency(offer.totalPrice);
  const vehicleName = offer.vehicle?.model || 'Selected vehicle';

  return (
    <div className="mt-3 space-y-1 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-3 text-sm text-slate-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Offer summary</p>
      <p>
        <strong>Vehicle:</strong> {vehicleName}
      </p>
      <p>
        <strong>Dates:</strong> {start} to {end}
      </p>
      <p>
        <strong>Total price:</strong> {totalPrice} ({offer.currency})
      </p>
      <p>
        <strong>Included distance:</strong> {offer.totalKms} km · Extra km {formatCurrency(offer.pricePerExtraKm)}
      </p>
    </div>
  );
};

const formatShortDateTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatChatTimestamp = (value) => {
  if (!value) {
    return 'now';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'now';
  }
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateLabel = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (value) => {
  if (typeof value !== 'number') {
    return '$0';
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

export default DriverMessages;
