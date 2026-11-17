// 마크다운 → HTML 변환기 (외부 라이브러리 없음).
// 모든 텍스트를 먼저 이스케이프한 뒤 문법을 변환하므로 원문 HTML 은 실행되지 않는다.

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- frontmatter -------------------------------------------------------

export function parseFrontmatter(source) {
  const text = source.replace(/^﻿/, '');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    let value = raw.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((item) => stripQuotes(item.trim()))
        .filter(Boolean);
    } else {
      value = stripQuotes(value);
    }
    meta[key] = value;
  }
  return { meta, body: text.slice(match[0].length) };
}

function stripQuotes(value) {
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

// ---- 인라인 ------------------------------------------------------------

function safeUrl(url) {
  // 공백/제어문자를 제거한 뒤 스킴을 검사한다. http, https, mailto 와 상대 경로만 허용.
  const cleaned = url.replace(/[\u0000- \u007f]/g, '');
  const scheme = cleaned.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !['http', 'https', 'mailto'].includes(scheme[1].toLowerCase())) {
    return '#';
  }
  return url;
}

function inline(raw) {
  const codes = [];
  let text = raw.replace(/\u0000/g, '').replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  text = escapeHtml(text);

  // 이미지 → 링크 순서로 처리한다. URL 은 이미 이스케이프된 상태.
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;.*?&quot;)?\)/g, (_, alt, url) => {
    return `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy">`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;.*?&quot;)?\)/g, (_, label, url) => {
    const href = safeUrl(url);
    const external = /^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${external}>${label}</a>`;
  });

  text = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_(?!\s)(.+?)(?<!\s)_(?![\w])/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>');

  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${escapeHtml(codes[index])}</code>`);
}

// ---- 블록 --------------------------------------------------------------

const RE_FENCE = /^\s*(```|~~~)\s*([\w+#-]*)\s*$/;
const RE_HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
const RE_LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const RE_QUOTE = /^\s*>\s?(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isBlockStart(line, next) {
  return (
    RE_FENCE.test(line) ||
    RE_HEADING.test(line) ||
    RE_HR.test(line) ||
    RE_QUOTE.test(line) ||
    RE_LIST.test(line) ||
    (line.includes('|') && next !== undefined && RE_TABLE_SEP.test(next))
  );
}

function parseList(lines, start) {
  const first = lines[start].match(RE_LIST);
  const baseIndent = first[1].replace(/\t/g, '    ').length;
  const ordered = /\d/.test(first[2]);
  const items = [];
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(RE_LIST);
    if (!match) break;
    const indent = match[1].replace(/\t/g, '    ').length;

    if (indent === baseIndent && /\d/.test(match[2]) === ordered) {
      items.push({ text: match[3], children: '' });
      i += 1;
    } else if (indent > baseIndent && items.length) {
      const nested = parseList(lines, i);
      items[items.length - 1].children += nested.html;
      i = nested.next;
    } else {
      break;
    }
  }

  const tag = ordered ? 'ol' : 'ul';
  const html = items
    .map(({ text, children }) => {
      const task = text.match(/^\[([ xX])\]\s+(.*)$/);
      if (task) {
        const checked = task[1] !== ' ' ? ' checked' : '';
        return `<li class="task"><input type="checkbox" disabled${checked}>${inline(task[2])}${children}</li>`;
      }
      return `<li>${inline(text)}${children}</li>`;
    })
    .join('');
  return { html: `<${tag}>${html}</${tag}>`, next: i };
}

export function renderMarkdown(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 코드 블록
    const fence = line.match(RE_FENCE);
    if (fence) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // 닫는 펜스
      const lang = fence[2] ? ` class="language-${escapeHtml(fence[2])}"` : '';
      out.push(`<pre><code${lang}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // 제목
    const heading = line.match(RE_HEADING);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level} id="${escapeHtml(slugify(heading[2]))}">${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // 구분선 (목록보다 먼저 검사: "---", "* * *")
    if (RE_HR.test(line)) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    // 인용
    if (RE_QUOTE.test(line)) {
      const quote = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        quote.push(lines[i].match(RE_QUOTE)[1]);
        i += 1;
      }
      out.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`);
      continue;
    }

    // 목록
    if (RE_LIST.test(line)) {
      const list = parseList(lines, i);
      out.push(list.html);
      i = list.next;
      continue;
    }

    // 표
    if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1])) {
      const headers = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((cell) => {
        if (/^:-+:$/.test(cell)) return 'center';
        if (/^-+:$/.test(cell)) return 'right';
        return 'left';
      });
      const cellAttr = (index) => ` data-align="${aligns[index] || 'left'}"`;
      let html = '<div class="table-wrap"><table><thead><tr>';
      html += headers.map((cell, index) => `<th${cellAttr(index)}>${inline(cell)}</th>`).join('');
      html += '</tr></thead><tbody>';
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        const cells = splitRow(lines[i]);
        html += '<tr>' + headers.map((_, index) => `<td${cellAttr(index)}>${inline(cells[index] || '')}</td>`).join('') + '</tr>';
        i += 1;
      }
      html += '</tbody></table></div>';
      out.push(html);
      continue;
    }

    // 문단
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !(paragraph.length && isBlockStart(lines[i], lines[i + 1]))) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${inline(paragraph.join('\n'))}</p>`);
  }

  return out.join('\n');
}
