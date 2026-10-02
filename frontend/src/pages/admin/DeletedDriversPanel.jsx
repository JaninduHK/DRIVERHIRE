import { useMemo, useState } from 'react';
import { Archive, ChevronDown, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, tagClass } from './adminFormatters.js';

const LICENSE_TAGS = { approved: 'green', pending: 'amber', rejected: 'red' };

const Field = ({ label, value }) => (
  <div>
    <dt className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</dt>
    <dd className="mt-0.5 text-[13px] font-semibold text-ink">{value || '—'}</dd>
  </div>
);

/**
 * Drivers who deleted their account. Their details are retained here, and only
 * here — every other surface was anonymised at deletion.
 */
const DeletedDriversPanel = ({ state, onReload }) => {
  const { items = [], loading, error, retentionYears } = state || {};
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((record) =>
      [record.name, record.email, record.contactNumber]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [items, search]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">
        Loading deleted driver records…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-4">
        <div>
          <b className="text-[15px] text-ink">
            Deleted drivers <span className="font-semibold text-muted-soft">({items.length})</span>
          </b>
          <p className="mt-0.5 text-[12px] text-muted-soft">
            Retained for legal and tax purposes{retentionYears ? ` for ${retentionYears} years` : ''}, then
            destroyed automatically. These details exist nowhere else on the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink transition hover:border-muted-soft"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="border-b border-hairline px-5 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or phone"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <Archive className="h-9 w-9 text-muted-soft" />
          <p>No drivers have deleted their account.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="p-5 text-center text-[13px] text-muted-soft">No records match that search.</p>
      ) : (
        visible.map((record) => {
          const expanded = expandedId === record.id;
          return (
            <div key={record.id} className="border-b border-hairline last:border-b-0">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : record.id)}
                className="grid w-full grid-cols-[1.4fr_1.2fr_.8fr_auto] items-center gap-3 px-5 py-3 text-left transition hover:bg-canvas"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-bold text-ink">{record.name || 'Unknown'}</div>
                  <div className="truncate text-[11.5px] text-muted-soft">{record.email || '—'}</div>
                </div>
                <div className="min-w-0 text-[12.5px] text-muted">
                  {record.contactNumber || 'No phone on record'}
                </div>
                <div className="text-[12px] text-muted-soft">
                  Deleted {formatDate(record.deletedAt)}
                  {record.deletedBy === 'admin' ? ' by admin' : ''}
                </div>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${expanded ? 'rotate-180' : ''}`}
                />
              </button>

              {expanded ? (
                <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Field label="Address" value={record.address} />
                    <Field label="Joined" value={formatDate(record.joinedAt)} />
                    <Field label="Deleted" value={formatDateTime(record.deletedAt)} />
                    <Field label="Sign-in" value={record.authProvider} />
                    <Field label="Experience" value={record.experienceYears ? `${record.experienceYears} years` : null} />
                    <Field label="Approved" value={formatDate(record.driverApprovedAt)} />
                    <Field label="Bookings" value={record.activity?.bookings} />
                    <Field label="Gross revenue" value={formatCurrency(record.activity?.grossRevenue)} />
                    <Field label="Commission charged" value={formatCurrency(record.activity?.commissionCharged)} />
                    <Field label="Commission outstanding" value={formatCurrency(record.activity?.commissionOutstanding)} />
                    <Field label="Reviews" value={record.activity?.reviewCount} />
                    <Field label="Last trip" value={formatDate(record.activity?.lastBookingAt)} />
                  </dl>

                  <div className="mt-4 rounded-xl border border-hairline bg-surface p-4">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                      <ShieldCheck className="h-3.5 w-3.5" /> Licence held at deletion
                    </p>
                    <div className="mt-2 flex flex-wrap items-start gap-4">
                      <dl className="grid flex-1 grid-cols-2 gap-4">
                        <Field label="Type" value={record.licenseType} />
                        <Field
                          label="Status"
                          value={
                            record.licenseStatus ? (
                              <span className={tagClass(LICENSE_TAGS[record.licenseStatus] || 'grey')}>
                                {record.licenseStatus}
                              </span>
                            ) : null
                          }
                        />
                        <Field label="Submitted" value={formatDate(record.licenseSubmittedAt)} />
                        <Field label="Verified" value={formatDate(record.licenseReviewedAt)} />
                      </dl>
                      {record.licenseImage ? (
                        <a href={record.licenseImage} target="_blank" rel="noreferrer" className="flex-shrink-0">
                          <img
                            src={record.licenseImage}
                            alt="Licence held at deletion"
                            className="h-24 w-36 rounded-lg border border-line object-cover"
                          />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {record.vehicles?.length ? (
                    <div className="mt-3 rounded-xl border border-hairline bg-surface p-4">
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                        Vehicles at deletion
                      </p>
                      <ul className="mt-2 divide-y divide-hairline">
                        {record.vehicles.map((vehicle, index) => (
                          <li key={`${vehicle.model}-${index}`} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                            <span className="font-bold text-ink">
                              {vehicle.model} {vehicle.year ? `· ${vehicle.year}` : ''}
                            </span>
                            <span className="text-muted-soft">
                              {vehicle.seats ? `${vehicle.seats} seats · ` : ''}
                              {formatCurrency(vehicle.pricePerDay)}/day · {vehicle.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};

export default DeletedDriversPanel;
