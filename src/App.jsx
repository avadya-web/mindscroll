import React, { useState, useEffect, useRef, useCallback } from "react";
import { Flame, Bookmark, BookmarkCheck, Sparkles, X, ArrowDown, Brain, ArrowUpRight, Share2, Download } from "lucide-react";

/* ================================================================== */
/*  MINDSCROLL — a live feed that makes you smarter every swipe        */
/*  Live sources: ZenQuotes · Hacker News · Wikipedia · uselessfacts   */
/*  Curated library is the offline fallback + the Mental Models layer. */
/* ================================================================== */

const THEMES = {
  philosophy: { name: "Philosophy", glyph: "✦", accent: "#E8B85B", bg: "radial-gradient(125% 100% at 50% 0%, #2a2350 0%, #161232 45%, #0b0a1c 100%)" },
  motivation: { name: "Fire", glyph: "⚡", accent: "#F4A24C", bg: "radial-gradient(125% 100% at 50% 0%, #4a1d22 0%, #2a1116 45%, #140709 100%)" },
  tech: { name: "AI & Tech", glyph: "◈", accent: "#3DD6F5", bg: "radial-gradient(125% 100% at 50% 0%, #0c3b40 0%, #07242a 45%, #03141a 100%)" },
  wonder: { name: "Wonder", glyph: "✺", accent: "#7FE8C3", bg: "radial-gradient(125% 100% at 50% 0%, #11315e 0%, #0a1f3f 45%, #050f23 100%)" },
  models: { name: "Mental Models", glyph: "◆", accent: "#C2F24C", bg: "radial-gradient(125% 100% at 50% 0%, #2b3033 0%, #181c1f 45%, #0c0e10 100%)" },
  word: { name: "Word of the Day", glyph: "Aa", accent: "#D4A8FF", bg: "radial-gradient(125% 100% at 50% 0%, #2d1a4a 0%, #1a0f30 45%, #0d0818 100%)" },
};
const CATS = ["all", "philosophy", "motivation", "tech", "wonder", "models", "word"];

/* Set to true ONLY after you add the /api/generate serverless function (see README).
   Left false for the no-backend deploy: the bottom button pulls fresh live cards instead. */
const USE_AI = false;

/* ---- Curated backbone: instant on load, works offline, owns Mental Models ---- */
const LIBRARY = [
  { cat: "philosophy", text: "We suffer more in imagination than in reality.", author: "Seneca", note: "Most of what we dread never happens. Name the fear precisely and it usually shrinks." },
  { cat: "philosophy", text: "The unexamined life is not worth living.", author: "Socrates", note: "Question your own defaults. The point isn't to feel bad — it's to choose on purpose." },
  { cat: "philosophy", text: "He who has a why to live can bear almost any how.", author: "Nietzsche", note: "Meaning is the load-bearing wall. Find your why and the hard parts become survivable." },
  { cat: "philosophy", text: "You don't control events — only your response to them.", author: "Stoic dichotomy of control", note: "Spend energy on your actions, not outcomes you can't move. Freedom, not resignation." },
  { cat: "philosophy", text: "Man is condemned to be free.", author: "Sartre", note: "No script is handed to you. That's terrifying — and it means you author the meaning." },
  { cat: "philosophy", text: "If you replace every plank of a ship, is it still the same ship?", author: "Ship of Theseus", note: "You replace nearly every cell over years. Identity may be a pattern, not a substance." },
  { cat: "philosophy", text: "One must imagine Sisyphus happy.", author: "Camus", note: "Even a task with no final 'point' can be owned fully. Choose the absurd and revolt." },
  { cat: "philosophy", text: "No one steps in the same river twice.", author: "Heraclitus", note: "Everything flows. Clinging to how things 'were' fights the basic nature of reality." },
  { cat: "philosophy", text: "Remember that you will die.", author: "Memento mori", note: "Not morbid — clarifying. A finite life makes today's choices actually matter." },
  { cat: "philosophy", text: "The obstacle is the path.", author: "Zen proverb", note: "The thing in your way often is the way. Resistance is information about where to go." },

  { cat: "motivation", text: "Whether you think you can or you can't — you're right.", author: "Henry Ford", note: "Belief sets the ceiling on effort. You won't fully try for what you've called impossible." },
  { cat: "motivation", text: "Fall seven times, stand up eight.", author: "Japanese proverb", note: "Resilience isn't avoiding the fall. It's making getting up automatic." },
  { cat: "motivation", text: "Get 1% better every day and you'll be 37× better in a year.", author: "The compounding principle", note: "Tiny gains feel invisible, then go vertical. Systems beat bursts of motivation." },
  { cat: "motivation", text: "Discipline is choosing what you want most over what you want now.", author: "—", note: "Every urge is a fork: easy now vs. the future you're building. Pick the future, repeatedly." },
  { cat: "motivation", text: "When your mind says you're done, you're only about 40% done.", author: "The 40% rule", note: "The first 'I can't' is rarely your true limit — it's your comfort limit. There's reserve past it." },
  { cat: "motivation", text: "Love your fate — including the hard parts.", author: "Amor fati", note: "Don't just accept what happens, use it. Treat every setback as raw material." },
  { cat: "motivation", text: "Hard choices, easy life. Easy choices, hard life.", author: "—", note: "The difficulty you pick now sets the difficulty you live with later. Front-load the hard." },
  { cat: "motivation", text: "You become what you repeatedly do.", author: "after Aristotle", note: "Excellence is a habit, not an act. Audit your daily defaults — they're shaping you." },

  { cat: "tech", text: "Modern AI runs on 'attention' — weighing every word against every other word.", author: "Transformers, 2017", note: "This one idea unlocked today's language models and long-range context." },
  { cat: "tech", text: "Image generators learn by removing noise — sculpting a picture out of static.", author: "Diffusion models", note: "Trained to reverse a 'destroy the image' process, then run backward from pure noise." },
  { cat: "tech", text: "An AI predicted the 3D shape of nearly every known protein.", author: "AlphaFold", note: "A 50-year biology problem largely cracked — accelerating drug discovery." },
  { cat: "tech", text: "Words can be turned into coordinates, so meaning becomes geometry.", author: "Embeddings", note: "Similar ideas sit near each other in space. How search 'understands' you." },
  { cat: "tech", text: "We can now edit DNA like text, cutting and pasting genes.", author: "CRISPR", note: "From sickle-cell cures to crops — a programmable tool for life itself." },
  { cat: "tech", text: "A quantum bit can be 0 and 1 at once — until you look.", author: "Superposition", note: "Lets quantum computers explore many possibilities in parallel for specific hard problems." },

  { cat: "wonder", text: "There are more possible chess games than atoms in the observable universe.", author: "Combinatorics", note: "A handful of simple rules can generate near-infinite worlds." },
  { cat: "wonder", text: "There are ~3 trillion trees on Earth — more than stars in the Milky Way.", author: "Scale", note: "Our intuitions about 'a lot' are terrible. Numbers help us see past them." },
  { cat: "wonder", text: "An octopus has three hearts and blue blood.", author: "Biology", note: "Intelligence evolved separately in cephalopods — 'alien' minds on our own planet." },
  { cat: "wonder", text: "Sunlight you feel now left the Sun about 8 minutes ago.", author: "Light speed", note: "You always see the past. Distant stars show you thousands of years back." },
  { cat: "wonder", text: "Your brain runs your whole mind on about 20 watts.", author: "Neuroscience", note: "Roughly a dim bulb outperforms data centers at general reasoning." },

  { cat: "models", text: "Solve problems backward: ask what would guarantee failure, then avoid it.", author: "Inversion", note: "Easier to dodge stupidity than chase brilliance. Subtract the dumb before adding the clever." },
  { cat: "models", text: "Break things to what must be true, then reason up from there.", author: "First principles", note: "Strip away 'how it's always done.' Reasoning from bedrock out-thinks the crowd." },
  { cat: "models", text: "Among competing explanations, prefer the one needing fewest assumptions.", author: "Occam's razor", note: "Not always right — but the best first bet. Simplicity is a feature." },
  { cat: "models", text: "Never attribute to malice what's explained by carelessness.", author: "Hanlon's razor", note: "Most 'attacks' are people being busy and human. Assuming malice burns bridges." },
  { cat: "models", text: "Every yes is a no to everything else you could've done with that time.", author: "Opportunity cost", note: "The real price of anything is the best alternative you gave up." },
  { cat: "models", text: "Ask: 'And then what?' Think past the first consequence.", author: "Second-order thinking", note: "Easy wins often create harder problems downstream. Track the ripple, not the splash." },
  { cat: "models", text: "The map is not the territory.", author: "Korzybski", note: "Your model of reality isn't reality. Stay loyal to the terrain, not your diagram." },
  { cat: "models", text: "Know the edge of what you actually understand — and stay inside it.", author: "Circle of competence", note: "You don't need to be right about everything, just which questions are yours." },
  { cat: "models", text: "We notice evidence that confirms us and skip what doesn't.", author: "Confirmation bias", note: "Hunt for what would prove you wrong. Cheapest upgrade to your judgment." },
  { cat: "models", text: "Improve by removing, not just adding.", author: "Via negativa", note: "Often the upgrade is subtraction — a bad habit, a wrong friend. Less, better." },
];

/* ====================== LIVE SOURCES ====================== */
let zenPool = [];
let wikiPool = [];
let allRotate = 0;

const hashText = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "h" + (h >>> 0).toString(36); };
const clean = (s) => (s || "").replace(/[`´]/g, "'").replace(/\s+/g, " ").trim();
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }

const BAD = /\b(kill(ed|s|ing)?|murder|massacre|dead|death|die[ds]?|suicide|rape|genocide|nazi|war crime|atrocit)\b/i;

async function fetchZen() {
  try {
    const r = await fetch("https://zenquotes.io/api/quotes");
    const d = await r.json();
    if (Array.isArray(d)) {
      const next = d.filter((x) => x.q && x.a && x.a.toLowerCase() !== "zenquotes.io")
        .map((x) => ({ q: clean(x.q), a: clean(x.a) }));
      if (next.length) zenPool = shuffle(next);
    }
  } catch { /* fall back handled upstream */ }
}
async function srcQuotes(cat, n) {
  if (zenPool.length < n) await fetchZen();
  const out = [];
  while (out.length < n && zenPool.length) {
    const q = zenPool.shift();
    out.push({ cat, text: q.q, author: q.a, note: "", source: "ZenQuotes", url: "https://zenquotes.io", live: true });
  }
  return out;
}

const HN_Q = ["artificial intelligence", "machine learning", "large language model", "robotics", "neural network", "open source AI", "semiconductor", "quantum computing", "breakthrough"];
async function srcTech(n) {
  try {
    const q = HN_Q[(Math.random() * HN_Q.length) | 0];
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=points%3E80&hitsPerPage=25`;
    const d = await (await fetch(url)).json();
    const hits = (d.hits || []).filter((h) => h.title && !BAD.test(h.title));
    return shuffle(hits).slice(0, n).map((h) => ({
      cat: "tech", text: clean(h.title), author: "Hacker News",
      note: `${h.points} points${h.num_comments ? ` · ${h.num_comments} comments` : ""} · trending in tech right now`,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: h.url ? "the source" : "Hacker News", live: true,
    }));
  } catch { return []; }
}

async function fetchWiki() {
  try {
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const dd = String(new Date().getDate()).padStart(2, "0");
    const d = await (await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`)).json();
    const items = [...(d.selected || []), ...(d.events || [])]
      .filter((x) => x.text && !BAD.test(x.text))
      .map((x) => ({ text: clean(x.text), year: x.year, url: x.pages?.[0]?.content_urls?.desktop?.page }));
    if (items.length) wikiPool = shuffle(items);
  } catch { /* upstream fallback */ }
}
async function srcFact() {
  try {
    const d = await (await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random")).json();
    const t = clean(d.text);
    if (t && t.length > 12 && !BAD.test(t)) return { cat: "wonder", text: t, author: "Did you know?", note: "", source: "uselessfacts", live: true };
  } catch { /* ignore */ }
  return null;
}
async function srcWonder(n) {
  if (wikiPool.length < n) await fetchWiki();
  const out = [];
  const wikiCount = Math.max(1, n - 1);
  while (out.length < wikiCount && wikiPool.length) {
    const w = wikiPool.shift();
    out.push({ cat: "wonder", text: w.text, author: w.year ? `On this day · ${w.year}` : "On this day", note: "A moment in history worth knowing.", url: w.url, source: "Wikipedia", live: true });
  }
  const f = await srcFact();
  if (f) out.push(f);
  return out;
}

/* ====================== WORD OF THE DAY ====================== */
const WORD_LIST = [
  "sonder","ephemeral","serendipity","solipsism","ineffable","liminal","palimpsest",
  "hiraeth","saudade","petrichor","vellichor","anagnorisis","catharsis","eudaimonia",
  "kairos","apophenia","diegesis","lacuna","meliorism","numinous","oscitancy","quiddity",
  "redolent","sillage","syzygy","tintinnabulation","umbra","verisimilitude","weltanschauung",
  "xenial","yugen","zenith","abscond","blandish","crepuscular","diaphanous","enervate",
  "furtive","garrulous","halcyon","insouciant","jejune","kinetic","loquacious","mendacious",
  "nebulous","obstreperous","pernicious","querulous","recalcitrant","sycophant","tenacious",
  "umbrage","vociferous","wistful","zealous","acrimony","bellicose","contrite","dissonance",
  "equanimity","felicity","gratuitous","hubris","incandescent","juxtapose","labyrinthine",
];

async function srcWord() {
  const dayIdx = Math.floor(Date.now() / 86400000) % WORD_LIST.length;
  const word = WORD_LIST[dayIdx];
  try {
    const d = await (await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)).json();
    const entry = Array.isArray(d) && d[0];
    if (!entry) throw new Error("no entry");
    const phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || "";
    const meaning = entry.meanings?.[0];
    const pos = meaning?.partOfSpeech || "";
    const def = meaning?.definitions?.[0];
    const definition = def?.definition || "";
    const example = def?.example || "";
    const note = [pos ? `(${pos})` : "", example ? `"${example}"` : ""].filter(Boolean).join(" · ");
    return [{
      cat: "word", text: word, author: phonetic || "—",
      note: definition + (note ? `\n${note}` : ""),
      source: "Free Dictionary", url: `https://en.wiktionary.org/wiki/${word}`, live: true,
    }];
  } catch {
    return [{ cat: "word", text: word, author: "—", note: "Look this one up — it's worth knowing.", live: true }];
  }
}

async function getLiveRaw(cat, n) {
  if (cat === "philosophy" || cat === "motivation") return srcQuotes(cat, n);
  if (cat === "tech") return srcTech(n);
  if (cat === "wonder") return srcWonder(n);
  if (cat === "models") return []; // curated only — no good free API for this
  if (cat === "word") return srcWord();
  const order = [() => srcQuotes("philosophy", n), () => srcTech(n), () => srcWonder(n), () => srcQuotes("motivation", n)];
  return order[(allRotate++) % order.length]();
}

/* ====================== STYLES ====================== */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
.ms-root *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.ms-root{font-family:'Hanken Grotesk',system-ui,sans-serif;position:relative;width:100%;max-width:520px;height:100dvh;margin:0 auto;overflow:hidden;background:#05060a;color:#F4ECE3;}
.ms-feed{height:100%;overflow-y:scroll;scroll-snap-type:y mandatory;scrollbar-width:none;scroll-behavior:smooth;overscroll-behavior:none;}
.ms-feed::-webkit-scrollbar{display:none;}
.ms-card{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;display:flex;flex-direction:column;justify-content:center;padding:calc(100px + env(safe-area-inset-top)) 30px calc(120px + env(safe-area-inset-bottom));overflow:hidden;}
.ms-grain{position:absolute;inset:0;opacity:.05;pointer-events:none;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
.ms-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 35%,transparent 40%,rgba(0,0,0,.45) 100%);}
.ms-tag{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.28em;text-transform:uppercase;display:flex;align-items:center;gap:9px;margin-bottom:24px;opacity:0;transform:translateY(14px);}
.ms-glyph{font-size:15px;}
.ms-quote{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(25px,6.6vw,39px);line-height:1.18;letter-spacing:-.01em;margin:0;opacity:0;transform:translateY(22px);}
.ms-quote.sm{font-size:clamp(20px,5.2vw,30px);line-height:1.28;}
.ms-author{font-size:15px;font-weight:600;margin-top:20px;opacity:0;transform:translateY(18px);}
.ms-note{font-size:15px;line-height:1.5;color:rgba(244,236,227,.62);margin-top:16px;max-width:34ch;opacity:0;transform:translateY(18px);}
.ms-src{display:inline-flex;align-items:center;gap:5px;margin-top:18px;font-size:13px;font-weight:700;text-decoration:none;opacity:0;transform:translateY(14px);width:fit-content;}
.ms-card.in .ms-tag{animation:rise .55s .05s cubic-bezier(.2,.7,.2,1) forwards;}
.ms-card.in .ms-quote{animation:rise .7s .12s cubic-bezier(.2,.7,.2,1) forwards;}
.ms-card.in .ms-author{animation:rise .6s .26s cubic-bezier(.2,.7,.2,1) forwards;}
.ms-card.in .ms-note{animation:rise .6s .33s cubic-bezier(.2,.7,.2,1) forwards;}
.ms-card.in .ms-src{animation:rise .6s .4s cubic-bezier(.2,.7,.2,1) forwards;}
@keyframes rise{to{opacity:1;transform:translateY(0);}}
.ms-actions{position:absolute;right:24px;bottom:calc(118px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;}
.ms-save,.ms-share{width:54px;height:54px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .18s,background .2s;color:#F4ECE3;}
.ms-save:active,.ms-share:active{transform:scale(.86);}
.ms-toast{position:absolute;bottom:calc(110px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%) translateY(10px);background:rgba(255,255,255,.12);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 18px;font-size:13px;font-weight:700;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s,transform .2s;z-index:30;}
.ms-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.ms-install{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:520px;z-index:60;padding:16px 20px calc(16px + env(safe-area-inset-bottom));background:rgba(10,10,20,.96);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:14px;animation:slideUp .3s cubic-bezier(.2,.7,.2,1);}
.ms-install-icon{width:48px;height:48px;border-radius:12px;background:#05060a;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ms-install-text{flex:1;}
.ms-install-title{font-weight:700;font-size:15px;}
.ms-install-sub{font-size:13px;color:rgba(244,236,227,.55);margin-top:2px;}
.ms-install-btn{flex-shrink:0;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:700;cursor:pointer;border:none;color:#05060a;}
.ms-install-x{flex-shrink:0;opacity:.5;cursor:pointer;padding:4px;}
.ms-top{position:absolute;top:0;left:0;right:0;z-index:20;padding:calc(16px + env(safe-area-inset-top)) 18px 30px;background:linear-gradient(180deg,rgba(0,0,0,.55),transparent);display:flex;align-items:center;justify-content:space-between;pointer-events:none;}
.ms-top>*{pointer-events:auto;}
.ms-brand{display:flex;align-items:center;gap:8px;font-family:'Fraunces',serif;font-weight:600;font-size:19px;letter-spacing:-.02em;}
.ms-pills{display:flex;gap:8px;align-items:center;}
.ms-pill{display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);font-size:13px;font-weight:700;cursor:pointer;backdrop-filter:blur(8px);}
.ms-pill:active{transform:scale(.94);}
.ms-live{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(60,214,245,.14);border:1px solid rgba(60,214,245,.3);font-size:11px;font-weight:800;letter-spacing:.08em;color:#9eecfb;}
.ms-dot{width:7px;height:7px;border-radius:50%;background:#3DD6F5;box-shadow:0 0 8px #3DD6F5;animation:blink 1.4s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.25;}}
.ms-chips{position:absolute;top:calc(58px + env(safe-area-inset-top));left:0;right:0;z-index:19;display:flex;gap:8px;padding:6px 18px 12px;overflow-x:auto;scrollbar-width:none;}
.ms-chips::-webkit-scrollbar{display:none;}
.ms-chip{flex:0 0 auto;padding:7px 15px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:rgba(244,236,227,.7);cursor:pointer;white-space:nowrap;transition:.18s;backdrop-filter:blur(6px);}
.ms-chip.act{color:#05060a;font-weight:700;}
.ms-hint{position:absolute;left:0;right:0;bottom:calc(46px + env(safe-area-inset-bottom));z-index:18;text-align:center;font-size:13px;letter-spacing:.04em;color:rgba(244,236,227,.55);display:flex;flex-direction:column;align-items:center;gap:6px;animation:float 1.8s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0);opacity:.55;}50%{transform:translateY(-7px);opacity:.95;}}
.ms-gen{position:absolute;left:18px;bottom:calc(42px + env(safe-area-inset-bottom));z-index:18;display:flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);backdrop-filter:blur(10px);color:#F4ECE3;font-size:14px;font-weight:700;cursor:pointer;overflow:hidden;}
.ms-gen:active{transform:scale(.95);}
.ms-gen .shine{position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.22) 50%,transparent 70%);transform:translateX(-100%);}
.ms-gen.busy .shine{animation:shine 1.1s linear infinite;}
@keyframes shine{to{transform:translateX(100%);}}
.ms-overlay{position:absolute;inset:0;z-index:40;background:rgba(4,5,9,.92);backdrop-filter:blur(14px);display:flex;flex-direction:column;animation:fade .25s ease;}
@keyframes fade{from{opacity:0;}to{opacity:1;}}
.ms-ov-head{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:calc(22px + env(safe-area-inset-top)) 22px 14px;background:rgba(4,5,9,.6);backdrop-filter:blur(10px);}
.ms-ov-title{font-family:'Fraunces',serif;font-size:24px;font-weight:600;}
.ms-ov-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 18px calc(6px + env(safe-area-inset-bottom));scrollbar-width:none;}
.ms-ov-list::-webkit-scrollbar{display:none;}
.ms-saved-card{position:relative;border-radius:18px;padding:18px 48px 16px 18px;margin-bottom:12px;border:1px solid rgba(255,255,255,.08);overflow:hidden;}
.ms-saved-q{font-family:'Fraunces',serif;font-size:18px;line-height:1.25;font-weight:500;}
.ms-saved-a{font-size:13px;font-weight:600;margin-top:8px;opacity:.8;}
.ms-saved-note{font-size:13px;line-height:1.5;color:rgba(244,236,227,.55);margin-top:10px;}
.ms-saved-link{display:inline-flex;align-items:center;gap:4px;margin-top:10px;font-size:12px;font-weight:700;text-decoration:none;opacity:.75;}
.ms-saved-x{position:absolute;top:12px;right:12px;cursor:pointer;opacity:.6;padding:6px;margin:-6px;}
.ms-saved-card{cursor:pointer;transition:transform .15s,box-shadow .15s;}
.ms-saved-card:active{transform:scale(.97);}
.ms-empty{text-align:center;color:rgba(244,236,227,.5);font-size:15px;margin-top:60px;line-height:1.6;}
.ms-close{cursor:pointer;opacity:.8;padding:8px;margin:-8px;}
.ms-attr{flex-shrink:0;text-align:center;font-size:11.5px;color:rgba(244,236,227,.42);padding:12px 20px calc(20px + env(safe-area-inset-bottom));line-height:1.55;}
.ms-detail{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;animation:slideUp .28s cubic-bezier(.2,.7,.2,1);}
@keyframes slideUp{from{transform:translateY(60px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.ms-detail-head{flex-shrink:0;display:flex;align-items:center;gap:10px;padding:calc(18px + env(safe-area-inset-top)) 18px 14px;background:rgba(0,0,0,.4);}
.ms-detail-back{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;opacity:.8;cursor:pointer;padding:6px;margin:-6px;}
.ms-detail-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;justify-content:center;padding:40px 30px calc(60px + env(safe-area-inset-bottom));}
.ms-detail-tag{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.28em;text-transform:uppercase;display:flex;align-items:center;gap:9px;margin-bottom:24px;opacity:.8;}
.ms-detail-q{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(24px,6vw,36px);line-height:1.2;letter-spacing:-.01em;margin:0;}
.ms-detail-author{font-size:15px;font-weight:600;margin-top:20px;}
.ms-detail-note{font-size:16px;line-height:1.6;color:rgba(244,236,227,.7);margin-top:20px;}
.ms-detail-link{display:inline-flex;align-items:center;gap:5px;margin-top:24px;font-size:14px;font-weight:700;text-decoration:none;}
`;

const todayKey = () => new Date().toISOString().slice(0, 10);
const uid = (() => { let n = 0; return () => `c${Date.now().toString(36)}_${n++}`; })();
// Real-app storage: persists streak, saved cards, and the seen-set in the browser.
const store = {
  async get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  async set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

export default function MindScroll() {
  const [activeCat, setActiveCat] = useState("all");
  const [feed, setFeed] = useState([]);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [expandedSaved, setExpandedSaved] = useState(null);
  const [streak, setStreak] = useState(null);
  const [today, setToday] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [liveOn, setLiveOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const toastTimer = useRef(null);

  const feedRef = useRef(null);
  const cardRefs = useRef([]);
  const counted = useRef(new Set());       // session: which cards counted toward daily total
  const seenRef = useRef(new Set());        // persistent: hashes of live nuggets already shown
  const seenCurated = useRef(new Set());   // daily: indices of curated cards already served
  const busyRef = useRef(false);            // prevent overlapping live fetches
  const seenTimer = useRef(null);
  const ioRef = useRef(null);

  const build = useCallback((cat) => {
    const base = cat === "all" ? LIBRARY : LIBRARY.filter((c) => c.cat === cat);
    // Use card text as the stable key — category-relative indices collide across views
    const unseen = base.filter((c) => !seenCurated.current.has(c.text));
    const pool = unseen.length > 0 ? unseen : (() => { seenCurated.current.clear(); return base; })();
    const picked = shuffle(pool);
    picked.forEach((c) => seenCurated.current.add(c.text));
    return picked.map((c) => ({ ...c, id: uid() }));
  }, []);

  const persistSeen = () => {
    clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => {
      const tk = todayKey();
      store.set("seenHashes", { d: tk, hashes: [...seenRef.current].slice(-600) });
      store.set("seenCurated", { d: tk, keys: [...seenCurated.current] });
    }, 700);
  };

  /* pull a fresh batch: live first, deduped; pad/fallback with curated so we never dead-end */
  const appendMore = useCallback(async (cat, prepend = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const raw = await getLiveRaw(cat, 6);
      const fresh = [];
      for (const c of raw) {
        const h = hashText(c.text);
        if (seenRef.current.has(h)) continue;
        seenRef.current.add(h);
        fresh.push({ ...c, id: uid() });
      }
      if (fresh.length) { setLiveOn(true); }
      const curated = build(cat).slice(0, 5);
      persistSeen();
      const batch = fresh.length >= 3 ? fresh : [...fresh, ...curated];
      // On first load, put live cards at the top so they're seen immediately
      setFeed((f) => prepend ? [...batch, ...f] : [...f, ...batch]);
    } catch {
      setFeed((f) => [...f, ...build(cat)]);
    } finally {
      busyRef.current = false;
    }
  }, [build]);

  /* boot: storage + streak + seen-set */
  useEffect(() => {
    (async () => {
      setSaved(await store.get("saved", []));
      // Reset live-seen hashes daily so fresh API content flows each new day
      const seenStored = await store.get("seenHashes", { d: "", hashes: [] });
      const tk0 = todayKey();
      seenRef.current = (seenStored.d === tk0 && Array.isArray(seenStored.hashes))
        ? new Set(seenStored.hashes) : new Set();
      // Load daily curated-seen set; reset each new day so content feels fresh
      const sc = await store.get("seenCurated", { d: "", keys: [] });
      seenCurated.current = sc.d === tk0 ? new Set(sc.keys) : new Set();
      const last = await store.get("lastVisit", null);
      const st = await store.get("streak", 0);
      const tk = todayKey();
      let ns = 1;
      if (last) {
        const diff = Math.round((new Date(tk) - new Date(last)) / 86400000);
        ns = diff === 0 ? (st || 1) : diff === 1 ? (st || 0) + 1 : 1;
      }
      setStreak(ns);
      await store.set("streak", ns);
      await store.set("lastVisit", tk);
      const tc = await store.get("todayCount", { d: tk, n: 0 });
      setToday(tc.d === tk ? tc.n : 0);
      setReady(true);
    })();
  }, []);

  /* (re)build feed on boot + category change */
  useEffect(() => {
    if (!ready) return;
    counted.current = new Set();
    cardRefs.current = [];
    busyRef.current = false;
    setLiveOn(false);
    setActive(0);
    if (feedRef.current) feedRef.current.scrollTo({ top: 0 });
    // Show 2 curated cards instantly so there's something to see immediately,
    // then fetch live — live cards are prepended so they appear first on scroll
    setFeed(build(activeCat).slice(0, 2));
    appendMore(activeCat, true); // prepend live so fresh content shows first
  }, [activeCat, ready, build, appendMore]);

  /* track active card, reveal animation, daily counter */
  useEffect(() => {
    if (ioRef.current) ioRef.current.disconnect();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const idx = Number(e.target.dataset.idx);
        if (e.isIntersecting && e.intersectionRatio > 0.55) {
          e.target.classList.add("in");
          setActive(idx);
          const id = feed[idx]?.id;
          if (id && !counted.current.has(id)) {
            counted.current.add(id);
            setToday((t) => { const nv = t + 1; store.set("todayCount", { d: todayKey(), n: nv }); return nv; });
          }
        }
      });
    }, { root: feedRef.current, threshold: [0.55] });
    cardRefs.current.forEach((el) => el && io.observe(el));
    ioRef.current = io;
    return () => io.disconnect();
  }, [feed]);

  /* infinite: fetch more as you near the end */
  useEffect(() => {
    if (ready && feed.length > 0 && active >= feed.length - 3) appendMore(activeCat, false);
  }, [active, feed.length, activeCat, ready, appendMore]);

  const toggleSave = (card) => {
    setSaved((prev) => {
      const exists = prev.find((c) => c.text === card.text);
      const next = exists ? prev.filter((c) => c.text !== card.text)
        : [{ text: card.text, author: card.author, cat: card.cat, url: card.url, source: card.source, note: card.note }, ...prev];
      store.set("saved", next);
      return next;
    });
  };
  const isSaved = (card) => saved.some((c) => c.text === card.text);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  const shareCard = async (card) => {
    const text = `"${card.text}"${card.author && card.author !== "—" ? `\n— ${card.author}` : ""}`;
    const shareData = { title: "MindScroll", text, url: card.url || "https://mindscroll.app" };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${text}\n\nvia MindScroll`);
        showToast("Copied to clipboard ✓");
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        await navigator.clipboard.writeText(`${text}\n\nvia MindScroll`).catch(() => {});
        showToast("Copied to clipboard ✓");
      }
    }
  };

  /* Capture the install prompt so we can show it at the right moment */
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstall(false);
    if (outcome === "accepted") showToast("MindScroll installed 🎉");
  };

  /* Mobile back-button / swipe-back support for the saved overlay */
  const openSaved = () => {
    history.pushState({ savedOverlay: true }, "");
    setShowSaved(true);
  };
  const closeSaved = () => {
    // replaceState instead of back() — avoids browser scroll restoration clobbering snap-feed
    if (history.state?.savedOverlay) history.replaceState(null, "");
    setShowSaved(false);
    setExpandedSaved(null);
  };
  useEffect(() => {
    // Hardware back button / swipe-back: popstate fires, close the overlay
    const onPop = () => { if (showSaved) setShowSaved(false); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [showSaved]);

  /* No-backend "More" button: pull a fresh live batch and jump to it. */
  const manualMore = async () => {
    if (busyRef.current) return;
    const at = feed.length;
    await appendMore(activeCat, false);
    setTimeout(() => cardRefs.current[at]?.scrollIntoView({ behavior: "smooth" }), 160);
  };

  /* Claude-generated cards — requires a /api/generate serverless proxy (see README).
     Never call the Anthropic API directly from the browser — it exposes your key. */
  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    const catKey = activeCat === "all" ? "philosophy" : activeCat;
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cat: catKey }),
      });
      if (!res.ok) throw new Error(`/api/generate returned ${res.status}`);
      const arr = await res.json();
      const cards = arr.filter((c) => c.text).map((c) => ({ cat: catKey, text: clean(c.text), author: c.author || "—", note: c.note || "", id: uid(), source: "Claude", live: true }));
      if (cards.length) {
        const at = active + 1;
        setFeed((f) => [...f.slice(0, at), ...cards, ...f.slice(at)]);
        setTimeout(() => cardRefs.current[at]?.scrollIntoView({ behavior: "smooth" }), 120);
      }
    } catch (err) {
      console.warn("AI generate unavailable — falling back to live feed.", err);
    } finally { setGenerating(false); }
  };

  const curTheme = THEMES[feed[active]?.cat] || THEMES.philosophy;

  return (
    <div className="ms-root">
      <style>{STYLE}</style>

      <div className="ms-top">
        <div className="ms-brand"><Brain size={20} strokeWidth={2.2} /> MindScroll</div>
        <div className="ms-pills">
          {liveOn && <div className="ms-live"><span className="ms-dot" /> LIVE</div>}
          {streak !== null && <div className="ms-pill" title="Day streak"><Flame size={15} color="#F4A24C" /> {streak}</div>}
          <div className="ms-pill" onClick={openSaved} title="Saved"><Bookmark size={15} /> {saved.length}</div>
        </div>
      </div>

      <div className="ms-chips">
        {CATS.map((c) => {
          const t = THEMES[c]; const on = activeCat === c;
          const accent = c === "all" ? "#F4ECE3" : t.accent;
          return (
            <div key={c} className={`ms-chip ${on ? "act" : ""}`} onClick={() => setActiveCat(c)}
              style={on ? { background: accent, borderColor: accent } : {}}>
              {c !== "all" && <span style={{ marginRight: 5 }}>{t.glyph}</span>}{c === "all" ? "All" : t.name}
            </div>
          );
        })}
      </div>

      <div className="ms-feed" ref={feedRef}>
        {feed.map((card, i) => {
          const t = THEMES[card.cat] || THEMES.philosophy;
          const savedNow = isSaved(card);
          const long = card.text.length > 95;
          return (
            <div key={card.id} data-idx={i} ref={(el) => (cardRefs.current[i] = el)} className="ms-card" style={{ background: t.bg }}>
              <div className="ms-grain" /><div className="ms-vig" />
              <div className="ms-tag" style={{ color: t.accent }}>
                <span className="ms-glyph">{t.glyph}</span>{t.name}{card.live ? " · live" : ""}
              </div>
              <h1 className={`ms-quote ${long ? "sm" : ""}`}>{card.text}</h1>
              {card.author && card.author !== "—" && <div className="ms-author" style={{ color: t.accent }}>— {card.author}</div>}
              {card.note && <p className="ms-note">{card.note}</p>}
              {(card.url || card.source) && (
                <a className="ms-src" style={{ color: t.accent }} href={card.url || "https://zenquotes.io"} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}>
                  {card.url && card.source === "the source" ? "Read the source" : card.url ? `Read on ${card.source}` : `via ${card.source}`} <ArrowUpRight size={14} />
                </a>
              )}
              <div className="ms-actions">
                <div className={`ms-save ${savedNow ? "on" : ""}`} onClick={() => toggleSave(card)}
                  style={savedNow ? { background: t.accent, borderColor: t.accent, color: "#05060a" } : {}}>
                  {savedNow ? <BookmarkCheck size={22} /> : <Bookmark size={22} />}
                </div>
                <div className="ms-share" onClick={() => shareCard(card)}>
                  <Share2 size={20} />
                </div>
              </div>
              <div className={`ms-toast ${toast ? "show" : ""}`}>{toast}</div>
              {i === 0 && <div className="ms-hint"><ArrowDown size={18} /> swipe up to get smarter</div>}
            </div>
          );
        })}
      </div>

      <div className={`ms-gen ${generating ? "busy" : ""}`} onClick={USE_AI ? generate : manualMore} style={{ borderColor: curTheme.accent + "55" }}>
        <span className="shine" /><Sparkles size={16} color={curTheme.accent} />
        <span className="lbl">{USE_AI ? (generating ? "Thinking…" : "Fresh ideas") : "More ideas"}</span>
      </div>

      {showInstall && (
        <div className="ms-install">
          <div className="ms-install-icon"><Brain size={26} color="#D4A8FF" /></div>
          <div className="ms-install-text">
            <div className="ms-install-title">Add MindScroll</div>
            <div className="ms-install-sub">Install for the full experience</div>
          </div>
          <div className="ms-install-btn" style={{ background: curTheme.accent }} onClick={triggerInstall}>
            <Download size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />Install
          </div>
          <X className="ms-install-x" size={20} onClick={() => setShowInstall(false)} />
        </div>
      )}

      {showSaved && (
        <div className="ms-overlay">
          <div className="ms-ov-head">
            <div className="ms-ov-title">Saved for later</div>
            <X className="ms-close" size={26} onClick={closeSaved} />
          </div>
          <div className="ms-ov-list">
            {saved.length === 0 ? (
              <div className="ms-empty">Nothing saved yet.<br />Tap the bookmark on any card<br />to keep ideas worth revisiting.</div>
            ) : saved.map((c) => {
              const t = THEMES[c.cat] || THEMES.philosophy;
              return (
                <div className="ms-saved-card" key={c.text} style={{ background: t.bg }} onClick={() => setExpandedSaved(c)}>
                  <X className="ms-saved-x" size={18} onClick={(e) => { e.stopPropagation(); toggleSave(c); }} />
                  <div className="ms-saved-q">{c.text}</div>
                  {c.author && c.author !== "—" && <div className="ms-saved-a" style={{ color: t.accent }}>— {c.author}</div>}
                  {c.note && <div className="ms-saved-note">{c.note}</div>}
                </div>
              );
            })}
          </div>
          <div className="ms-attr">Live content via ZenQuotes, Hacker News, Wikipedia &amp; uselessfacts.<br />Nuggets you've seen won't repeat.</div>

          {expandedSaved && (() => {
            const t = THEMES[expandedSaved.cat] || THEMES.philosophy;
            return (
              <div className="ms-detail" style={{ background: t.bg }}>
                <div className="ms-detail-head">
                  <div className="ms-detail-back" onClick={() => setExpandedSaved(null)}>
                    <ArrowUpRight size={16} style={{ transform: "rotate(225deg)" }} /> Back
                  </div>
                </div>
                <div className="ms-detail-body">
                  <div className="ms-detail-tag" style={{ color: t.accent }}>
                    <span>{t.glyph}</span>{t.name}
                  </div>
                  <h2 className="ms-detail-q">{expandedSaved.text}</h2>
                  {expandedSaved.author && expandedSaved.author !== "—" && (
                    <div className="ms-detail-author" style={{ color: t.accent }}>— {expandedSaved.author}</div>
                  )}
                  {expandedSaved.note && <p className="ms-detail-note">{expandedSaved.note}</p>}
                  {expandedSaved.url && (
                    <a className="ms-detail-link" style={{ color: t.accent }} href={expandedSaved.url} target="_blank" rel="noreferrer noopener">
                      Read more <ArrowUpRight size={15} />
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
