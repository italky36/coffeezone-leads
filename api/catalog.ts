// api/catalog.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS только для твоего домена
const allowOrigin = 'https://coffeezone.ru';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);

  try {
    // Используем переменные окружения (не светим секреты во фронт)
    const GAS_URL  = process.env.GAS_WEBAPP_URL;   // URL твоего Apps Script Web App (оканчивается на /exec)
    const GAS_KEY  = process.env.GAS_API_KEY;      // тот же ключ, что в Script Properties
    if (!GAS_URL || !GAS_KEY) {
      return res.status(500).json({ ok:false, error:'Server misconfigured' });
    }

    // Тянем каталог с ключом (сервер-сайд)
    const url = new URL(GAS_URL);
    // у тебя doGet не требует ключ — можно не добавлять; если делаешь проверку — добавь:
    url.searchParams.set('api_key', GAS_KEY);

    const r = await fetch(url.toString(), { method: 'GET', headers: { 'Accept': 'application/json' }});
    const data = await r.json();

    if (!r.ok || !data?.ok) {
      return res.status(502).json({ ok:false, error: data?.error || 'Bad upstream' });
    }

    // Можно чуть нормализовать/фильтрануть поля, если нужно.
    // Кэш браузеру (и CDN) — чтобы разгрузить GAS
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600'); // 2 мин свежий, 10 мин фоновое обновление

    return res.status(200).json({ ok:true, data: data.data });
  } catch (e: any) {
    return res.status(500).json({ ok:false, error: e?.message || 'Internal error' });
  }
}
