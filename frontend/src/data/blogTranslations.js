// Translated text for blog posts, one JSON file per language in ./blog/.
// Each file maps a post slug to the fields that differ from the English post in
// blogPosts.js (same shape; arrays line up item by item).
import de from './blog/de.json';
import fr from './blog/fr.json';
import it from './blog/it.json';
import ru from './blog/ru.json';
import ja from './blog/ja.json';

export const BLOG_TRANSLATIONS = { de, fr, it, ru, ja };
