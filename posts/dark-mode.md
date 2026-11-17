---
title: 프레임워크 없이 다크 모드 만들기
date: 2026-11-10
tags: [css, javascript]
summary: CSS 변수와 data-theme 속성만으로 깜빡임 없는 다크 모드를 구현하는 방법.
---

다크 모드는 **CSS 변수**와 `data-theme` 속성만 있으면 충분합니다.

## 1. 색을 변수로 정의하기

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

## 2. 깜빡임 막기

테마 스크립트를 `<head>` 에서 CSS보다 먼저 실행합니다.

```html
<script>
  const saved = localStorage.getItem('theme');
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = saved || (dark ? 'dark' : 'light');
</script>
```

## 3. 체크리스트

- [x] 시스템 설정 따르기
- [x] 토글 버튼으로 직접 전환
- [ ] 다른 탭과 동기화 (나중에)

| 항목 | 방법 |
|:-----|:----:|
| 색상 관리 | CSS 변수 |
| 저장 | `localStorage` |
| 기본값 | `prefers-color-scheme` |
