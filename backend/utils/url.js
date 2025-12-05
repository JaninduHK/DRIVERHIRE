const getBaseUrl = () => process.env.APP_BASE_URL || 'http://localhost:5173';

const buildAppUrl = (pathname = '/') => {
  const baseUrl = getBaseUrl();
  try {
    return new URL(pathname, baseUrl).toString();
  } catch {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${normalizedBase}${normalizedPath}`;
  }
};

export default buildAppUrl;
