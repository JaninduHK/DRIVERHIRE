// Checks the translation files before every build (npm run build runs this first).
//
//  1. Every language has every message English has, of the same kind.
//  2. Placeholders ({name}) and tags (<b>…</b>) match the English message, so a
//     translation can never drop a price, a name or a link.
//  3. Lists have the same number of items as in English.
//  4. Russian count messages have all the plural forms Russian needs.
//  5. Every literal t('…') key used in the code exists in English.
//  6. Blog translations line up with the English post.
//
// Exits with an error (failing the build) if anything is wrong.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const messagesDir = path.join(root, 'src/i18n/messages');
const LOCALES = ['de', 'fr', 'it', 'ru', 'ja'];
// The plural forms each language needs (Intl.PluralRules categories for counts).
const PLURAL_FORMS = {
  en: ['one', 'other'],
  de: ['one', 'other'],
  fr: ['one', 'other'],
  it: ['one', 'other'],
  ru: ['one', 'few', 'many', 'other'],
  ja: ['other'],
};
const PLURAL_KEYS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

const errors = [];
const fail = (message) => errors.push(message);

const readLocale = (locale) => {
  const dir = path.join(messagesDir, locale);
  const out = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      out[file.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch (error) {
      fail(`${locale}/${file}: invalid JSON (${error.message})`);
    }
  }
  return out;
};

const isPlural = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 &&
  Object.keys(value).every((key) => PLURAL_KEYS.has(key));

const tokens = (text) => {
  const vars = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const tags = [...text.matchAll(/<(\/?\w+)\s*\/?>/g)].map((m) => m[1]).sort();
  return JSON.stringify({ vars: [...new Set(vars)], tags });
};

const compareText = (where, en, other) => {
  if (tokens(en) !== tokens(other)) {
    fail(`${where}: placeholders/tags differ\n    en: ${en}\n    tr: ${other}`);
  }
  if (!other.trim() && en.trim()) fail(`${where}: empty translation`);
};

const compare = (where, en, other, locale) => {
  if (other === undefined) {
    fail(`${where}: missing`);
    return;
  }
  if (typeof en === 'string') {
    if (typeof other === 'string') return compareText(where, en, other);
    if (isPlural(other)) {
      for (const form of PLURAL_FORMS[locale]) {
        if (typeof other[form] !== 'string') fail(`${where}: plural form "${form}" missing`);
        else compareText(`${where}.${form}`, en, other[form]);
      }
      return;
    }
    return fail(`${where}: expected text`);
  }
  if (isPlural(en)) {
    const reference = en.other;
    if (typeof other === 'string') {
      if (PLURAL_FORMS[locale].length > 1) return fail(`${where}: needs plural forms ${PLURAL_FORMS[locale].join('/')}`);
      return compareText(where, reference, other);
    }
    if (!isPlural(other)) return fail(`${where}: expected plural forms`);
    for (const form of PLURAL_FORMS[locale]) {
      if (typeof other[form] !== 'string') fail(`${where}: plural form "${form}" missing`);
      else compareText(`${where}.${form}`, reference, other[form]);
    }
    return;
  }
  if (Array.isArray(en)) {
    if (!Array.isArray(other)) return fail(`${where}: expected a list`);
    if (other.length !== en.length) fail(`${where}: list has ${other.length} items, English has ${en.length}`);
    en.forEach((item, index) => compare(`${where}[${index}]`, item, other[index], locale));
    return;
  }
  if (en && typeof en === 'object') {
    if (!other || typeof other !== 'object' || Array.isArray(other)) return fail(`${where}: expected a group`);
    for (const key of Object.keys(en)) compare(`${where}.${key}`, en[key], other[key], locale);
    for (const key of Object.keys(other)) {
      if (!(key in en)) fail(`${where}.${key}: not in English (stale?)`);
    }
  }
};

const en = readLocale('en');
for (const locale of LOCALES) {
  const other = readLocale(locale);
  for (const ns of Object.keys(en)) compare(`${locale}:${ns}`, en[ns], other[ns], locale);
  for (const ns of Object.keys(other)) if (!(ns in en)) fail(`${locale}:${ns}: file not in English`);
}

// Literal keys used in code must exist in English.
const has = (key) => {
  let node = en;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return false;
    node = node[part];
  }
  return true;
};
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [full] : [];
  });
for (const file of [...walk(path.join(root, 'src')), ...walk(path.join(root, 'app'))]) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:\bt\(|\bk=)\s*['"]([a-zA-Z]+(?:\.[\w-]+)+)['"]/g)) {
    if (!has(match[1])) fail(`${path.relative(root, file)}: unknown key ${match[1]}`);
  }
}

// Blog post translations must line up with the English post. The English text
// is read from blogPosts.js itself (with its image/translation imports stubbed),
// keeping only the fields a translation replaces.
const SKIP_BLOG_KEYS = new Set([
  'slug', 'category', 'heroImage', 'publishedAt', 'updatedAt', 'photo', 'href', 'id', 'type',
  'licenseType', 'ctaHref', 'to', 'name', 'related',
]);
export const blogText = (value) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(blogText);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (SKIP_BLOG_KEYS.has(key) || typeof item === 'number' || typeof item === 'boolean') continue;
      const text = blogText(item);
      if (text !== undefined) out[key] = text;
    }
    return out;
  }
  return undefined;
};
{
  const os = await import('node:os');
  const source = fs
    .readFileSync(path.join(root, 'src/data/blogPosts.js'), 'utf8')
    .replace(/^import shaggyPhoto from .*$/m, "const shaggyPhoto = '';")
    .replace(/^import \{ BLOG_TRANSLATIONS \} from .*$/m, 'const BLOG_TRANSLATIONS = {};');
  const tmp = path.join(os.tmpdir(), `blog-en-${process.pid}.mjs`);
  fs.writeFileSync(tmp, source);
  const { BLOG_POSTS } = await import(tmp);
  fs.unlinkSync(tmp);
  for (const locale of LOCALES) {
    const file = path.join(root, 'src/data/blog', `${locale}.json`);
    const translated = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const post of BLOG_POSTS.filter((p) => p.body)) {
      if (!translated[post.slug]) {
        fail(`blog ${locale}: ${post.slug} not translated`);
        continue;
      }
      compare(`blog ${locale}:${post.slug}`, blogText(post), translated[post.slug], locale);
    }
  }
}

// messages/en/server.json translates messages the API sends back, by matching
// their exact English text. Each one must still exist somewhere in the code, or
// a reworded server message would silently stop being translated.
{
  const backendDir = path.join(root, '../backend');
  const sources = [path.join(root, 'src/services')];
  if (fs.existsSync(backendDir)) {
    for (const sub of ['controllers', 'middleware', 'routes', 'utils', 'server.js']) sources.push(path.join(backendDir, sub));
  }
  // Without the backend folder (frontend Docker build) only the services are searched.
  if (fs.existsSync(backendDir)) {
    const files = sources.flatMap((source) =>
      fs.statSync(source).isDirectory() ? walk(source) : [source]
    );
    const code = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    const visit = (node, where) => {
      for (const [key, value] of Object.entries(node)) {
        if (value && typeof value === 'object') visit(value, `${where}.${key}`);
        else if (typeof value === 'string') {
          // Check the fixed part before any {placeholder}, without a final full stop.
          const fixed = value.split('{')[0].replace(/\.$/, '');
          if (fixed && !code.includes(fixed)) fail(`server.json ${where}.${key}: "${value}" not found in the API code (reworded?)`);
        }
      }
    };
    visit(en.server || {}, 'server');
  }
}

// Traveller email texts in the backend, checked the same way. The folder is not
// in the frontend Docker build, so it is skipped there.
{
  const emailDir = path.join(root, '../backend/i18n/emails');
  if (fs.existsSync(emailDir)) {
    const read = (locale) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(emailDir, `${locale}.json`), 'utf8'));
      } catch (error) {
        fail(`emails ${locale}: missing or invalid JSON (${error.message})`);
        return {};
      }
    };
    const emailEn = read('en');
    for (const locale of LOCALES) compare(`emails ${locale}`, emailEn, read(locale), locale);

    const lookupKey = (key) => key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), emailEn);
    const service = fs.readFileSync(path.join(root, '../backend/services/emailService.js'), 'utf8');
    for (const match of service.matchAll(/\btr\(\s*['"]([a-zA-Z]+(?:\.[\w-]+)+)['"]/g)) {
      if (lookupKey(match[1]) === undefined) fail(`backend emailService.js: unknown email key ${match[1]}`);
    }
  }
}

if (errors.length) {
  console.error(`Translation check failed (${errors.length} problem${errors.length === 1 ? '' : 's'}):\n`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`Translations OK: ${LOCALES.length} languages match English.`);
