export interface WordPressPost {
  id: number;
  slug: string;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
  _embedded?: {
    author?: { name: string }[];
    'wp:featuredmedia'?: { source_url?: string; alt_text?: string }[];
  };
}

export interface Topic {
  slug: string;
  name: string;
  description: string;
  categories: number[];
}

export const topics: Topic[] = [
  { slug: 'cruise-lines', name: 'Cruise Lines', description: 'New ships, itineraries, appointments and milestones from across the cruise industry.', categories: [69] },
  { slug: 'ports-and-destinations', name: 'Ports and Destinations', description: 'The places, ports and people connecting the world of travel.', categories: [99] },
  { slug: 'travel-and-tourism', name: 'Travel and Tourism', description: 'Ideas, experiences and developments shaping travel around the world.', categories: [71] },
  { slug: 'sustainability', name: 'Sustainability', description: 'A closer look at responsible tourism and the communities behind it.', categories: [98] },
  { slug: 'associations', name: 'Associations', description: 'The organizations, partnerships and conversations moving tourism forward.', categories: [100] },
];

export const editorialCategory = 92;
const origin = (import.meta.env.WORDPRESS_URL || 'https://thetourismlab.com').replace(/\/$/, '');
let postsPromise: Promise<WordPressPost[]> | undefined;

async function fetchAllPosts(): Promise<WordPressPost[]> {
  const posts: WordPressPost[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = new URL('/wp-json/wp/v2/posts', origin);
    url.search = new URLSearchParams({ per_page: '100', page: String(page), _embed: '1' }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`WordPress request failed (${response.status}): ${url}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error(`Unexpected WordPress response: ${url}`);
    const pages = Number(response.headers.get('x-wp-totalpages'));
    if (!Number.isInteger(pages) || pages < 1) throw new Error(`Missing or invalid WordPress pagination header: ${url}`);
    totalPages = pages;
    posts.push(...data as WordPressPost[]);
    page++;
  } while (page <= totalPages);
  return posts;
}

export function getPosts(): Promise<WordPressPost[]> {
  return postsPromise ??= fetchAllPosts();
}

export function inCategories(posts: WordPressPost[], categories: number[]): WordPressPost[] {
  return posts.filter((post) => post.categories.some((id) => categories.includes(id)));
}

export function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘').replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/&#038;|&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code))).replace(/\s+/g, ' ').trim();
}

export function imageFor(post: WordPressPost) {
  return post._embedded?.['wp:featuredmedia']?.[0];
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}
