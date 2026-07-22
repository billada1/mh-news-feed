import { writeFile } from 'node:fs/promises';

// Fetches Australian psychology / mental-health headlines from Google News (server-side,
// so there is NO CORS problem and NO rate limit) and writes a FULLY STATIC index.html with
// the headlines baked straight into the HTML. Because there is no client-side fetch and no
// "loading" state, the page renders news instantly — so SharePoint's embed preview (which
// screenshots the page) always captures real headlines, never a "Loading…" placeholder.

const QUERY = 'australian mental health OR psychology OR wellbeing OR psychologist';
const FEED  = 'https://news.google.com/rss/search?q=' + encodeURIComponent(QUERY) + '&hl=en-AU&gl=AU&ceid=AU:en';
const MAX   = 8;

const decode = s => (s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").trim();

const pick = (block, tag) => {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>'));
  return m ? decode(m[1]) : '';
};

const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = d => {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t) ? '' : t.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const res = await fetch(FEED, { headers: { 'User-Agent': 'Mozilla/5.0 (MindHealthNewsBot)' } });
if (!res.ok) throw new Error('RSS fetch failed: ' + res.status);
const xml = await res.text();

const items = [];
const re = /<item>([\s\S]*?)<\/item>/g;
let m;
while ((m = re.exec(xml)) && items.length < MAX) {
  const b = m[1];
  const raw = pick(b, 'title');
  const i = raw.lastIndexOf(' - ');
  items.push({
    title:  i > 0 ? raw.slice(0, i) : raw,
    source: i > 0 ? raw.slice(i + 3) : '',
    link:   pick(b, 'link'),
    date:   pick(b, 'pubDate')
  });
}
if (!items.length) throw new Error('No items parsed from feed');

const cards = items.map(it => {
  const date = fmtDate(it.date);
  return '    <a class="card" href="' + esc(it.link) + '" target="_blank" rel="noopener"><div class="info">' +
         '<div class="title">' + esc(it.title) + '</div>' +
         '<div class="meta"><span class="source">' + esc(it.source) + '</span>' + (date ? ' &middot; ' + date : '') + '</div>' +
         '</div></a>';
}).join('\n');

const updated = new Date().toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Australian Psychology &amp; Mental Health News</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; padding: 16px; }
h2 { font-size: 22px; font-weight: 600; color: #3C3C3C; text-align: center; margin-bottom: 16px; }
#news-items { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 700px) { #news-items { grid-template-columns: 1fr; } }
.card { display: flex; gap: 12px; padding: 14px; border-radius: 8px; text-decoration: none; color: inherit; border: 1px solid #e8e8e8; transition: box-shadow 0.2s, border-color 0.2s; background: #fff; }
.card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-color: #8AC642; }
.info { flex: 1; min-width: 0; }
.title { font-size: 14px; font-weight: 600; color: #3C3C3C; line-height: 1.35; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.meta { font-size: 11px; color: #999; }
.source { color: #8AC642; font-weight: 500; }
#updated { text-align: center; font-size: 11px; color: #bbb; margin-top: 14px; }
</style>
</head>
<body>
<h2>Australian Psychology &amp; Mental Health News</h2>
<div id="news-items">
${cards}
</div>
<div id="updated">Updated ${esc(updated)}</div>
</body>
</html>
`;

await writeFile('index.html', html);
console.log('Wrote static index.html with ' + items.length + ' items');
