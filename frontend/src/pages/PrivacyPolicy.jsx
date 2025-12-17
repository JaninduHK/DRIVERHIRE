import React from 'react';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-6 text-slate-700">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  const updatedOn = '2024-06-01';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Privacy Policy
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How Car With Driver LK protects your data
          </h1>
          <p className="text-sm text-slate-600">
            Effective date: {updatedOn}. We explain what we collect, why we collect it, and the controls you have.
          </p>
        </header>

        <div className="mt-10 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Section title="Information we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>Account details: name, email, phone, and password (hashed).</li>
              <li>Driver profile: description, vehicle info, live location label/coordinates (if shared), and uploaded images.</li>
              <li>Booking data: trip dates, start/end points, flight details, traveller messages, and payment notes.</li>
              <li>Usage data: device/browser info, pages viewed, and analytics events to improve reliability.</li>
            </ul>
          </Section>

          <Section title="How we use your information">
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and manage traveller, driver, and admin accounts.</li>
              <li>To process bookings, quotes, messages, and support requests.</li>
              <li>To verify drivers, publish vehicles, and display live map pins when drivers opt-in.</li>
              <li>To send transactional emails (verification, booking updates, approvals) and critical service notices.</li>
              <li>To improve safety, detect fraud/abuse, and comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="Sharing and disclosures">
            <ul className="list-disc space-y-2 pl-5">
              <li>With drivers and travellers involved in a booking or message thread.</li>
              <li>With service providers (hosting, email, analytics, payment gateways) bound by confidentiality.</li>
              <li>When required by law, to protect safety, or to enforce our Terms & Conditions.</li>
              <li>We do not sell personal data.</li>
            </ul>
          </Section>

          <Section title="Data retention and security">
            <ul className="list-disc space-y-2 pl-5">
              <li>Passwords are hashed; uploads are stored securely with access controls.</li>
              <li>We keep data for as long as needed to provide the service and meet legal requirements, then delete or anonymize it.</li>
              <li>Access to admin tools is restricted and logged.</li>
            </ul>
          </Section>

          <Section title="Your choices">
            <ul className="list-disc space-y-2 pl-5">
              <li>Update or delete your profile information inside your account or by contacting support.</li>
              <li>Drivers can clear live location at any time from the profile page.</li>
              <li>Unsubscribe from marketing (if enabled) via the email footer; transactional emails will still be sent.</li>
              <li>Request access, correction, or deletion by emailing support@carwithdriver.lk.</li>
            </ul>
          </Section>

          <Section title="Children">
            <p>Our services are not directed to children under 16. If we learn we collected such data, we will delete it.</p>
          </Section>

          <Section title="Changes to this policy">
            <p>We may update this policy for clarity or compliance. We will post updates here and adjust the effective date.</p>
          </Section>

          <Section title="Contact us">
            <p>
              Email <a className="text-emerald-700 underline" href="mailto:hello@carwithdriver.lk">hello@carwithdriver.lk</a>{' '}
              or call +94 76 302 1483 for privacy questions or requests.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
