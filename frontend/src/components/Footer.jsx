import { Link } from 'react-router-dom';
import logoWhite from '../assets/Logo.png';

const columns = [
  {
    title: 'Travellers',
    links: [
      { label: 'Browse vehicles', to: '/vehicles' },
      { label: 'Featured drivers', to: '/drivers' },
      { label: 'My quote requests', to: '/dashboard?tab=requests' },
      { label: 'Chat messages', to: '/dashboard' },
    ],
  },
  {
    title: 'Drivers',
    links: [
      { label: 'Apply as a driver', to: '/register/driver' },
      { label: 'Driver guide', to: '/driver-guide' },
      { label: 'Driver terms', to: '/driver-terms' },
      { label: 'Driver portal', to: '/portal/driver' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact support', to: '/contact' },
      { label: 'Safety promise', to: '/about' },
      { label: 'Privacy policy', to: '/privacy-policy' },
      { label: 'Terms & conditions', to: '/terms' },
    ],
  },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink font-sans text-white">
      <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(38px,4vw,60px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(50%,200px),1fr))] gap-[clamp(22px,3vw,40px)]">
          {/* Brand column */}
          <div>
            <Link to="/" className="inline-flex items-center" aria-label="Car with Driver home">
              <img src={logoWhite} alt="car with driver.lk" className="h-12 w-auto" />
            </Link>
            <p className="mt-4 max-w-[270px] text-[13.5px] leading-[1.6] text-white/[0.62]">
              Vetted drivers and modern vehicles for travellers exploring Sri Lanka. Five-star journeys, island-wide.
            </p>
            <div className="mt-2.5 grid">
              <a href="tel:+94763021483" className="flex min-h-[44px] items-center text-[13.5px] font-bold text-white transition hover:text-[#7fd9a8]">
                +94 76 3021 483
              </a>
              <a href="mailto:hello@carwithdriver.lk" className="flex min-h-[44px] items-center text-[13.5px] font-bold text-[#7fd9a8] transition hover:text-white">
                hello@carwithdriver.lk
              </a>
            </div>
          </div>

          {/* Link groups */}
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-3.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#7fd9a8]">
                {column.title}
              </h2>
              <div className="grid">
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="flex min-h-[40px] items-center text-[13.5px] text-white/[0.78] transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-[clamp(28px,3vw,44px)] flex flex-wrap items-center justify-between gap-3.5 border-t border-white/[0.12] pt-[22px]">
          <p className="text-[12.5px] text-white/50">© {year} Car With Driver LK. All rights reserved.</p>
          <div className="flex gap-[18px]">
            <Link to="/about" className="text-[12.5px] text-white/60 transition hover:text-white">About</Link>
            <Link to="/contact" className="text-[12.5px] text-white/60 transition hover:text-white">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
