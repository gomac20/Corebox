// 다크 모드 토글. 첫 테마는 <head> 의 인라인 스크립트가 이미 적용해 둔다.
const KEY = 'theme';
const root = document.documentElement;

function readStored() {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch (e) {
    return null;
  }
}

function store(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch (e) {
    // 저장이 막힌 환경에서도 토글은 동작해야 한다.
  }
}

function apply(theme, button) {
  root.dataset.theme = theme;
  if (button) {
    const toDark = theme === 'light';
    button.textContent = toDark ? '☾' : '☀';
    button.setAttribute('aria-label', toDark ? '다크 모드로 전환' : '라이트 모드로 전환');
    button.title = button.getAttribute('aria-label');
  }
}

export function initTheme() {
  const button = document.getElementById('theme-toggle');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  apply(root.dataset.theme === 'dark' ? 'dark' : 'light', button);

  if (button) {
    button.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next, button);
      store(next);
    });
  }

  // 사용자가 직접 고른 적이 없으면 시스템 설정 변화를 따라간다.
  media.addEventListener('change', (event) => {
    if (readStored()) return;
    apply(event.matches ? 'dark' : 'light', button);
  });
}
