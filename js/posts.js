// 글 목록과 본문 불러오기
import { parseFrontmatter } from './markdown.js';

// 슬러그는 글자, 숫자, -, _ 만 허용한다 (경로 이동 방지).
const SLUG_PATTERN = /^[\p{L}\p{N}_-]+$/u;

export class PostNotFoundError extends Error {}

export async function loadIndex() {
  // no-cache: 저장해 둔 사본을 쓰기 전에 서버에 최신 여부를 확인한다 (글을 올리거나 지운 뒤 바로 반영).
  const response = await fetch('posts/index.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`글 목록을 불러오지 못했습니다 (${response.status})`);
  const posts = await response.json();
  return posts.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function loadPost(slug) {
  if (!slug || !SLUG_PATTERN.test(slug)) throw new PostNotFoundError('잘못된 글 주소입니다.');
  const response = await fetch(`posts/${encodeURIComponent(slug)}.md`, { cache: 'no-cache' });
  if (response.status === 404) throw new PostNotFoundError('글을 찾을 수 없습니다.');
  if (!response.ok) throw new Error(`글을 불러오지 못했습니다 (${response.status})`);
  return parseFrontmatter(await response.text());
}
