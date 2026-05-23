const DB_ID = '23ed6ef369f780718890d8948e994e24';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token not configured' });

  let allResults = [];
  let cursor;

  try {
    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        return res.status(response.status).json(err);
      }

      const data = await response.json();
      allResults = allResults.concat(data.results.map(page => {
        const p = page.properties;
        return {
          artist: p.Artist?.title?.map(t => t.plain_text).join('') || '',
          title: p.Title?.rich_text?.map(t => t.plain_text).join('') || '',
          folder: p.Folder?.select?.name || '',
          flag: p.FLAG?.select?.name === '🚩'
        };
      }));

      cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);

    res.status(200).json({ tracks: allResults });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
