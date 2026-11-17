---
title: 오늘 배운 것
date: 2026-11-17
tags: [html, css, javascript, 배운것]
summary: Claude Code로 블로그를 만들며 알게 된 HTML, CSS, JavaScript 각각의 역할을 정리했습니다.
---

Claude Code와 함께 마크다운 블로그를 만들면서, 웹페이지를 이루는 세 가지 기술의 **역할**이 훨씬 또렷해졌습니다. 짧게 정리해 봅니다.

## 한 줄 요약

| 기술 | 역할 | 비유 |
|------|------|------|
| HTML | 페이지의 **구조와 내용** | 건물의 뼈대 |
| CSS | 페이지의 **모양과 배치** | 인테리어와 페인트 |
| JavaScript | 페이지의 **동작과 변화** | 전기와 설비 |

## 1. HTML: 무엇이 있는가

HTML은 페이지에 **무엇이 들어 있는지**를 정합니다. 제목, 문단, 버튼, 링크 같은 요소에 의미를 붙이는 일입니다.

이 블로그에서는 `header`, `main`, `article`, `footer` 같은 시맨틱 태그로 영역을 나눴습니다. 덕분에 화면 낭독기나 검색 엔진도 구조를 이해하기 쉽습니다.

```html
<header>
  <a href="index.html">내 블로그</a>
  <button id="theme-toggle" aria-label="다크 모드 전환"></button>
</header>
<main id="main">
  <div id="app"></div>
</main>
```

## 2. CSS: 어떻게 보이는가

CSS는 **어떻게 보일지**를 정합니다. 색, 글꼴, 간격, 화면 크기에 따른 배치가 여기에 속합니다.

오늘 가장 인상 깊었던 것은 **CSS 변수**였습니다. 색을 변수로 정해 두면, 값만 바꿔서 다크 모드를 만들 수 있습니다.

```css
:root {
  --bg: #ffffff;
  --fg: #1f2328;
}

:root[data-theme="dark"] {
  --bg: #0f1419;
  --fg: #e6edf3;
}

body {
  background: var(--bg);
  color: var(--fg);
}
```

모바일 화면은 `min-width` 미디어 쿼리로 넓은 화면에서만 스타일을 덧붙이는 방식(모바일 우선)으로 대응했습니다.

## 3. JavaScript: 무엇을 하는가

JavaScript는 페이지가 **스스로 동작**하게 만듭니다. 이 블로그에서는 세 가지 일을 맡았습니다.

1. `posts/index.json` 과 `.md` 파일을 `fetch()` 로 불러오기
2. 마크다운 문법을 HTML 로 바꿔서 화면에 그리기
3. 다크 모드 버튼을 눌렀을 때 테마를 바꾸고 `localStorage` 에 저장하기

```js
const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
document.documentElement.dataset.theme = next;
localStorage.setItem('theme', next);
```

## 세 기술이 함께 일하는 모습

다크 모드 버튼 하나만 봐도 역할이 나뉩니다.

- **HTML**: 버튼이라는 요소를 만든다
- **CSS**: 버튼 모양과 다크 모드 색상을 정한다
- **JavaScript**: 클릭을 감지해 테마를 바꾸고 기억한다

> 구조는 HTML, 모양은 CSS, 동작은 JavaScript. 역할을 나눠 두면 고칠 곳도 금방 찾을 수 있습니다.

## 오늘의 정리

- [x] HTML, CSS, JavaScript 의 역할 구분
- [x] CSS 변수로 다크 모드 만들기
- [x] 마크다운을 읽어 HTML 로 변환하는 흐름 이해
- [ ] 다음에는 이미지가 많은 글(카드뉴스) 올려 보기
