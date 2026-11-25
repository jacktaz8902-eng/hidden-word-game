# 히든 워드 (숨은 단어 맞히기)

워크숍 팀빌딩용 단어 유사도 추리 게임입니다. 진행자가 스크린 한 대에 띄워 2~8명(팀)으로 운영합니다.

- 유사도: 한국어 fastText 단어 벡터(cc.ko.300, 명사 1,978개)로 브라우저에서 계산합니다. 서버나 API 키가 필요 없습니다.
- 봉투: 시작할 때 단어 사전에서 5개씩 무작위로 넣으며, 각 조가 봉투를 열 때만 보입니다.
- 배포: GitHub Pages (Settings → Pages → Branch: main / root)

단어 벡터 출처: fastText Common Crawl 벡터 (Grave et al., 2018), CC BY-SA 3.0.
