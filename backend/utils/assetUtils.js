const ABSOLUTE_URL_REGEX = /^https?:\/\//i;
const DEFAULT_API_PREFIX = '/api';

const hasApiPrefixOverride = Object.prototype.hasOwnProperty.call(
  process.env,
  'API_PUBLIC_PREFIX'
);

const sanitizePrefix = (value) => {
  if (value === undefined || value === null) {
    return '';
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  return trimmed.startsWith('/')
    ? trimmed.replace(/\/+$/, '')
    : `/${trimmed.replace(/^\/+/, '')}`.replace(/\/+$/, '');
};

const getHeader = (req, name) => {
  if (!req) {
    return '';
  }
  if (typeof req.get === 'function') {
    return req.get(name) || '';
  }
  if (req.headers) {
    return req.headers[name.toLowerCase()] || '';
  }
  return '';
};

const getRequestOrigin = (req) => {
  const host = getHeader(req, 'x-forwarded-host') || getHeader(req, 'host');
  if (!host) {
    return '';
  }
  const protoHeader = getHeader(req, 'x-forwarded-proto');
  const protocol = protoHeader ? protoHeader.split(',')[0] : req?.protocol || 'http';
  const normalizedProtocol = protocol.replace(/:$/, '') || 'http';
  return `${normalizedProtocol}://${host}`.replace(/\/+$/, '');
};

const extractFirstPathSegment = (input = '') => {
  if (!input) {
    return '';
  }
  const pathname = input.split('?')[0];
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) {
    return '';
  }
  return `/${segments[0]}`;
};

const getApiPrefix = (req) => {
  if (hasApiPrefixOverride) {
    return sanitizePrefix(process.env.API_PUBLIC_PREFIX);
  }
  const candidate =
    extractFirstPathSegment(req?.baseUrl) || extractFirstPathSegment(req?.originalUrl);
  if (!candidate) {
    return DEFAULT_API_PREFIX;
  }
  return candidate;
};

const getExplicitAssetBase = () => {
  const raw = process.env.PUBLIC_ASSET_BASE_URL;
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/+$/, '');
};

const joinBaseAndPath = (base, pathSegment) => {
  const normalizedPath =
    typeof pathSegment === 'string' ? pathSegment.replace(/^\/+/, '') : '';
  if (!base) {
    return normalizedPath ? `/${normalizedPath}` : '/';
  }
  const normalizedBase = base.replace(/\/+$/, '');
  if (!normalizedPath) {
    return normalizedBase || '/';
  }
  return `${normalizedBase}/${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
};

const buildBaseUrl = (req) => {
  const explicitBase = getExplicitAssetBase();
  if (explicitBase) {
    return explicitBase;
  }
  const origin = getRequestOrigin(req);
  const prefix = getApiPrefix(req);
  if (!origin) {
    return prefix || '';
  }
  return `${origin}${prefix || ''}`;
};

export const buildAssetUrl = (value, req) => {
  if (!value) {
    return '';
  }
  if (ABSOLUTE_URL_REGEX.test(value)) {
    return value;
  }
  const normalizedPath = typeof value === 'string' ? value.trim() : '';
  if (!normalizedPath) {
    return '';
  }
  const relativePath = normalizedPath.startsWith('/')
    ? normalizedPath.slice(1)
    : normalizedPath;
  const base = buildBaseUrl(req);
  return joinBaseAndPath(base, relativePath);
};

export const mapAssetUrls = (values, req) => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => buildAssetUrl(entry, req))
    .filter((entry) => Boolean(entry));
};
