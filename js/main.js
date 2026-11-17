// 진입점: 페이지 종류에 따라 목록 또는 상세를 그린다.
import { initTheme } from './theme.js';
import { loadIndex, loadPost, PostNotFoundError } from './posts.js';
import { renderMarkdown } from './markdown.js';

const app = document.getElementById('app');
const SITE_TITLE = '내 블로그';

function el(tag, options = {}, ...children) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.href) node.href = options.href;
  if (options.dateTime) node.dateTime = options.dateTime;
  node.append(...children);
  return node;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
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

function metaLine(post) {
  const meta = el('div', { className: 'meta' });
  if (post.date) {
    meta.append(el('time', { text: formatDate(post.date), dateTime: post.date }));
  }
  const tags = tagList(post.tags);
  if (tags) meta.append(tags);
  return meta;
}

function showError(message) {
  app.replaceChildren(
    el('div', { className: 'error-box' },
      el('p', { text: message }),
      el('a', { text: '← 글 목록으로', href: 'index.html' })
    )
  );
}

async function showList() {
  const tag = new URLSearchParams(location.search).get('tag');
  const posts = await loadIndex();
  const shown = tag ? posts.filter((post) => (post.tags || []).includes(tag)) : posts;

  const nodes = [el('h1', { className: 'page-title', text: tag ? `#${tag}` : '글 목록' })];
  if (tag) nodes.push(el('a', { className: 'back-link', text: '← 전체 글 보기', href: 'index.html' }));

  if (!shown.length) {
    nodes.push(el('p', { className: 'status', text: '아직 글이 없습니다.' }));
  }

  for (const post of shown) {
    const card = el('article', { className: 'post-card' },
      el('h2', {}, el('a', { text: post.title, href: `post.html?slug=${encodeURIComponent(post.slug)}` })),
      metaLine(post)
    );
    if (post.summary) card.append(el('p', { text: post.summary }));
    nodes.push(card);
  }

  document.title = tag ? `#${tag} - ${SITE_TITLE}` : SITE_TITLE;
  app.replaceChildren(...nodes);
}

async function showPost() {
  const slug = new URLSearchParams(location.search).get('slug');
  const { meta, body } = await loadPost(slug);

  const article = el('article', {},
    el('a', { className: 'back-link', text: '← 글 목록', href: 'index.html' }),
    el('header', { className: 'post-header' },
      el('h1', { text: meta.title || slug }),
      metaLine(meta)
    )
  );
  const content = el('div', { className: 'prose' });
  content.innerHTML = renderMarkdown(body); // renderMarkdown 은 원문을 이스케이프한다.
  article.append(content);

  document.title = `${meta.title || slug} - ${SITE_TITLE}`;
  app.replaceChildren(article);
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
