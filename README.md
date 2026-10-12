# 북크닉 미니 활동

숲 속 도서관 메인 화면에서 책등을 눌러 세 가지 활동으로 들어갑니다.
책장 아래 **보너스 이벤트**를 누르면 안내 창이 열리고, **북크닉 사진 보내기**로 카카오톡 오픈채팅방에 들어가 사진을 보냅니다.

```
bookcnic/
├─ index.html          메인 화면 (숲 속 도서관 · 책등 버튼 · 보너스 이벤트 안내 창)
├─ filsa/              필사 자판기
│  ├─ index.html
│  ├─ style.css
│  ├─ app.js
│  └─ data.js          문장 100개 · 카테고리 5개
├─ poem/index.html     시 완성 게임 (시는 파일 안 '시 넣는 곳'에서 수정)
└─ tarot/index.html    북 타로 운세
```

## 실행 (VS Code)
1. `bookcnic` 폴더를 VS Code로 엽니다.
2. 확장 프로그램 **Live Server**를 설치합니다.
3. 맨 위 `index.html`에서 마우스 오른쪽 → **Open with Live Server**.

휴대폰으로 보려면 같은 와이파이에서 `http://<내 PC IP>:5500` 으로 접속합니다.
각 활동 화면 왼쪽 위의 `← 북크닉 홈`으로 메인 화면에 돌아옵니다.

## 메인 화면 고치기
- 책 색: `index.html`의 `--book-1`(필사 자판기), `--book-2`(시 완성 게임), `--book-3`(북 타로 운세)
- 책 이름·설명: `<a class="spine">` 안의 `.title`, `.sub`
- 활동을 더 넣으려면 `<a class="spine">` 하나를 복사해 `href`와 글자만 바꾸면 됩니다.

## 보너스 이벤트 고치기
- 안내 문구: `index.html`의 `<dialog class="sheet">` 안
- 오픈채팅방 주소: `<a class="kakao" href="https://open.kakao.com/o/spM141Ri">`의 `href`

## 필사 자판기 표지
`filsa/data.js`의 `yes24` 상품번호로 `https://image.yes24.com/goods/{번호}/XL` 표지를 보여 줍니다.
없거나 불러오지 못하면 진한 회색 바탕에 흰 글씨로 책 제목을 보여 줍니다.
