// api/lead.js
function setCors(req, res) {
  const allowList = (process.env.ALLOW_ORIGIN || '*')
    .split(',')
    .map(s => s.trim());

  const origin = req.headers.origin || '';
  const allowed =
    allowList.includes('*') ||
    allowList.includes(origin);

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // важно для кешей/CDN
  }
  // если хотите жёстко отдать один домен:
  // res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN);

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(req, res);

  // Предзапрос браузера (preflight) — отвечаем пусто и OK
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { phone, messenger, config, price, url } = req.body || {};
    if (!phone || !config) {
      return res.status(400).json({ ok: false, error: 'Bad payload' });
    }

    const text = `<b>Заявка на счёт</b>
Кофемашина: ${config.machine}
Холодильник: ${config.fridge}
Терминал: ${config.terminal}
Каркас: ${config.frame}
Итого: ${price}

Контакты: ${phone}
Канал связи: ${messenger || '-'}
Ссылка на конфигурацию: ${url}`;

    const tg = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!tg.ok) {
      const details = await tg.text();
      return res.status(500).json({ ok: false, error: 'Telegram error', details });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
