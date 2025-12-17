import React from 'react';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-6 text-slate-700">{children}</div>
  </section>
);

const TermsConditions = () => {
  const updatedOn = '2024-06-01';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Terms &amp; Conditions
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your agreement with Car With Driver LK
          </h1>
          <p className="text-sm text-slate-600">Effective date: {updatedOn}</p>
        </header>

        <div className="mt-10 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Section title="1. Using our platform">
            <p>
              By creating an account or booking a driver, you agree to these Terms. You must be at least 18 and provide accurate information. We may suspend accounts for fraud, abuse, unsafe behaviour, or violating these Terms.
            </p>
          </Section>

          <Section title="2. Bookings and payments">
            <ul className="list-disc space-y-2 pl-5">
              <li>Pricing: Drivers set rates. Platform-wide discounts reduce the payable total shown at checkout.</li>
              <li>Payment: Travellers pay the driver directly unless specified otherwise. Commission is deducted from driver earnings.</li>
              <li>Changes/cancellations: Follow the instructions in your booking emails or message the driver. Some trips may be non-refundable after start.</li>
              <li>Conflicts: Contact support if a driver or traveller needs to amend or resolve an issue.</li>
            </ul>
          </Section>

          <Section title="3. Driver responsibilities">
            <ul className="list-disc space-y-2 pl-5">
              <li>Maintain valid licences, insurance, and roadworthy vehicles.</li>
              <li>Keep profile, availability, and pricing accurate; reply promptly to travellers.</li>
              <li>Honor accepted bookings and communicate early if emergencies arise.</li>
            </ul>
          </Section>

          <Section title="4. Traveller responsibilities">
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide accurate trip details, pickup/drop points, and flight times if applicable.</li>
              <li>Treat drivers respectfully and follow local laws and safety instructions.</li>
              <li>Pay the agreed amount to the driver on time, factoring any discounts shown during checkout.</li>
            </ul>
          </Section>

          <Section title="5. Safety and conduct">
            <p>
              We may remove users for harassment, discrimination, dangerous driving, fraud, or misuse of the platform.
              Report concerns to support@carwithdriver.lk with trip details.
            </p>
          </Section>

          <Section title="6. Content and reviews">
            <p>
              Reviews must be truthful and respectful. We may moderate or remove content that is abusive, misleading, or violates laws or these Terms.
            </p>
          </Section>

          <Section title="7. Liability">
            <p>
              Car With Driver LK connects travellers and drivers. We are not the employer of drivers nor the operator of vehicles.
              To the fullest extent permitted by law, we are not liable for indirect or incidental damages arising from trips or platform use.
            </p>
          </Section>

          <Section title="8. Changes to terms">
            <p>
              We may update these Terms for legal, security, or product reasons. Continued use after updates means you accept the new Terms. We will note the effective date above.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions about these Terms? Email <a className="text-emerald-700 underline" href="mailto:hello@carwithdriver.lk">hello@carwithdriver.lk</a> or call +94 76 302 1483.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
};

export default TermsConditions;
