// All of this language's text, keyed by file name: common.json -> t('common.…').
const files = import.meta.glob('./*.json', { eager: true, import: 'default' });

export default Object.fromEntries(
  Object.entries(files).map(([path, messages]) => [path.slice(2, -5), messages])
);
