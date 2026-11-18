// 2048 순수 게임 로직 (DOM을 다루지 않는다)
export const SIZE = 4;
export const WIN_VALUE = 2048;

// 빈 보드(4x4, 0은 빈 칸)를 만든다
export function createEmptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

// 한 줄을 왼쪽으로 민다. 합친 쌍은 건너뛰므로 이중 합치기가 없다.
export function slideLine(line) {
  const tiles = line.filter((v) => v !== 0);
  const result = [];
  let gained = 0;
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const merged = tiles[i] * 2;
      result.push(merged);
      gained += merged;
      i += 2;
    } else {
      result.push(tiles[i]);
      i += 1;
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, gained };
}

// 방향(left/right/up/down)으로 보드를 이동한다. 원본 보드는 바꾸지 않는다.
export function move(board, direction) {
  const next = createEmptyBoard();
  let gained = 0;
  let moved = false;

  for (let k = 0; k < SIZE; k += 1) {
    // 이동 방향 기준으로 줄을 뽑는다 (오른쪽/아래는 뒤집어서 왼쪽 밀기로 처리)
    const line = [];
    for (let j = 0; j < SIZE; j += 1) {
      const [r, c] = toCell(direction, k, j);
      line.push(board[r][c]);
    }
    const slid = slideLine(line);
    gained += slid.gained;
    for (let j = 0; j < SIZE; j += 1) {
      const [r, c] = toCell(direction, k, j);
      next[r][c] = slid.line[j];
      if (board[r][c] !== slid.line[j]) moved = true;
    }
  }
  return { board: next, gained, moved };
}

// k번째 줄의 j번째 위치를 보드 좌표로 바꾼다
function toCell(direction, k, j) {
  switch (direction) {
    case 'left': return [k, j];
    case 'right': return [k, SIZE - 1 - j];
    case 'up': return [j, k];
    default: return [SIZE - 1 - j, k]; // down
  }
}

// 빈 칸 하나에 새 타일(2는 90%, 4는 10%)을 놓는다. 새 보드와 위치를 돌려준다.
export function addRandomTile(board, rng = Math.random) {
  const empty = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return { board, cell: null };
  const [r, c] = empty[Math.floor(rng() * empty.length)];
  const next = board.map((row) => row.slice());
  next[r][c] = rng() < 0.9 ? 2 : 4;
  return { board: next, cell: [r, c] };
}

// 2048 이상 타일이 있는지
export function hasWon(board) {
  return board.some((row) => row.some((v) => v >= WIN_VALUE));
}

// 더 움직일 수 있는지 (빈 칸 또는 인접한 같은 값)
export function canMove(board) {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const v = board[r][c];
      if (v === 0) return true;
      if (c + 1 < SIZE && board[r][c + 1] === v) return true;
      if (r + 1 < SIZE && board[r + 1][c] === v) return true;
    }
  }
  return false;
}

// 새 게임 보드: 타일 2개로 시작
export function createInitialBoard(rng = Math.random) {
  let board = createEmptyBoard();
  board = addRandomTile(board, rng).board;
  board = addRandomTile(board, rng).board;
  return board;
}
