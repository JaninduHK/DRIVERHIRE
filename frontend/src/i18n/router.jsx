// Drop-in replacement for 'react-router-dom' on translated pages: Link, NavLink,
// Navigate and useNavigate keep the visitor in their language, so
// <Link to="/vehicles"> on a German page goes to /de/vehicles. Paths to
// English-only pages (dashboard, sign-in) are left as they are.
import { forwardRef, useCallback } from 'react';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
  useNavigate as useRouterNavigate,
} from 'react-router-dom';
import { useI18n } from './I18nProvider.jsx';

export * from 'react-router-dom';

const localizeTo = (to, lp) => {
  if (typeof to === 'string') return lp(to);
  if (to && typeof to === 'object' && typeof to.pathname === 'string') {
    return { ...to, pathname: lp(to.pathname) };
  }
  return to;
};

export const Link = forwardRef(function Link({ to, ...props }, ref) {
  const { lp } = useI18n();
  return <RouterLink ref={ref} to={localizeTo(to, lp)} {...props} />;
});

export const NavLink = forwardRef(function NavLink({ to, end, ...props }, ref) {
  const { lp } = useI18n();
  const target = localizeTo(to, lp);
  // A localized home link (/de) must only be "active" on the home page itself.
  return <RouterNavLink ref={ref} to={target} end={end || to === '/'} {...props} />;
});

export const Navigate = ({ to, ...props }) => {
  const { lp } = useI18n();
  return <RouterNavigate to={localizeTo(to, lp)} {...props} />;
};

export const useNavigate = () => {
  const navigate = useRouterNavigate();
  const { lp } = useI18n();
  return useCallback(
    (to, options) => (typeof to === 'number' ? navigate(to) : navigate(localizeTo(to, lp), options)),
    [navigate, lp]
  );
};
