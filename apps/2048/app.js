// 진입점: 렌더링, 입력 처리, 최고 점수 저장
import {
  SIZE,
  createInitialBoard,
  addRandomTile,
  move,
  hasWon,
  canMove,
} from './game.js';

const BEST_KEY = 'game2048-best';
const SWIPE_THRESHOLD = 30; // 스와이프 최소 이동 거리(px)

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const winOverlay = document.getElementById('win-overlay');
const overOverlay = document.getElementById('over-overlay');

let board = [];
let score = 0;
let best = loadBest();
let won = false; // 승리 오버레이를 이미 보여줬는지 (계속하기 포함)
let over = false;
let overlayOpen = false;

// localStorage 접근은 실패해도 동작하도록 try/catch로 감싼다
function loadBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (e) {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch (e) {
    // 저장 실패 시 메모리 값으로만 동작
  }
}

// 보드를 그린다. newCell은 새로 생긴 칸, mergedCells는 합쳐진 칸(애니메이션용)
function render(newCell = null, mergedCells = []) {
  const frag = document.createDocumentFragment();
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const value = board[r][c];
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');
      if (value > 0) {
        tile.classList.add(value > 2048 ? 'tile-super' : `tile-${value}`);
        tile.textContent = String(value);
        tile.setAttribute('aria-label', String(value));
        if (newCell && newCell[0] === r && newCell[1] === c) {
          tile.classList.add('tile-new');
        } else if (mergedCells.some(([mr, mc]) => mr === r && mc === c)) {
          tile.classList.add('tile-merged');
        }
      } else {
        tile.setAttribute('aria-label', '빈 칸');
      }
      frag.appendChild(tile);
    }
  }
  boardEl.replaceChildren(frag);
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function newGame() {
  board = createInitialBoard();
  score = 0;
  won = false;
  over = false;
  overlayOpen = false;
  winOverlay.hidden = true;
  overOverlay.hidden = true;
  render();
}

// 이동 결과에서 값이 커진(합쳐진) 칸을 찾는다
function findMerged(prev, next, direction) {
  const cells = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (next[r][c] === 0) continue;
      // 이전 보드에서 같은 값이 그 칸에 이미 있었으면 합쳐진 것이 아님(근사)
      if (prev[r][c] !== next[r][c]) cells.push([r, c]);
    }
  }
  return direction ? cells : [];
}

function handleMove(direction) {
  if (over || overlayOpen) return;
  const result = move(board, direction);
  if (!result.moved) return; // 변화가 없으면 새 타일도 점수도 없음

  const prev = board;
  const added = addRandomTile(result.board);
  board = added.board;
  score += result.gained;
  if (score > best) {
    best = score;
    saveBest();
  }

  // 합쳐진 칸 표시: 점수를 얻은 이동에서만, 새 타일 칸은 제외
  const merged = result.gained > 0
    ? findMerged(prev, result.board, direction)
    : [];
  render(added.cell, merged);

  if (!won && hasWon(board)) {
    won = true;
    overlayOpen = true;
    winOverlay.hidden = false;
    document.getElementById('continue').focus();
  } else if (!canMove(board)) {
    over = true;
    overOverlay.hidden = false;
    document.getElementById('restart').focus();
  }
}

// 키보드 입력
const KEY_TO_DIRECTION = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

document.addEventListener('keydown', (event) => {
  const direction = KEY_TO_DIRECTION[event.key];
  if (!direction) return;
  event.preventDefault(); // 페이지 스크롤 방지
  handleMove(direction);
});

// 터치 스와이프 입력
let touchStart = null;

boardEl.addEventListener('touchstart', (event) => {
  const t = event.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

boardEl.addEventListener('touchend', (event) => {
  if (!touchStart) return;
  const t = event.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
  // 변위가 큰 쪽을 방향으로 삼는다
  if (Math.abs(dx) > Math.abs(dy)) {
    handleMove(dx > 0 ? 'right' : 'left');
  } else {
    handleMove(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

boardEl.addEventListener('touchcancel', () => { touchStart = null; });

// 버튼 연결
document.getElementById('new-game').addEventListener('click', newGame);
document.getElementById('win-new-game').addEventListener('click', newGame);
document.getElementById('restart').addEventListener('click', newGame);
document.getElementById('continue').addEventListener('click', () => {
  overlayOpen = false;
  winOverlay.hidden = true;
  // 승리와 동시에 이동 불가가 된 경우 게임 오버를 알린다
  if (!canMove(board)) {
    over = true;
    overOverlay.hidden = false;
    document.getElementById('restart').focus();
  }
});

newGame();
