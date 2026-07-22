import { writeFile } from 'node:fs/promises';

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
await writeFile('news.json', JSON.stringify({ updated: new Date().toISOString(), items }, null, 2));
console.log('Wrote news.json with ' + items.length + ' items');
