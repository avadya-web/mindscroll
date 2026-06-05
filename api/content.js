/**
 * /api/content?cat=wonder&sub=todayilearned&sort=hot&t=day&limit=40
 *
 * Serverless proxy — fetches Reddit + other sources server-side so the
 * browser never hits Reddit directly (avoids CORS / 403 blocks).
 * Responses are cached for 10 minutes via Vercel's edge cache.
 */

const BAD = /\b(kill(ed|s|ing)?|murder|massacre|dead|death|die[ds]?|suicide|rape|genocide|nazi|war crime|atrocit)\b/i;

const REDDIT_HEADERS = {
  'User-Agent': 'MindScroll/1.0 (web app; contact mindscroll.app)',
  'Accept': 'application/json',
};

const SOURCE_MAP = {
  philosophy: [
    { sub: 'Showerthoughts', sort: 'hot',      time: '',    label: 'Shower Thought',  cat: 'philosophy' },
    { sub: 'Showerthoughts', sort: 'top',      time: 'week',label: 'Shower Thought',  cat: 'philosophy' },
    { sub: 'philosophy',     sort: 'hot',      time: '',    label: 'r/philosophy',    cat: 'philosophy' },
    { sub: 'philosophy',     sort: 'top',      time: 'month',label: 'r/philosophy',   cat: 'philosophy' },
  ],
  motivation: [
    { sub: 'GetMotivated',   sort: 'hot',      time: '',    label: 'r/GetMotivated',  cat: 'motivation' },
    { sub: 'GetMotivated',   sort: 'top',      time: 'week',label: 'r/GetMotivated',  cat: 'motivation' },
    { sub: 'quotes',         sort: 'top',      time: 'week',label: 'r/quotes',        cat: 'motivation' },
    { sub: 'quotes',         sort: 'top',      time: 'month',label: 'r/quotes',       cat: 'motivation' },
  ],
  tech: [
    { sub: 'technology',     sort: 'hot',      time: '',    label: 'r/technology',    cat: 'tech' },
    { sub: 'programming',    sort: 'hot',      time: '',    label: 'r/programming',   cat: 'tech' },
    { sub: 'MachineLearning',sort: 'hot',      time: '',    label: 'r/ML',            cat: 'tech' },
    { sub: 'artificial',     sort: 'top',      time: 'week',label: 'r/artificial',    cat: 'tech' },
  ],
  wonder: [
    { sub: 'todayilearned',  sort: 'hot',      time: '',    label: 'Today I Learned', cat: 'wonder', til: true },
    { sub: 'todayilearned',  sort: 'top',      time: 'week',label: 'Today I Learned', cat: 'wonder', til: true },
    { sub: 'science',        sort: 'hot',      time: '',    label: 'r/science',       cat: 'wonder' },
    { sub: 'interestingasfuck', sort: 'hot',   time: '',    label: 'Interesting',     cat: 'wonder' },
    { sub: 'todayilearned',  sort: 'top',      time: 'month',label: 'Today I Learned',cat: 'wonder', til: true },
  ],
  models: [],
};

function clean(s) {
  return (s || '').replace(/[`´]/g, "'").replace(/\s+/g, ' ').trim();
}

async function fetchReddit(sub, sort, time, limit = 40) {
  const t = time ? `&t=${time}` : '';
  const url = `https://www.reddit.com/r/${sub}/${sort}.json?limit=${limit}${t}&raw_json=1`;
  const res = await fetch(url, { headers: REDDIT_HEADERS });
  if (!res.ok) throw new Error(`Reddit ${sub} returned ${res.status}`);
  const d = await res.json();
  return (d?.data?.children || [])
    .map(c => c.data)
    .filter(p => p && !p.over_18 && p.score > 30 && p.title && !BAD.test(p.title) && p.title.length > 20);
}

function toCard(post, label, cat, isTil) {
  let text = clean(post.title);
  if (isTil) text = text.replace(/^TIL\s*(that\s*)?:?\s*/i, '');
  if (text.length < 15) return null;
  return {
    cat,
    text,
    author: label,
    note: `${post.score.toLocaleString()} upvotes · r/${post.subreddit}`,
    url: `https://reddit.com${post.permalink}`,
    source: 'Reddit',
    live: true,
  };
}

async function fetchQuotable(tag) {
  const res = await fetch(`https://api.quotable.io/quotes/random?limit=30&tags=${tag}&minLength=30&maxLength=200`);
  if (!res.ok) return [];
  const d = await res.json();
  return (Array.isArray(d) ? d : []).filter(x => x.content && x.author).map(x => ({
    cat: tag.includes('philosophy') ? 'philosophy' : 'motivation',
    text: clean(x.content), author: clean(x.author),
    note: (x.tags || []).join(' · '),
    source: 'Quotable', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(x.author)}`, live: true,
  }));
}

async function fetchHN() {
  const queries = ['artificial intelligence', 'machine learning', 'open source', 'startup', 'developer'];
  const q = queries[Math.floor(Math.random() * queries.length)];
  const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=points%3E80&hitsPerPage=30`);
  if (!res.ok) return [];
  const d = await res.json();
  return (d.hits || []).filter(h => h.title && !BAD.test(h.title)).map(h => ({
    cat: 'tech', text: clean(h.title), author: 'Hacker News',
    note: `${h.points} points · trending on HN`,
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    source: 'Hacker News', live: true,
  }));
}

async function fetchWikiRandom(count = 8) {
  const results = await Promise.allSettled(
    Array.from({ length: count }, () =>
      fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary').then(r => r.json())
    )
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(p => p.extract && p.extract.length > 80 && !BAD.test(p.extract) && p.type === 'standard')
    .map(p => ({
      cat: 'wonder', text: p.title, author: 'Wikipedia',
      note: clean(p.extract.split('. ').slice(0, 2).join('. ').slice(0, 240)),
      url: p.content_urls?.desktop?.page, source: 'Wikipedia', live: true,
    }));
}

async function fetchNASA() {
  try {
    const res = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.title || !d.explanation || BAD.test(d.explanation)) return null;
    return {
      cat: 'wonder', text: d.title, author: `NASA · ${d.date}`,
      note: clean(d.explanation.split('. ').slice(0, 2).join('. ').slice(0, 240) + '.'),
      url: d.hdurl || d.url, source: 'NASA APOD', live: true,
    };
  } catch { return null; }
}

function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function handler(req, res) {
  const cat = req.query?.cat || 'all';

  // Cache at the edge for 10 minutes
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    let cards = [];

    if (cat === 'philosophy' || cat === 'motivation') {
      const sources = SOURCE_MAP[cat];
      // Fetch 2 Reddit sources + Quotable in parallel
      const tag = cat === 'philosophy' ? 'philosophy|wisdom|stoicism' : 'inspirational|motivational|success';
      const [r1, r2, q] = await Promise.allSettled([
        fetchReddit(sources[0].sub, sources[0].sort, sources[0].time),
        fetchReddit(sources[1].sub, sources[1].sort, sources[1].time),
        fetchQuotable(tag),
      ]);
      const redditCards = [
        ...(r1.status === 'fulfilled' ? r1.value : []).map(p => toCard(p, sources[0].label, cat, false)),
        ...(r2.status === 'fulfilled' ? r2.value : []).map(p => toCard(p, sources[1].label, cat, false)),
      ].filter(Boolean);
      cards = shuffle([...redditCards, ...(q.status === 'fulfilled' ? q.value : [])]);

    } else if (cat === 'tech') {
      const [r1, r2, hn] = await Promise.allSettled([
        fetchReddit('technology', 'hot', ''),
        fetchReddit('programming', 'hot', ''),
        fetchHN(),
      ]);
      const redditCards = [
        ...(r1.status === 'fulfilled' ? r1.value : []).map(p => toCard(p, 'r/technology', 'tech', false)),
        ...(r2.status === 'fulfilled' ? r2.value : []).map(p => toCard(p, 'r/programming', 'tech', false)),
      ].filter(Boolean);
      cards = shuffle([...redditCards, ...(hn.status === 'fulfilled' ? hn.value : [])]);

    } else if (cat === 'wonder') {
      const [r1, r2, wiki, nasa] = await Promise.allSettled([
        fetchReddit('todayilearned', 'hot', ''),
        fetchReddit('todayilearned', 'top', 'week'),
        fetchWikiRandom(10),
        fetchNASA(),
      ]);
      const tilCards = [
        ...(r1.status === 'fulfilled' ? r1.value : []),
        ...(r2.status === 'fulfilled' ? r2.value : []),
      ].map(p => toCard(p, 'Today I Learned', 'wonder', true)).filter(Boolean);
      const wikiCards = r => r.status === 'fulfilled' ? r.value : [];
      cards = shuffle([
        ...tilCards,
        ...wikiCards(wiki),
        ...(nasa.status === 'fulfilled' && nasa.value ? [nasa.value] : []),
      ]);

    } else if (cat === 'all') {
      // Mix from all categories
      const [phil, motiv, tech, wonder] = await Promise.allSettled([
        fetchReddit('Showerthoughts', 'hot', '').then(p => p.map(x => toCard(x, 'Shower Thought', 'philosophy', false)).filter(Boolean)),
        fetchReddit('GetMotivated', 'hot', '').then(p => p.map(x => toCard(x, 'r/GetMotivated', 'motivation', false)).filter(Boolean)),
        fetchHN(),
        fetchReddit('todayilearned', 'hot', '').then(p => p.map(x => toCard(x, 'Today I Learned', 'wonder', true)).filter(Boolean)),
      ]);
      const get = r => r.status === 'fulfilled' ? r.value : [];
      // Interleave evenly
      const sources = [get(phil), get(motiv), get(tech), get(wonder)];
      const max = Math.max(...sources.map(s => s.length));
      for (let i = 0; i < max; i++) sources.forEach(s => { if (s[i]) cards.push(s[i]); });
    }

    res.status(200).json(cards.slice(0, 60));
  } catch (err) {
    console.error('content API error:', err);
    res.status(500).json([]);
  }
}
