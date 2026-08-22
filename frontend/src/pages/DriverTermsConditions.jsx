import React from 'react';

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-6 text-slate-700">{children}</div>
  </section>
);

const Point = ({ n, children }) => (
  <p>
    <b className="text-slate-900">{n}</b> {children}
  </p>
);

const CANCELLATION_ROWS = [
  { when: 'More than 2 days before the start date', get: 'Nothing — free cancellation' },
  { when: 'Within 2 days of the start date', get: '50% of the total hire cost' },
  { when: 'After the hire has started', get: '100% of completed days plus 50% of the days not yet completed' },
];

const DriverTermsConditions = () => {
  const updatedOn = '2026-08-22';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Driver Terms &amp; Conditions
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Driver Terms &amp; Conditions — carwithdriver.lk
          </h1>
          <p className="text-sm text-slate-600">Last updated: {updatedOn}</p>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            These terms apply to every driver with an account on carwithdriver.lk (&ldquo;the site&rdquo;). By listing your services, sending a quotation or accepting a booking, you agree to be bound by them. &ldquo;Admin&rdquo; means the carwithdriver.lk management team. &ldquo;Traveller&rdquo; or &ldquo;client&rdquo; means the person requesting or booking a car and driver.
          </p>
        </header>

        <div className="mt-10 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <Section title="1. Eligibility and account">
            <Point n="1.1">Each driver may hold one account only. Accounts are personal and must not be shared, sold or transferred.</Point>
            <div>
              <Point n="1.2">To operate on the site you must hold, and keep valid at all times:</Point>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>a valid Sri Lankan driving licence for the class of vehicle you are offering;</li>
                <li>a valid chauffeur guide / tourist driver licence where required for the services you offer;</li>
                <li>valid revenue licence, insurance and emissions certification for every vehicle listed on your profile;</li>
                <li>any registration required by the Sri Lanka Tourism Development Authority for your category of service.</li>
              </ul>
            </div>
            <Point n="1.3">Admin may request copies of the above at any time. Failure to provide them within 7 days may result in your listing being hidden until documents are supplied.</Point>
            <Point n="1.4">All information on your profile — vehicle model, year, seat capacity, air conditioning, languages spoken and photographs — must be accurate and must show your own vehicle. Stock or borrowed photographs are not permitted.</Point>
          </Section>

          <Section title="2. Contact details">
            <Point n="2.1">Drivers must not share personal contact details with a traveller before a booking is confirmed. This includes your phone number, WhatsApp number, email address, Facebook page, Instagram, personal website or any other means of direct contact.</Point>
            <Point n="2.2">This applies everywhere on the site, including your profile description, your quotations, and the chat/messaging system.</Point>
            <Point n="2.3">Drivers must not suggest, hint at or invite contact outside the site before confirmation. Phrases such as &ldquo;contact me directly&rdquo;, &ldquo;find me on Facebook&rdquo; or &ldquo;message me for my number&rdquo; are not permitted, whether or not the actual details are given.</Point>
            <Point n="2.4">Once a booking is confirmed, contact details are exchanged between the traveller and the driver, and you are free to communicate privately from that point onwards.</Point>
            <Point n="2.5">Attempting to take a traveller off the site in order to avoid commission is treated as a serious breach and may result in immediate and permanent removal from the site.</Point>
          </Section>

          <Section title="3. Quotations and messages">
            <Point n="3.1">Your quotation must match the request. Dates, total number of days, number of driver days, pick-up and drop-off locations and passenger numbers must all agree with the traveller&rsquo;s enquiry. If any detail in the enquiry is wrong or unclear, correct it in your quotation or ask the traveller through the site&rsquo;s messaging system before quoting.</Point>
            <Point n="3.2">Quotations prepared with the help of AI tools are permitted, but you are responsible for the content. Check every quotation in full before sending it. Inaccurate, generic or nonsensical quotations may be removed.</Point>
            <Point n="3.3">If a quotation of yours is removed and you do not understand why, email Admin with a link to the quotation and you will receive an explanation.</Point>
            <Point n="3.4">Do not invent rules. Telling a traveller that something is &ldquo;not allowed by the site&rdquo; when it is not covered by these terms is not permitted. If you are unsure whether something is allowed, ask Admin rather than telling the traveller.</Point>
            <Point n="3.5">If a traveller asks for a price for a separate trip that cannot be covered by the current quotation, ask them to submit a new enquiry through the site. Do not price a second hire inside an existing quotation or message.</Point>
            <Point n="3.6">Prices for third-party items such as safari jeeps, entrance tickets, hotels, guides and boat rides may be discussed in quotations and messages, as may per-kilometre rates for extra distance and currency exchange rates.</Point>
            <Point n="3.7">Once a price has been agreed and the booking confirmed, it may not be increased. Requesting additional money from a traveller after confirmation — for fuel, parking, driver accommodation or any other reason not stated in the quotation — is a breach of these terms.</Point>
          </Section>

          <Section title="4. Reviews">
            <Point n="4.1">Submitting, arranging or encouraging fake reviews is prohibited. Any driver found to have done so will be permanently banned from the site.</Point>
            <Point n="4.2">Do not ask travellers to look up your reviews on other platforms, and do not discuss the number or rating of reviews your business holds elsewhere, within quotations or messages on the site.</Point>
            <Point n="4.3">You may ask a traveller for an honest review on carwithdriver.lk after the hire is complete. You may not offer a discount, refund, gift or any other incentive in exchange for a review.</Point>
          </Section>

          <Section title="5. Carrying out the hire">
            <Point n="5.1">Freelance drivers must personally carry out the hires they accept. Passing a hire to another driver, or using another company&rsquo;s vehicle or driver to complete it, is not permitted without the prior written agreement of Admin and the traveller.</Point>
            <Point n="5.2">Registered companies with more than one driver may assign a hire to another of their own drivers, provided the traveller is informed before the start date.</Point>
            <Point n="5.3">If illness, breakdown or another emergency prevents you from carrying out a confirmed hire, inform the traveller and Admin immediately so that a replacement can be arranged.</Point>
            <Point n="5.4">You must respond to messages from confirmed travellers within a reasonable time — normally within 24 hours — up to and during the hire.</Point>
            <Point n="5.5">You are responsible for the safety and lawful conduct of the hire, including observing speed limits, working hours and rest, and carrying valid insurance for your passengers throughout.</Point>
          </Section>

          <Section title="6. Commission">
            <Point n="6.1">Commission on every hire booked through the site is <b className="text-slate-900">8% of the total hire value</b>.</Point>
            <Point n="6.2">Commission is deposited by the driver at the <b className="text-slate-900">start of each month</b>, covering the hires confirmed on your account for that month. Admin will issue a statement showing the hires included and the amount due.</Point>
            <Point n="6.3">Where carwithdriver.lk has offered the traveller a promotional discount of between <b className="text-slate-900">3% and 5%</b>, the amount of that discount is deducted from the commission payable by the driver. For example, on a hire valued at LKR 100,000 with a 3% traveller discount, commission is 8% − 3% = 5%, i.e. LKR 5,000.</Point>
            <Point n="6.4">Commission is calculated on the agreed hire price for the car and driver. It is not charged on third-party items paid separately by the traveller, such as entrance tickets, safari jeeps or hotel bookings.</Point>
            <Point n="6.5">Accounts with unpaid commission may be suspended from receiving new enquiries until payment is made.</Point>
            <Point n="6.6">Commission is not charged where the traveller cancels a hire and no payment becomes due to the driver under section 7. Where a cancellation results in a partial payment to the driver, commission is charged on the amount actually received.</Point>
            <Point n="6.7">Commission may be charged in full on a hire that is cancelled because of the driver. This includes, without limitation: failing to communicate with the traveller after confirmation; not having a suitable vehicle available (genuine illness and breakdown excluded); or attempting to change the agreed price. Admin will decide each case on its own circumstances.</Point>
          </Section>

          <Section title="7. Cancellation policy">
            <p>All drivers must honour the following cancellation policy. It is shown to travellers at the time of booking and forms part of the agreement between the driver and the traveller.</p>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div>When the traveller cancels</div>
                <div>Amount payable to the driver</div>
              </div>
              {CANCELLATION_ROWS.map((row, i) => (
                <div
                  key={row.when}
                  className={`grid grid-cols-2 gap-3 px-4 py-3.5 ${i < CANCELLATION_ROWS.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <div className="text-slate-700">{row.when}</div>
                  <div className="font-medium text-slate-900">{row.get}</div>
                </div>
              ))}
            </div>
            <Point n="7.1">&ldquo;Days&rdquo; means the hire days set out in the confirmed booking.</Point>
            <Point n="7.2">Drivers may not apply a stricter cancellation policy, and may not request a non-refundable deposit that exceeds the amounts above.</Point>
            <Point n="7.3">A driver may choose to waive or reduce these charges as a gesture of goodwill, but may not demand more.</Point>
            <Point n="7.4">If a driver cancels a confirmed hire, no cancellation charge is payable by the traveller and any advance payment must be refunded in full. Repeated cancellations by a driver will result in removal from the site.</Point>
            <Point n="7.5">Where a hire cannot go ahead because of events outside the control of either party — natural disaster, civil unrest, government restrictions, closure of a border or airport — Admin will decide a fair outcome, normally payment for completed days only.</Point>
            <Point n="7.6">If a traveller cancels outside the site and the cancellation is not recorded on your account, email Admin with evidence — an email or WhatsApp conversation with the traveller — so that your commission can be adjusted.</Point>
          </Section>

          <Section title="8. Monitoring and enforcement">
            <Point n="8.1">All quotations and messages sent through the site are monitored by Admin.</Point>
            <Point n="8.2">A first breach of these terms will normally result in a warning. Repeating a breach after a warning, or repeating any wording that Admin has previously warned you about, will result in further action.</Point>
            <Point n="8.3">Depending on the seriousness of the breach, action may include: removal of a quotation, a warning, hiding your listing from search results, suspension of your account, or permanent removal from the site.</Point>
            <Point n="8.4">The following are treated as serious breaches and may result in immediate removal without a prior warning: fake reviews, sharing contact details in order to avoid commission, providing false documents, and any conduct that endangers or harasses a traveller.</Point>
            <Point n="8.5">Admin&rsquo;s decision is final in all disputes between drivers and travellers arising on the site.</Point>
          </Section>

          <Section title="9. General">
            <Point n="9.1">Drivers are independent operators. Nothing in these terms creates an employment relationship, partnership or agency between the driver and carwithdriver.lk.</Point>
            <Point n="9.2">carwithdriver.lk is an introduction platform. The contract for the hire itself is between the driver and the traveller. The driver is responsible for the vehicle, the service and all applicable taxes and licences.</Point>
            <Point n="9.3">Drivers are responsible for their own income tax and any other liabilities arising from their earnings.</Point>
            <Point n="9.4">Admin may amend these terms at any time. Drivers will be notified and continued use of the site after notification constitutes acceptance.</Point>
            <Point n="9.5">These terms are governed by the laws of Sri Lanka.</Point>
          </Section>

          <Section title="Questions?">
            <p>
              Email <a className="text-emerald-700 underline" href="mailto:hello@carwithdriver.lk">hello@carwithdriver.lk</a> and we will get back to you.
            </p>
          </Section>

        </div>
      </div>
    </main>
  );
};

export default DriverTermsConditions;
