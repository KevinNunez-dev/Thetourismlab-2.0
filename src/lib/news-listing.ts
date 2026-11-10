import { assets } from './assets';
import type { Topic, WordPressPost } from './wordpress';

export const newsImages: Record<string, string> = {
  'cruise-lines': assets.ship,
  'ports-and-destinations': '/images/hero-port.webp',
  'travel-and-tourism': '/images/hero-travel.webp',
  sustainability: '/images/hero-sustainability.webp',
  associations: assets.hero,
};

export const newsIntroductions: Record<string, { heading: string; emphasis: string; description: string }> = {
  'cruise-lines': { heading: 'The latest from', emphasis: 'the cruise world', description: 'News from cruise lines, ports and industry associations — launches, expansions, new appointments and onboard experiences, curated by The Tourism Lab.' },
  'ports-and-destinations': { heading: 'News from', emphasis: 'ports and destinations', description: 'Cruise port partnerships, first calls, new air links and infrastructure projects shaping destinations around the world, curated by The Tourism Lab.' },
  'travel-and-tourism': { heading: 'News from', emphasis: 'travel and tourism', description: 'Events, air connectivity, destination performance and new appointments across the global travel industry, curated by The Tourism Lab.' },
  sustainability: { heading: 'Sustainability and', emphasis: 'community engagement', description: 'How ports, destinations and industry associations are working together on sustainability, overtourism and long-term innovation, curated by The Tourism Lab.' },
  associations: { heading: 'News from', emphasis: 'industry associations', description: 'Assemblies, awards, studies and leadership updates from MedCruise, CLIA, Seatrade Cruise, tourism boards and chambers of commerce, curated by The Tourism Lab.' },
};

export function newsPeriods(topic: Topic, posts: WordPressPost[]) {
  if (topic.slug === 'sustainability') return [];
  const monthFilter = topic.slug === 'cruise-lines';
  const periods = [...new Set(posts.map((post) => post.date.slice(0, monthFilter ? 7 : 4)))].sort().reverse();
  return periods.map((value) => ({
    value,
    label: monthFilter
      ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`))
      : value,
  }));
}
