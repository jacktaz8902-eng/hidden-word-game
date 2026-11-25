// 히든 워드 — AI 유사도 중계 서버 (Cloudflare Worker)
// GET /sim?h=<히든 워드>&w=<힌트>  →  {"valid":true,"score":57}
// 비밀값: ANTHROPIC_API_KEY (Cloudflare 대시보드 > Worker > Settings > Variables and Secrets 에서 Secret 으로 등록)
// 선택값: ALLOWED_ORIGIN (기본 https://jacktaz8902-eng.github.io), MODEL (기본 claude-haiku-5-5)

const PROMPT = (h, w) => `너는 한국어 단어 유사도 채점기다.
1) 먼저 단어B가 한국어 명사(일반명사 또는 고유명사: 사람·지명·브랜드·작품 이름 포함)인지 판정한다. 동사·형용사·부사·문장·의미 없는 글자는 명사가 아니다.
2) 명사라면 단어A와 단어B의 유사도를 0~100 정수로 매긴다. 세 기준을 종합한다.
 - 의미적 거리: 사전적 정의와 개념적 특징이 얼마나 겹치는가
 - 문맥적 공생: 한 문장이나 비슷한 맥락에서 얼마나 자주 함께 등장하는가
 - 관계적 구조: 상위어·하위어·부분-전체·반의어 등 어떤 관계로 연결되는가
규칙: 반의어는 무관한 단어가 아니므로 낮게 주지 않는다. 무관하면 0~15. 95 이상은 거의 같은 뜻이거나 표기만 다른 같은 말일 때만 준다.
JSON 한 줄로만 답하라: {"valid": true 또는 false, "score": 정수}
단어A: ${h}
단어B: ${w}`;

function cors(origin, allowed) {
  const ok = allowed === "*" || origin === allowed;
  return {
    "Access-Control-Allow-Origin": ok ? origin || "*" : allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

export default {
  async fetch(request, env, ctx) {
    const allowed = env.ALLOWED_ORIGIN || "https://jacktaz8902-eng.github.io";
    const origin = request.headers.get("Origin") || "";
    const ch = cors(origin, allowed);
    if (request.method === "OPTIONS") return new Response(null, { headers: ch });
    const url = new URL(request.url);
    if (url.pathname === "/" ) return json({ ok: true, service: "hidden-word-sim" }, 200, ch);
    if (url.pathname !== "/sim" || request.method !== "GET") return json({ error: "not_found" }, 404, ch);
    if (allowed !== "*" && origin && origin !== allowed) return json({ error: "forbidden_origin" }, 403, ch);

    const h = (url.searchParams.get("h") || "").replace(/\s+/g, "").slice(0, 20);
    const w = (url.searchParams.get("w") || "").replace(/\s+/g, "").slice(0, 20);
    if (!h || !w) return json({ error: "missing" }, 400, ch);
    if (!/^[가-힣A-Za-z0-9]+$/.test(w)) return json({ valid: false, score: 0 }, 200, ch);
    if (h === w) return json({ valid: true, score: 100 }, 200, ch);
    if (!env.ANTHROPIC_API_KEY) return json({ error: "no_api_key" }, 500, ch);

    // 같은 단어 쌍은 같은 점수: Cloudflare 캐시에 30일 보관
    const cacheKey = new Request(`https://cache.hidden-word/sim?h=${encodeURIComponent(h)}&w=${encodeURIComponent(w)}`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return json(await hit.json(), 200, { ...ch, "X-Cache": "HIT" });

    let result;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env.MODEL || "claude-haiku-5-5",
          max_tokens: 60,
          messages: [{ role: "user", content: PROMPT(h, w) }],
        }),
      });
      if (!r.ok) return json({ error: "upstream", status: r.status }, 502, ch);
      const data = await r.json();
      const text = (data.content || []).map((c) => c.text || "").join("");
      const m = text.match(/\{[\s\S]*\}/);
      const parsed = m ? JSON.parse(m[0]) : {};
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
      result = { valid: parsed.valid !== false, score: Number.isFinite(score) ? score : 0 };
    } catch (e) {
      return json({ error: "parse" }, 502, ch);
    }
    ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(result), { headers: { "Cache-Control": "public, max-age=2592000" } })));
    return json(result, 200, ch);
  },
};
