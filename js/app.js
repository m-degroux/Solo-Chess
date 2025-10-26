const boardEl = document.getElementById('board');
const logEl = document.getElementById('log');
const turnLabel = document.getElementById('turnLabel');
const resetBtn = document.getElementById('resetBtn');

const state = {
  board: [],
  selected: null,
  whiteTurn: true,
  history: [],
  enPassant: null,
  flipped: false,
  castlingRights: {
    w: { K: true, Q: true },
    b: { K: true, Q: true }
  }
};

function cloneBoard(b) {
  return b.map(r => r.map(c => (c ? { ...c } : null)));
}
function inside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function initBoard() {
  const p = (type, color) => ({ type, color, hasMoved: false });
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];

  for (let i = 0; i < 8; i++) {
    b[0][i] = p(order[i], 'b');
    b[1][i] = p('P', 'b');
    b[6][i] = p('P', 'w');
    b[7][i] = p(order[i], 'w');
  }
  return b;
}

function validMoves(r, c) {
  const piece = state.board[r][c];
  if (!piece) return [];
  const moves = [];
  const addIf = (r2, c2) => {
    if (!inside(r2, c2)) return false;
    const target = state.board[r2][c2];
    if (!target) {
      moves.push({ r: r2, c: c2 });
      return true;
    } else if (target.color !== piece.color) {
      moves.push({ r: r2, c: c2 });
    }
    return false;
  };

  switch (piece.type) {
    case 'P': {
      const dir = piece.color === 'w' ? -1 : 1;
      const startRow = piece.color === 'w' ? 6 : 1;
      if (inside(r + dir, c) && !state.board[r + dir][c]) addIf(r + dir, c);
      if (r === startRow && !state.board[r + dir][c] && inside(r + 2 * dir, c) && !state.board[r + 2 * dir][c]) {
        moves.push({ r: r + 2 * dir, c, doubleStep: true });
      }
      for (const dc of [-1, 1]) {
        const rr = r + dir, cc = c + dc;
        if (inside(rr, cc)) {
          const target = state.board[rr][cc];
          if (target && target.color !== piece.color) moves.push({ r: rr, c: cc });
        }
      }
      if (state.enPassant && Math.abs(state.enPassant.c - c) === 1 && r + dir === state.enPassant.r) {
        moves.push({ r: state.enPassant.r, c: state.enPassant.c, enPassant: true });
      }

      break;
    }

    case 'R':
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const cont = addIf(rr, cc);
          if (!cont) break;
          rr += dr; cc += dc;
        }
      }
      break;

    case 'B':
      for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const cont = addIf(rr, cc);
          if (!cont) break;
          rr += dr; cc += dc;
        }
      }
      break;

    case 'Q':
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const cont = addIf(rr, cc);
          if (!cont) break;
          rr += dr; cc += dc;
        }
      }
      break;

    case 'N':
      for (const [dr, dc] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) {
        const rr = r + dr, cc = c + dc;
        if (inside(rr, cc) && (!state.board[rr][cc] || state.board[rr][cc].color !== piece.color))
          moves.push({ r: rr, c: cc });
      }
      break;

    case 'K':
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr || dc) {
            const rr = r + dr, cc = c + dc;
            if (inside(rr, cc) && (!state.board[rr][cc] || state.board[rr][cc].color !== piece.color)) {
              moves.push({ r: rr, c: cc });
            }
          }
      if (!piece.hasMoved) {
        const backRank = piece.color === 'w' ? 7 : 0;
        if (state.castlingRights[piece.color].K &&
          !state.board[backRank][5] && !state.board[backRank][6]) {
          moves.push({ r: backRank, c: 6, castling: 'K' });
        }
        if (state.castlingRights[piece.color].Q &&
          !state.board[backRank][1] && !state.board[backRank][2] && !state.board[backRank][3]) {
          moves.push({ r: backRank, c: 2, castling: 'Q' });
        }
      }
      break;
  }

  return moves;
}


function isSquareAttacked(r, c, color) {
  const enemy = color === 'w' ? 'b' : 'w';
  const pawnDir = enemy === 'w' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const rr = r + pawnDir, cc = c + dc;
    if (inside(rr, cc)) {
      const p = state.board[rr][cc];
      if (p && p.type === 'P' && p.color === enemy) return true;
    }
  }
  for (const [dr, dc] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) {
    const rr = r + dr, cc = c + dc;
    if (inside(rr, cc)) {
      const p = state.board[rr][cc];
      if (p && p.color === enemy && p.type === 'N') return true;
    }
  }
  const sliding = [
    { dirs: [[1, 0], [-1, 0], [0, 1], [0, -1]], types: ['R', 'Q'] },
    { dirs: [[1, 1], [1, -1], [-1, 1], [-1, -1]], types: ['B', 'Q'] }
  ];
  for (const group of sliding) {
    for (const [dr, dc] of group.dirs) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const p = state.board[rr][cc];
        if (p) {
          if (p.color === enemy && group.types.includes(p.type)) return true;
          break;
        }
        rr += dr; cc += dc;
      }
    }
  }
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr, cc = c + dc;
      if (inside(rr, cc)) {
        const p = state.board[rr][cc];
        if (p && p.color === enemy && p.type === 'K') return true;
      }
    }

  return false;
}

function isKingInCheck(color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (state.board[r][c]?.type === 'K' && state.board[r][c].color === color)
        return isSquareAttacked(r, c, color);
  return false;
}

function legalMoves(r, c) {
  const piece = state.board[r][c];
  if (!piece) return [];
  const moves = validMoves(r, c);
  const legal = [];

  for (const m of moves) {
    const snapshot = cloneBoard(state.board);
    const from = { r, c };
    const to = { r: m.r, c: m.c };
    const movedPiece = snapshot[from.r][from.c];

    if (m.enPassant) {
      const capRow = movedPiece.color === 'w' ? to.r + 1 : to.r - 1;
      snapshot[capRow][to.c] = null;
    }
    if (m.castling) {
      const backRank = movedPiece.color === 'w' ? 7 : 0;
      if (m.castling === 'K') {
        snapshot[backRank][6] = snapshot[backRank][4];
        snapshot[backRank][4] = null;
        snapshot[backRank][5] = snapshot[backRank][7];
        snapshot[backRank][7] = null;
      } else {
        snapshot[backRank][2] = snapshot[backRank][4];
        snapshot[backRank][4] = null;
        snapshot[backRank][3] = snapshot[backRank][0];
        snapshot[backRank][0] = null;
      }
    } else {
      snapshot[to.r][to.c] = movedPiece;
      snapshot[from.r][from.c] = null;
    }
    let kingPos = null;
    for (let rr = 0; rr < 8; rr++)
      for (let cc = 0; cc < 8; cc++)
        if (snapshot[rr][cc] && snapshot[rr][cc].type === 'K' && snapshot[rr][cc].color === movedPiece.color)
          kingPos = { r: rr, c: cc };
    if (!kingPos) continue;
    const realBoard = state.board;
    state.board = snapshot;
    const kingSafe = !isSquareAttacked(kingPos.r, kingPos.c, movedPiece.color);
    state.board = realBoard;
    if (kingSafe && m.castling) {
      const backRank = piece.color === 'w' ? 7 : 0;
      const passSquares = m.castling === 'K' ? [{ r: backRank, c: 5 }, { r: backRank, c: 6 }] : [{ r: backRank, c: 3 }, { r: backRank, c: 2 }];
      let passOk = true;
      for (const sq of passSquares) {
        const realBoard2 = state.board;
        state.board = snapshot;
        if (isSquareAttacked(sq.r, sq.c, piece.color)) passOk = false;
        state.board = realBoard2;
      }
      if (!passOk) continue;
    }

    if (kingSafe) legal.push(m);
  }

  return legal;
}

function onSquareClick(r, c) {
  const cell = state.board[r][c];

  if (state.selected) {
    const from = state.selected;
    const piece = state.board[from.r][from.c];
    if (!piece) { state.selected = null; render(); return; }
    const moves = legalMoves(from.r, from.c);
    const move = moves.find(m => m.r === r && m.c === c);
    if (move) {
      const snapshot = cloneBoard(state.board);
      const captured = state.board[r][c];
      state.enPassant = null;
      if (move.enPassant) {
        const capRow = piece.color === 'w' ? r + 1 : r - 1;
        state.board[capRow][c] = null;
      }
      state.selected = null;

      if (move.castling) {
        const row = piece.color === 'w' ? 7 : 0;
        if (move.castling === 'K') {
          state.board[row][6] = state.board[row][4];
          state.board[row][4] = null;
          state.board[row][5] = state.board[row][7];
          state.board[row][7] = null;
          state.board[row][6].hasMoved = true;
          state.board[row][5].hasMoved = true;
        } else {
          state.board[row][2] = state.board[row][4];
          state.board[row][4] = null;
          state.board[row][3] = state.board[row][0];
          state.board[row][0] = null;
          state.board[row][2].hasMoved = true;
          state.board[row][3].hasMoved = true;
        }
      } else {
        state.board[r][c] = piece;
        state.board[from.r][from.c] = null;
        piece.hasMoved = true;
      }
      if (piece.type === 'P' && Math.abs(r - from.r) === 2) {
        state.enPassant = { r: (r + from.r) / 2, c };
      }
      if (piece.type === 'K') state.castlingRights[piece.color] = { K: false, Q: false };
      if (piece.type === 'R') {
        if (from.c === 0) state.castlingRights[piece.color].Q = false;
        if (from.c === 7) state.castlingRights[piece.color].K = false;
      }
      state.history.push(snapshot);
      log(`${piece.color === 'w' ? '♙ Blanc' : '♟ Noir'} joue ${piece.type} ${String.fromCharCode(65 + from.c)}${8 - from.r} → ${String.fromCharCode(65 + c)}${8 - r}${captured ? ' (x)' : ''}`);
      const sideToMove = state.whiteTurn ? 'b' : 'w';
      if (isCheckmate(sideToMove)) {
        log(`${sideToMove === 'w' ? 'Blanc' : 'Noir'} est en échec et mat !`);
      } else if (isKingInCheck(sideToMove)) {
        log(`${sideToMove === 'w' ? 'Blanc' : 'Noir'} est en échec !`);
      }
      state.whiteTurn = !state.whiteTurn;
    } else {
      if (cell && ((state.whiteTurn && cell.color === 'w') || (!state.whiteTurn && cell.color === 'b'))) {
        state.selected = { r, c };
      } else {
        state.selected = null;
      }
    }
    render();
  } else if (cell && ((state.whiteTurn && cell.color === 'w') || (!state.whiteTurn && cell.color === 'b'))) {
    state.selected = { r, c };
    render();
  }
}

function render() {
  boardEl.innerHTML = '';
  const rows = [...Array(8).keys()];
  const cols = [...Array(8).keys()];
  const rOrder = state.flipped ? rows : [...rows].reverse();
  const cOrder = state.flipped ? [...cols].reverse() : cols;
  for (const r of rOrder) {
    for (const c of cOrder) {
      const cell = state.board[r][c];
      const sq = document.createElement('div');
      sq.className = `square ${(r + c) % 2 === 0 ? 'white' : 'black'}`;
      if (state.selected && state.selected.r === r && state.selected.c === c) sq.classList.add('selected');

      if (state.selected) {
        const moves = legalMoves(state.selected.r, state.selected.c);
        if (moves.some(m => m.r === r && m.c === c)) sq.classList.add('highlight');
      }

      if (cell) {
        const span = document.createElement('span');
        span.textContent = pieceSymbol(cell);
        span.style.color = cell.color === 'w' ? 'white' : 'black';
        span.style.fontSize = '40px';
        sq.appendChild(span);
      }
      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
  turnLabel.textContent = state.whiteTurn ? 'Tour : Blanc' : 'Tour : Noir';
  if (isKingInCheck(state.whiteTurn ? 'w' : 'b')) {
    turnLabel.textContent += ' (Échec !)';
  }
}

function pieceSymbol(p) {
  const symbols = {
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
  };
  return symbols[p.type];
}

function log(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  logEl.prepend(p);
}

resetBtn.addEventListener('click', () => {
  state.board = initBoard();
  state.selected = null;
  state.history = [];
  state.enPassant = null;
  state.whiteTurn = true;
  state.castlingRights = { w: { K: true, Q: true }, b: { K: true, Q: true } };
  render();
  log('Nouvelle partie');
});

const flipBtn = document.getElementById('flipBtn');
flipBtn.addEventListener('click', () => {
  state.flipped = !state.flipped;
  render();
});

function isCheckmate(color) {
  if (!isKingInCheck(color)) return false;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (piece && piece.color === color) {
        if (legalMoves(r, c).length > 0) return false;
      }
    }
  }
  return true;
}

state.board = initBoard();
render();
log('Jeu initialisé');
