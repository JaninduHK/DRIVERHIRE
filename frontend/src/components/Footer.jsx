import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, PhoneCall, Youtube } from 'lucide-react';
import logoWhite from '../assets/Logo.png';

const touristLinks = [
  { label: 'Browse vehicles', to: '/vehicles' },
  { label: 'Featured drivers', to: '/drivers' },
  { label: 'My Quote Requests', to: '/briefs' },
  { label: 'Chat Messages', to: '/dashboard' },
];

const driverLinks = [
  { label: 'Apply as a driver', to: '/register/driver' },
  { label: 'Driver portal', to: '/portal/driver' },
  { label: 'Message center', to: '/portal/driver/messages' },
  { label: 'Update availability', to: '/portal/driver' },
];

const helpLinks = [
  { label: 'Contact support', to: '/contact' },
  { label: 'Safety promise', to: '/about' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms' },
];

const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com/driverhire', icon: Instagram },
  { label: 'Facebook', href: 'https://facebook.com/driverhire', icon: Facebook },
  { label: 'YouTube', href: 'https://youtube.com/@driverhire', icon: Youtube },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/driverhire', icon: Linkedin },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const renderNavLink = (item) => {
    const baseClass =
      'block text-sm text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500';

    if (item.href) {
      return (
        <a key={item.label} href={item.href} className={baseClass} target="_blank" rel="noreferrer">
          {item.label}
        </a>
      );
    }

    return (
      <Link key={item.label} to={item.to} className={baseClass}>
        {item.label}
      </Link>
    );
  };

  return (
    <footer className="mt-16 bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 pb-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <img src={logoWhite} alt="Car with Driver Sri Lanka" className="h-20 w-auto" />
            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <p className='mb-5'>We combine vetted drivers, modern vehicles with tourists to deliver five-star journeys.</p>
                <a
                  href="tel:+94770001234"
                  className="mt-1 flex items-center gap-2 font-semibold text-white transition hover:text-emerald-200"
                >
                  <PhoneCall className="h-4 w-4 text-emerald-300" />
                  +94 76 3021 483
                </a>
              </div>
              <div>
                
                <a
                  href="mailto:hello@carwithdriver.lk"
                  className="mt-1 flex items-center gap-2 font-semibold text-white transition hover:text-emerald-200"
                >
                  <Mail className="h-4 w-4 text-emerald-300" />
                  hello@carwithdriver.lk
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-emerald-400 hover:text-emerald-200"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {[{ title: 'Tourists', links: touristLinks }, { title: 'Drivers', links: driverLinks }, { title: 'Help', links: helpLinks }].map(
            ({ title, links }) => (
              <div key={title} className="space-y-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">{title}</p>
                <div className="space-y-2">{links.map((link) => renderNavLink(link))}</div>
              </div>
            ),
          )}
        </div>

        <div className="flex flex-col gap-4 pt-12 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Car with Driver LK Sri Lanka. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/about" className="transition hover:text-white">
              About
            </Link>
            <Link to="/contact" className="transition hover:text-white">
              Contact
            </Link>
        
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
