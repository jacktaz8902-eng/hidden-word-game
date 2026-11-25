# 히든 워드 (숨은 단어 맞히기)

워크숍 팀빌딩용 단어 유사도 추리 게임입니다. 방장이 방을 만들고 초대 링크를 보내면, 링크로 들어온 사람끼리 각자 폰에서 함께 진행합니다(최대 8명/팀).

- 연결: PeerJS(P2P). 방장 브라우저가 게임을 관리합니다. 서버가 필요 없습니다.
- 문제 단어: 일상 명사 974개 (`pool1000.json`) 중 봉투마다 5개씩 무작위.
- 유사도: AI 중계 서버(`worker/worker.js`, Cloudflare Worker + Claude API)를 연결하면 고유명사를 포함한 모든 명사를 힌트로 쓸 수 있습니다. 연결 전에는 내장 단어 사전(fastText 벡터, 약 1,800개)으로 계산합니다.

## AI 유사도 연결 방법

1. Cloudflare 가입 → Workers & Pages → Create → Worker 만들기 (이름 예: `hidden-word-sim`)
2. 편집 화면에서 `worker/worker.js` 내용을 통째로 붙여 넣고 Deploy
3. Worker → Settings → Variables and Secrets → Add → Type: Secret, Name: `ANTHROPIC_API_KEY`, Value: Anthropic API 키 (https://console.anthropic.com 에서 발급)
4. Worker 주소(`https://hidden-word-sim.<계정>.workers.dev`)를 `config.js`의 `window.HW_API`에 넣고 커밋

같은 단어 쌍은 Cloudflare 캐시에 30일 보관되어 같은 점수가 나오고, API 호출도 줄어듭니다.

단어 벡터 출처: fastText Common Crawl 벡터 (Grave et al., 2018), CC BY-SA 3.0.
