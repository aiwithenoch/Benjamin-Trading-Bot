// Vercel Serverless Function: /api/news
// Fetches real RSS feeds server-side — no CORS issues, no API key needed.

const RSS_FEEDS = [
    { url: 'https://cointelegraph.com/rss', source: 'CoinTelegraph' },
    { url: 'https://cryptonews.com/news/feed/', source: 'CryptoNews' },
    { url: 'https://www.forexlive.com/feed/news', source: 'ForexLive' },
    { url: 'https://feeds.feedburner.com/CoinDesk', source: 'CoinDesk' },
];

const BULL = ['surge', 'rally', 'gain', 'rise', 'bull', 'breakout', 'buy', 'high', 'record', 'soar', 'boost', 'inflow', 'jump', 'climb', 'rebound', 'recovery', 'up'];
const BEAR = ['drop', 'fall', 'sell', 'crash', 'bear', 'decline', 'loss', 'outflow', 'ban', 'fear', 'sink', 'plunge', 'dump', 'slide', 'tumble', 'pressure', 'down'];

function sentiment(title) {
    const lc = title.toLowerCase();
    const bull = BULL.some(w => lc.includes(w));
    const bear = BEAR.some(w => lc.includes(w));
    if (bull && !bear) return 'BULLISH';
    if (bear && !bull) return 'BEARISH';
    return 'NEUTRAL';
}

function timeAgo(dateStr) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (isNaN(mins) || mins < 0) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function parseRSS(xml, source) {
    const items = [];
    // Match <item>...</item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];

        const titleMatch = block.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
            block.match(/<title[^>]*>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/) ||
            block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/);
        const dateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) ||
            block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/);

        const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : '';
        const link = linkMatch ? linkMatch[1].trim() : '';
        const date = dateMatch ? dateMatch[1].trim() : new Date().toUTCString();

        if (title.length > 10) {
            items.push({
                id: `${source}-${items.length}-${Date.now()}`,
                headline: title.length > 100 ? title.slice(0, 98) + '…' : title,
                source,
                sentiment: sentiment(title),
                timeAgo: timeAgo(date),
                link,
            });
        }
        if (items.length >= 4) break;
    }
    return items;
}

async function fetchFeed({ url, source }) {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AURUM/1.0)' },
            signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSS(xml, source);
    } catch {
        return [];
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60'); // cache 2 min

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
        const news = results.flat().slice(0, 12);

        if (news.length === 0) {
            return res.status(200).json({ news: [], error: 'All feeds unavailable' });
        }

        return res.status(200).json({ news });
    } catch (err) {
        return res.status(500).json({ news: [], error: err.message });
    }
}
