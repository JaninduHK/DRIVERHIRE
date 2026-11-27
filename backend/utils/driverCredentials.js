/**
 * Extra qualifications an admin adds to a driver's profile after checking proof
 * (a certificate, an award page): degrees, years of experience, awards,
 * specialties, languages. Shown on the public profile, and the starred ones
 * ("highlights") with every offer in chat. Licences are not added here: the
 * SLTDA licence already has its own verified badge.
 */

export const CREDENTIAL_SECTIONS = ['qualifications', 'experience', 'awards', 'specialties', 'languages'];
export const MAX_CREDENTIALS = 30;
export const MAX_CREDENTIAL_HIGHLIGHTS = 4;
export const MAX_CREDENTIAL_LENGTH = 80;

/**
 * Checks what the admin sent. Returns { credentials } ready to save, or
 * { error } with a message the admin can act on.
 */
export const parseCredentials = (input) => {
  if (!Array.isArray(input)) return { error: 'Send the credentials as a list.' };
  if (input.length > MAX_CREDENTIALS) return { error: `A driver can have up to ${MAX_CREDENTIALS} credentials.` };

  const credentials = [];
  for (const item of input) {
    const section = String(item?.section || '');
    const text = String(item?.text || '').replace(/\s+/g, ' ').trim();
    if (!CREDENTIAL_SECTIONS.includes(section)) return { error: 'Choose a section for every credential.' };
    if (!text) continue; // an empty row the admin left behind
    if (text.length > MAX_CREDENTIAL_LENGTH) {
      return { error: `Keep each credential under ${MAX_CREDENTIAL_LENGTH} characters: "${text.slice(0, 30)}…"` };
    }
    credentials.push({ section, text, highlight: item?.highlight === true });
  }

  if (credentials.filter((item) => item.highlight).length > MAX_CREDENTIAL_HIGHLIGHTS) {
    return { error: `Star up to ${MAX_CREDENTIAL_HIGHLIGHTS} highlights for offers.` };
  }
  return { credentials };
};

/** The list as travellers see it, in section order (admin order within a section). */
export const publicCredentials = (credentials) =>
  (Array.isArray(credentials) ? credentials : [])
    .filter((item) => item && CREDENTIAL_SECTIONS.includes(item.section) && item.text)
    .map((item) => ({ section: item.section, text: item.text, highlight: Boolean(item.highlight) }))
    .sort((a, b) => CREDENTIAL_SECTIONS.indexOf(a.section) - CREDENTIAL_SECTIONS.indexOf(b.section));

export default parseCredentials;
