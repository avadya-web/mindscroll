/**
 * POST /api/feed
 * Body: { categories: string[], recentlySeen: string[], count?: number }
 * Returns: { cards: Array<{text, author, note, category, sourceUrl, sourceName}> }
 *
 * Architecture:
 *  1. Fetch raw headlines/snippets server-side (HN, RSS, optionally Reddit)
 *  2. Ask Claude to turn them into 8 concise insight cards, avoiding recentlySeen
 *  3. Return cards — client never touches Reddit or Anthropic directly
 */

const Anthropic = require("@anthropic-ai/sdk");

/* ═══════════════════════════════════════════════════════════
   RSS SOURCES — one or two per category, all reputable feeds
   ═══════════════════════════════════════════════════════════ */
const RSS_BY_CAT = {
  philosophy: [
    "https://feeds.feedburner.com/philosophybites",
    "https://api.rss2json.com/v1/api.json?rss_url=https://philosophynow.org/rss",
  ],
  motivation: [
    "https://jamesclear.com/feed",
    "https://markmanson.net/rss",
  ],
  tech: [
    "https://hnrss.org/frontpage?count=30",
    "https://feeds.arstechnica.com/arstechnica/technology-lab",
    "https://www.technologyreview.com/feed/",
  ],
  wonder: [
    "https://www.sciencedaily.com/rss/top/science.xml",
    "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
  ],
  models: [
    "https://fs.blog/feed/",
    "https://www.lesswrong.com/feed.xml",
  ],
  word: [],
};

/* ═══════════════════════════════════════════════
   HN ALGOLIA — tech + general curiosity queries
   ═══════════════════════════════════════════════ */
const HN_QUERIES = {
  tech: ["artificial intelligence", "machine learning", "open source", "startup", "developer tools", "quantum computing"],
  wonder: ["science discovery", "breakthrough research", "space exploration", "biology", "physics"],
  philosophy: ["philosophy", "stoicism", "ethics", "consciousness"],
  motivation: ["productivity", "habits", "leadership", "creativity"],
  models: ["mental models", "decision making", "cognitive bias", "systems thinking"],
};

/* ═══════════════════════════════════════════
   SIMPLE RSS PARSER — no external lib needed
   ═══════════════════════════════════════════ */
function parseRSS(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const block of itemBlocks.slice(0, 15)) {
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1];
    const desc = (block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1];
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1];
    const t = (title || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "").trim();
    const d = (desc || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "").slice(0, 300).trim();
    if (t && t.length > 10) items.push({ title: t, snippet: d, url: (link || "").trim() });
  }
  return items;
}

async function fetchRSS(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MindScroll/1.0 (RSS reader; contact@mindscroll.app)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml);
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════ */
async function fetchHN(category) {
  try {
    const queries = HN_QUERIES[category] || HN_QUERIES.tech;
    const q = queries[Math.floor(Math.random() * queries.length)];
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=points%3E60&hitsPerPage=20`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return (d.hits || []).slice(0, 10).map((h) => ({
      title: h.title,
      snippet: `${h.points} upvotes on Hacker News`,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════
   REDDIT — optional, OAuth2 client-creds
   ═══════════════════════════════════════ */
const REDDIT_SUBS = {
  philosophy: ["Showerthoughts", "philosophy"],
  motivation: ["GetMotivated", "quotes"],
  tech: ["technology", "programming", "MachineLearning"],
  wonder: ["todayilearned", "science", "interestingasfuck"],
  models: ["slatestarcodex", "LessWrong"],
};

async function fetchRedditToken() {
  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET } = process.env;
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) return null;
  try {
    const creds = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "MindScroll/1.0 (by /u/mindscroll_app)",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.access_token || null;
  } catch {
    return null;
  }
}

async function fetchReddit(category, token) {
  if (!token) return [];
  const subs = REDDIT_SUBS[category] || REDDIT_SUBS.wonder;
  const sub = subs[Math.floor(Math.random() * subs.length)];
  try {
    const res = await fetch(`https://oauth.reddit.com/r/${sub}/hot?limit=25&raw_json=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "MindScroll/1.0 (by /u/mindscroll_app)",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const d = await res.json();
    return (d?.data?.children || [])
      .map((c) => c.data)
      .filter((p) => p && !p.over_18 && p.score > 100 && p.title)
      .slice(0, 12)
      .map((p) => ({
        title: p.title.replace(/^TIL\s*(that\s*)?:?\s*/i, ""),
        snippet: `${p.score.toLocaleString()} upvotes · r/${p.subreddit}`,
        url: `https://reddit.com${p.permalink}`,
      }));
  } catch {
    return [];
  }
}

/* ════════════════════════════════════════════════════════
   MAIN HANDLER
   ════════════════════════════════════════════════════════ */
module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { categories = ["all"], recentlySeen = [], count = 8 } = req.body || {};

  // Resolve which categories to fetch for
  const cats = (categories.includes("all") || categories.length === 0)
    ? ["philosophy", "motivation", "tech", "wonder"]
    : categories.filter((c) => c !== "word" && c !== "models");

  // ── 1. Fetch raw material in parallel ──
  const redditToken = await fetchRedditToken();

  const rawBySource = await Promise.allSettled(
    cats.flatMap((cat) => [
      ...((RSS_BY_CAT[cat] || []).slice(0, 2).map((url) => fetchRSS(url).then((items) => ({ cat, items })))),
      fetchHN(cat).then((items) => ({ cat, items })),
      fetchReddit(cat, redditToken).then((items) => ({ cat, items })),
    ])
  );

  // Collect all raw items
  const rawItems = [];
  for (const r of rawBySource) {
    if (r.status !== "fulfilled" || !r.value?.items?.length) continue;
    const { cat, items } = r.value;
    for (const item of items.slice(0, 8)) {
      rawItems.push({ cat, title: item.title, snippet: item.snippet || "", url: item.url || "" });
    }
  }

  if (!rawItems.length) {
    return res.status(200).json({ cards: [] });
  }

  // Shuffle and cap to avoid sending too many tokens
  const shuffled = rawItems.sort(() => Math.random() - 0.5).slice(0, 40);

  // ── 2. Ask Claude to craft insight cards ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key — return raw items as basic cards
    const fallback = shuffled.slice(0, count).map((r) => ({
      text: r.title,
      author: new URL(r.url || "https://example.com").hostname.replace("www.", ""),
      note: r.snippet,
      category: r.cat,
      sourceUrl: r.url,
      sourceName: "Live",
    }));
    return res.status(200).json({ cards: fallback });
  }

  const client = new Anthropic({ apiKey });

  const recentBlock = recentlySeen.length
    ? `\n\nDo NOT produce cards similar to these recently shown items:\n${recentlySeen.slice(-40).map((s) => `- ${s}`).join("\n")}`
    : "";

  const prompt = `You are the content engine for MindScroll — an app that replaces doomscrolling with bite-size wisdom. Your job is to turn the raw news/content below into exactly ${count} cards that are:
- Genuinely insightful and surprising (not generic motivational filler)
- Concise: "text" is max 20 words — a punchy, standalone insight or fact
- "note" is 1-2 sentences explaining WHY it matters or what's surprising about it
- "author" is the thinker, source name, or concept (e.g. "Naval Ravikant", "r/todayilearned", "Quantum Physics")
- "category" must be one of: philosophy, motivation, tech, wonder, models
- "sourceUrl" — use the url from the raw item that inspired the card
- "sourceName" — short name of the source (e.g. "Hacker News", "Science Daily")

Raw content to draw inspiration from:
${shuffled.map((r, i) => `[${i + 1}] (${r.cat}) ${r.title}${r.snippet ? ` — ${r.snippet}` : ""}${r.url ? ` | ${r.url}` : ""}`).join("\n")}${recentBlock}

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"text":"...","author":"...","note":"...","category":"...","sourceUrl":"...","sourceName":"..."}]`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
    const cards = JSON.parse(json);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ cards: cards.slice(0, count) });
  } catch (err) {
    console.error("Claude error:", err.message);
    // Fallback: return raw items shaped as cards
    const fallback = shuffled.slice(0, count).map((r) => ({
      text: r.title,
      author: new URL(r.url || "https://example.com").hostname.replace("www.", ""),
      note: r.snippet,
      category: r.cat,
      sourceUrl: r.url,
      sourceName: "Live",
    }));
    return res.status(200).json({ cards: fallback });
  }
};
