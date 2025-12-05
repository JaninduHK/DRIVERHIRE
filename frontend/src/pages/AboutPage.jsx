import React, { useState } from 'react';
import {
  Globe2,
  ShieldCheck,
  MessageCircle,
  MapPin,
  Users,
  CheckCircle2,
  Quote,
} from 'lucide-react';

const AboutPage = () => {
  const trustPillars = [
    {
      icon: Globe2,
      title: 'Independent Sri Lankan expertise',
      description:
        'Car with Driver LK is built by a small local team that understands the island and how travelers like to explore it.',
    },
    {
      icon: ShieldCheck,
      title: 'Transparent matching process',
      description:
        'We connect you directly with verified, professional drivers and keep information, reviews, and pricing crystal clear.',
    },
    {
      icon: MessageCircle,
      title: 'Platform-first support',
      description:
        'Bookings, conversations, and documents stay in one secure system so everyone sees the same trusted information.',
    },
  ];

  const faqs = [
    {
      question: 'What is Car with Driver LK?',
      answer:
        'Car with Driver LK is an independent online platform created to make traveling around Sri Lanka easier, safer, and more transparent for visitors. Our website helps you find trusted drivers, compare options, read real reviews, and book with confidence in one place.',
    },
    {
      question: 'What is the aim of the platform?',
      answer:
        'Our role is to connect travelers directly with reliable, professional drivers across Sri Lanka. We do not employ drivers, own vehicles, or operate as a tour company. Instead, we provide clear systems that keep every interaction fair for travelers and drivers from the first message to the end of the trip.',
    },
    {
      question: 'Do you manage other websites?',
      answer:
        'Car with Driver LK focuses entirely on this community of travelers and drivers. We may collaborate with selected tourism partners when it benefits customers, but every booking and message is handled securely through our platform.',
    },
    {
      question: 'Where is the company based?',
      answer:
        'The platform is run by a small team with deep local knowledge of Sri Lanka plus years of tourism and customer service experience. Our independent position helps us stay neutral, transparent, and fair in how we support both travelers and drivers.',
    },
    {
      question: 'How does Car with Driver LK make money?',
      answer:
        'The platform is supported by drivers who may pay small service fees or commissions to advertise and receive bookings. Keeping overheads low means drivers can stay competitive, travelers avoid extra booking fees, and you only pay the agreed amount directly to your driver.',
    },
    {
      question: 'Will you help if something goes wrong?',
      answer:
        'Yes. Our support team is available if plans change or an issue cannot be solved with your driver. We encourage travelers to speak with the driver first, and if extra help is needed we can assist or mediate with the booking details provided. Please review our Terms and Conditions for the full process.',
    },
  ];

  const bookingBenefits = [
    'You receive the vehicle type described in the offer or a direct equivalent.',
    'You meet the driver you booked, or a clearly agreed alternative if required.',
    'You will not be asked to pay more than the total price agreed in advance.',
    'You can request changes or cancellations through the platform based on the driver policy.',
    'You never pay booking fees to Car with Driver LK. Payment goes directly to the driver.',
    'You can leave an honest review for your driver after the trip.',
    'You get written booking confirmation so everyone knows what has been arranged.',
    'We do our best to assist if problems appear mid-trip.',
    'You benefit from a growing network of verified drivers and traveler feedback.',
  ];

  const testimonials = [
    {
      name: 'Hannah and Luis',
      location: 'Spain',
      feedback:
        '"Every quote matched the final price, and the driver we met in Colombo was exactly who we booked. The confirmation pack gave us confidence to explore the south coast stress-free."',
    },
    {
      name: 'Ravi and Aanya',
      location: 'India',
      feedback:
        '"Our itinerary changed twice and the platform handled the updates instantly. Having a support team on standby made the Kandy to Ella leg relaxed and enjoyable."',
    },
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <main className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6 lg:px-8">
        {/* 🚗 HERO SECTION (Simplified) */}
        {/* Removed the 'grid' structure and the 'Live Trip Snapshot' card for a cleaner look */}
        <section className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            About Car with Driver LK
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Transparent driver bookings for every journey across Sri Lanka.
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            We help travelers meet verified Sri Lankan drivers, compare real options, and agree on
            clear prices and routes before they land. Our mission is simple: safe, fair, and
            stress-free travel for both travelers and local drivers.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <Users className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-slate-700">
                Built for independent travelers & families.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-slate-700">
                Coverage across key routes and destinations.
              </p>
            </div>
          </div>
        </section>
        
        {/* --- */}

        {/* 🤝 TRUST PILLARS */}
        <section className="space-y-8 pt-10"> {/* Added padding for better separation */}
          <header className="space-y-2 text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              What makes us different
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              The three pillars of trust
            </h2>
            <p className="text-base text-slate-600">
              Everything we build is designed to protect both sides of the journey: independent
              travelers and professional local drivers.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3"> {/* Increased gap for visual space */}
            {trustPillars.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 hover:shadow-xl transition-shadow" // Enhanced shadow/hover
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"> {/* Bigger icon badge */}
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* --- */}
        
        {/* ⚖️ WHY + SUPPORT */}
        <section className="grid gap-8 lg:grid-cols-2">
          <article className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200"> {/* Increased padding */}
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Why we built the platform
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Clarity for travelers and drivers
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              By staying independent and focusing on transparent information, we make sure both
              sides of every trip are respected. Drivers showcase their expertise and set their own
              pricing, while travelers enjoy reliable transport, fair agreements, and dedicated
              support when something needs attention.
            </p>
          </article>

          <article className="flex flex-col justify-between rounded-3xl bg-emerald-600 p-8 text-white ring-1 ring-emerald-700 shadow-md"> {/* Changed background to primary color for emphasis */}
            <div>
              <h2 className="text-2xl font-bold">
                When you need help, we’re here
              </h2>
              <p className="mt-3 text-base leading-relaxed opacity-95">
                Most questions or issues can be solved directly with your driver. But if you need
                extra support, our team can help clarify agreements, document problems, and mediate
                where possible so you can keep traveling with confidence.
              </p>
            </div>
            <p className="mt-6 text-sm opacity-80 border-t border-emerald-400 pt-4">
              For complete procedures and response times, please review our Terms and Conditions.
            </p>
          </article>
        </section>

        {/* --- */}

        {/* ❓ FAQ WITH TOGGLES */}
        <section className="space-y-8 pt-10">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Frequently asked
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              How Car with Driver LK operates
            </h2>
            <p className="max-w-3xl text-base text-slate-600">
              A quick overview of how the platform works, how we stay independent, and what you can
              expect when you book through us.
            </p>
          </header>

          <div className="space-y-4 max-w-6xl"> {/* Constrained max-width for better readability */}
            {faqs.map(({ question, answer }, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={question}
                  className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                  >
                    <span className="text-base font-semibold text-slate-900">{question}</span>
                    <span
                      className={
                        'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition ' +
                        (isOpen
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                      }
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-6 pb-5 pt-3">
                      <p className="text-base leading-relaxed text-slate-700">{answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        
        {/* --- */}

        {/* ✅ BOOKING PROMISES */}
        <section className="space-y-8 pt-10 mt-10">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Why travelers book here
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">Our booking promises</h2>
            <p className="max-w-3xl text-base text-slate-600">
              These are the standards we work towards on every trip so you can reserve the right
              driver and vehicle with complete peace of mind.
            </p>
          </header>

          <ul className="grid gap-5 md:grid-cols-2"> {/* Increased gap */}
            {bookingBenefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-4 rounded-2xl bg-white p-5 text-base text-slate-700 shadow-sm ring-1 ring-slate-200" // Increased padding/text size
              >
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className='font-medium'>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* --- */}

        {/* ⭐ TESTIMONIALS */}
        <section className="space-y-8 pt-10 mt-10">
          <header className="space-y-2 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Testimonials
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              What travelers say about Car with Driver LK
            </h2>
            <p className="mx-auto max-w-3xl text-base text-slate-600">
              A selection of recent experiences from guests who used our platform to plan their
              journeys around Sri Lanka.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map(({ name, location, feedback }) => (
              <article
                key={name}
                className="flex h-full flex-col justify-between rounded-3xl bg-white p-8 text-left shadow-lg ring-1 ring-slate-200" // Increased padding/shadow
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Quote className="h-5 w-5" />
                </div>
                <p className="text-base italic leading-relaxed text-slate-800">{feedback}</p>
                <p className="mt-6 text-base font-bold text-slate-900 border-t border-slate-100 pt-4">
                  {name}{' '}
                  <span className="font-normal text-slate-600">• {location}</span>
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AboutPage;