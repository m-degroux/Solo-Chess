const boardEl = document.getElementById('board');
const logEl = document.getElementById('log');
const turnLabel = document.getElementById('turnLabel');
const resetBtn = document.getElementById('resetBtn');

const state = {
  board: [],
  selected: null,
  whiteTurn: true,
  history: []
};

function cloneBoard(b) {
  return b.map(r => r.map(c => (c ? { ...c } : null)));
}

function inside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function initBoard() {
  const p = (type, color) => ({ type, color });
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
  const dirs = [];
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
      if (!state.board[r + dir][c]) addIf(r + dir, c);
      if ((piece.color === 'w' && r === 6) || (piece.color === 'b' && r === 1)) {
        if (!state.board[r + dir][c] && !state.board[r + 2 * dir][c])
          addIf(r + 2 * dir, c);
      }
      for (const dc of [-1, 1]) {
        const rr = r + dir, cc = c + dc;
        if (inside(rr, cc) && state.board[rr][cc] && state.board[rr][cc].color !== piece.color) {
          moves.push({ r: rr, c: cc });
        }
      }
      break;
    }
    case 'R': dirs.push([1,0],[-1,0],[0,1],[0,-1]); break;
    case 'B': dirs.push([1,1],[1,-1],[-1,1],[-1,-1]); break;
    case 'Q': dirs.push([1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]); break;
    case 'N':
      for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) {
        const rr = r + dr, cc = c + dc;
        if (inside(rr, cc) && (!state.board[rr][cc] || state.board[rr][cc].color !== piece.color))
          moves.push({ r: rr, c: cc });
      }
      break;
    case 'K':
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr || dc) addIf(r + dr, c + dc);
      break;
  }

  for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (inside(rr, cc)) {
      const cont = addIf(rr, cc);
      if (!cont) break;
      rr += dr;
      cc += dc;
    }
  }

  return moves;
}

function isKingInCheck(color, board = state.board) {
  let kingPos = null;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'K' && board[r][c].color === color)
        kingPos = { r, c };

  if (!kingPos) return false;

  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color !== color) {
        const mvs = validMoves(r, c);
        if (mvs.some(m => m.r === kingPos.r && m.c === kingPos.c))
          return true;
      }
    }

  return false;
}

function onSquareClick(r, c) {
  const cell = state.board[r][c];

  if (state.selected) {
    const from = state.selected;
    const piece = state.board[from.r][from.c];
    const moves = validMoves(from.r, from.c);
    const isValid = moves.some(m => m.r === r && m.c === c);

    if (isValid) {
      const snapshot = cloneBoard(state.board);
      const captured = state.board[r][c];
      state.board[r][c] = piece;
      state.board[from.r][from.c] = null;
      if (isKingInCheck(piece.color)) {
        state.board = snapshot;
        log('Mouvement illégal : roi en échec');
      } else {
        state.history.push(snapshot);
        state.whiteTurn = !state.whiteTurn;
        log(`${piece.color === 'w' ? 'Blanc' : 'Noir'} déplace ${piece.type} ${String.fromCharCode(65 + from.c)}${8 - from.r} → ${String.fromCharCode(65 + c)}${8 - r}${captured ? ' (x)' : ''}`);
      }
    }

    state.selected = null;
    render();
  } else if (cell && ((state.whiteTurn && cell.color === 'w') || (!state.whiteTurn && cell.color === 'b'))) {
    state.selected = { r, c };
    render();
  }
}

function render() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = state.board[r][c];
      const sq = document.createElement('div');
      sq.className = `square ${(r + c) % 2 === 0 ? 'white' : 'black'}`;
      if (state.selected && state.selected.r === r && state.selected.c === c) sq.classList.add('selected');
      if (cell) sq.textContent = pieceSymbol(cell);
      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }

  turnLabel.textContent = state.whiteTurn ? 'Blanc' : 'Noir';
}

function pieceSymbol(p) {
  const sym = {
    'Pw': '♙', 'Rw': '♖', 'Nw': '♘', 'Bw': '♗', 'Qw': '♕', 'Kw': '♔',
    'Pb': '♟', 'Rb': '♜', 'Nb': '♞', 'Bb': '♝', 'Qb': '♛', 'Kb': '♚'
  };
  return sym[p.type + p.color];
}

function log(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  logEl.prepend(p);
}

resetBtn.addEventListener('click', () => {
  state.board = initBoard();
  state.history = [];
  state.selected = null;
  state.whiteTurn = true;
  render();
  log('Nouvelle partie');
});

state.board = initBoard();
render();
log('Jeu initialisé');
