// 진입점: 페이지 종류에 따라 목록 또는 상세를 그린다.
import { initTheme } from './theme.js';
import { loadIndex, loadPost, PostNotFoundError } from './posts.js';
import { renderMarkdown } from './markdown.js';

const app = document.getElementById('app');
const SITE_TITLE = '내 블로그';
const CHARS_PER_MINUTE = 500; // 한글 기준 분당 읽는 글자 수(공백 제외)

const pad = (n) => String(n).padStart(2, '0');

function el(tag, options = {}, ...children) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.href) node.href = options.href;
  if (options.dateTime) node.dateTime = options.dateTime;
  node.append(...children);
  return node;
}

// 2026-11-17 → 2026.11.17
function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : String(value || '');
}

function tagList(tags = []) {
  if (!tags.length) return null;
  const list = el('ul', { className: 'tags' });
  for (const tag of tags) {
    const item = el('li');
    item.append(el('a', { className: 'tag', text: `#${tag}`, href: `index.html?tag=${encodeURIComponent(tag)}` }));
    list.append(item);
  }
  return list;
}

function showError(message) {
  app.replaceChildren(
    el('div', { className: 'error-box' },
      el('p', { text: message }),
      el('a', { text: '← 글 목록으로', href: 'index.html' })
    )
  );
}

// ---- 목록 ---------------------------------------------------------------

function postRow(post, number, index) {
  const row = el('li', { className: 'post-row' });
  row.style.setProperty('--i', index);

  const title = el('h3', {},
    el('a', { className: 'post-row__link', text: post.title, href: `post.html?slug=${encodeURIComponent(post.slug)}` })
  );
  const meta = el('div', { className: 'meta' });
  if (post.date) meta.append(el('time', { text: formatDate(post.date), dateTime: post.date }));

  row.append(el('span', { className: 'post-row__no', text: `No.${pad(number)}` }), meta, title);
  if (post.summary) row.append(el('p', { className: 'post-row__summary', text: post.summary }));
  const tags = tagList(post.tags);
  if (tags) row.append(tags);
  const arrow = el('span', { className: 'post-row__arrow', text: '→' });
  arrow.setAttribute('aria-hidden', 'true');
  row.append(arrow);
  return row;
}

async function showList() {
  const tag = new URLSearchParams(location.search).get('tag');
  const posts = await loadIndex();
  const shown = tag ? posts.filter((post) => (post.tags || []).includes(tag)) : posts;

  const nodes = [
    el('div', { className: 'section-head' },
      el('h2', { className: 'section-title', text: tag ? `#${tag}` : '최근 글' }),
      el('span', { className: 'section-count', text: `${pad(shown.length)} ENTRIES` })
    ),
  ];

  if (tag) {
    nodes.push(el('div', { className: 'filter-bar' },
      el('span', { text: `태그 "${tag}" 로 필터링됨` }),
      el('a', { text: '← 전체 글 보기', href: 'index.html' })
    ));
  }

  if (!shown.length) {
    nodes.push(el('p', { className: 'status', text: '아직 글이 없습니다.' }));
  } else {
    const list = el('ol', { className: 'post-list' });
    shown.forEach((post, index) => {
      // 번호는 전체 글 기준(오래된 글이 No.01)으로 고정해 필터링해도 바뀌지 않게 한다.
      list.append(postRow(post, posts.length - posts.indexOf(post), index));
    });
    nodes.push(list);
  }

  document.title = tag ? `#${tag} - ${SITE_TITLE}` : SITE_TITLE;
  app.replaceChildren(...nodes);
}

// ---- 상세 ---------------------------------------------------------------

// 본문 DOM 다듬기: 그림에 캡션, 코드 블록에 라벨과 복사 버튼
function enhanceProse(root) {
  for (const img of [...root.querySelectorAll('img')]) {
    const parent = img.parentElement;
    // 문단에 그림만 있을 때는 문단 전체를 그림(figure)으로 바꾼다.
    const onlyImage = parent && parent.tagName === 'P' && parent.children.length === 1 && !parent.textContent.trim();
    const figure = el('figure');

    // 세로로 긴 그림(카드뉴스 등)은 너무 커지지 않게 폭을 제한한다.
    const markPortrait = () => {
      if (img.naturalHeight > img.naturalWidth) figure.classList.add('is-portrait');
    };
    if (img.complete && img.naturalWidth) markPortrait();
    else img.addEventListener('load', markPortrait, { once: true });

    (onlyImage ? parent : img).replaceWith(figure);
    figure.append(img);
    if (img.alt) figure.append(el('figcaption', { text: img.alt }));
  }

  for (const pre of root.querySelectorAll('pre')) {
    const code = pre.querySelector('code');
    const language = (code && code.className.replace('language-', '')) || 'code';
    const button = el('button', { className: 'copy-button', text: '복사' });
    button.type = 'button';
    button.setAttribute('aria-label', '코드 복사');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        button.textContent = '복사됨';
      } catch (e) {
        button.textContent = '실패';
      }
      setTimeout(() => { button.textContent = '복사'; }, 1500);
    });

    const block = el('div', { className: 'code-block' }, el('div', { className: 'code-block__bar' }, el('span', { text: language }), button));
    pre.replaceWith(block);
    block.append(pre);
  }
}

// 스크롤 위치에 따라 상단 진행 바를 채운다.
function initProgress() {
  const bar = document.getElementById('progress');
  if (!bar) return;
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

async function showPost() {
  const slug = new URLSearchParams(location.search).get('slug');
  const { meta, body } = await loadPost(slug);

  const content = el('div', { className: 'prose' });
  content.innerHTML = renderMarkdown(body); // renderMarkdown 은 원문을 이스케이프한다.
  enhanceProse(content);

  const minutes = Math.max(1, Math.round(content.textContent.replace(/\s+/g, '').length / CHARS_PER_MINUTE));
  const info = el('div', { className: 'meta' });
  if (meta.date) info.append(el('time', { text: formatDate(meta.date), dateTime: meta.date }));
  info.append(el('span', { className: 'meta__dot', text: `읽는 시간 약 ${minutes}분` }));

  const header = el('header', { className: 'post-header' },
    el('span', { className: 'eyebrow', text: 'Entry' }),
    el('h1', { text: meta.title || slug }),
    info
  );
  const tags = tagList(meta.tags);
  if (tags) header.append(tags);

  const article = el('article', { className: 'article' },
    el('a', { className: 'back-link', text: '← 글 목록', href: 'index.html' }),
    header,
    content,
    el('footer', { className: 'post-footer' }, el('a', { className: 'back-link', text: '← 글 목록으로 돌아가기', href: 'index.html' }))
  );

  document.title = `${meta.title || slug} - ${SITE_TITLE}`;
  app.replaceChildren(article);
  initProgress();
}

async function main() {
  initTheme();
  try {
    if (document.body.dataset.page === 'post') await showPost();
    else await showList();
  } catch (error) {
    showError(error instanceof PostNotFoundError ? error.message : `문제가 발생했습니다. ${error.message}`);
  }
}

main();
