import { Award, Compass, GraduationCap, Languages, Trophy } from 'lucide-react';

// Same sections, order and limits as backend/utils/driverCredentials.js.
export const CREDENTIAL_SECTIONS = [
  { key: 'qualifications', label: 'Qualifications', icon: GraduationCap, example: 'BA, University of Colombo' },
  { key: 'experience', label: 'Experience', icon: Award, example: '35 years guiding guests from 138 countries' },
  { key: 'awards', label: 'Awards', icon: Trophy, example: 'Sri Lanka Tourism Award 2024' },
  { key: 'specialties', label: 'Specialties', icon: Compass, example: 'Wildlife & nature' },
  { key: 'languages', label: 'Languages', icon: Languages, example: 'German (basic)' },
];

export const MAX_CREDENTIALS = 30;
export const MAX_CREDENTIAL_HIGHLIGHTS = 4;
export const MAX_CREDENTIAL_LENGTH = 80;

export const credentialSection = (key) => CREDENTIAL_SECTIONS.find((section) => section.key === key) || CREDENTIAL_SECTIONS[0];
