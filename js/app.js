
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

      if (!state.board[r + dir][c]) addIf(r + dir, c);

      if (r === startRow && !state.board[r + dir][c] && !state.board[r + 2 * dir][c]) {
        moves.push({ r: r + 2 * dir, c });
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
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const cont = addIf(rr, cc);
          if (!cont) break;
          rr += dr; cc += dc;
        }
      }
      break;

    case 'B':
      for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const cont = addIf(rr, cc);
          if (!cont) break;
          rr += dr; cc += dc;
        }
      }
      break;

    case 'Q':
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const cont = addIf(rr, cc);
          if (!cont) break;
          rr += dr; cc += dc;
        }
      }
      break;

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

      if (!piece.hasMoved && !isKingInCheck(piece.color)) {
        const backRank = piece.color === 'w' ? 7 : 0;

        if (state.castlingRights[piece.color].K &&
          !state.board[backRank][5] && !state.board[backRank][6] &&
          !isSquareAttacked(backRank, 5, piece.color) &&
          !isSquareAttacked(backRank, 6, piece.color)) {
          moves.push({ r: backRank, c: 6, castling: 'K' });
        }
        if (state.castlingRights[piece.color].Q &&
          !state.board[backRank][1] && !state.board[backRank][2] && !state.board[backRank][3] &&
          !isSquareAttacked(backRank, 2, piece.color) &&
          !isSquareAttacked(backRank, 3, piece.color)) {
          moves.push({ r: backRank, c: 2, castling: 'Q' });
        }
      }
      break;
  }

  return moves;
}


function isSquareAttacked(r, c, color) {
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      const p = state.board[i][j];
      if (p && p.color !== color) {
        const mvs = validMoves(i, j);
        if (mvs.some(m => m.r === r && m.c === c)) return true;
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

function onSquareClick(r, c) {
  const cell = state.board[r][c];

  if (state.selected) {
    const from = state.selected;
    const piece = state.board[from.r][from.c];
    const moves = validMoves(from.r, from.c);
    const move = moves.find(m => m.r === r && m.c === c);

    if (move) {
      const snapshot = cloneBoard(state.board);
      const captured = state.board[r][c];
      state.enPassant = null;

      if (move.enPassant) {
        const dir = piece.color === 'w' ? 1 : -1;
        state.board[r + dir][c] = null;
      }

      if (move.castling) {
        const row = piece.color === 'w' ? 7 : 0;
        if (move.castling === 'K') {
          state.board[row][5] = state.board[row][7];
          state.board[row][7] = null;
          state.board[row][5].hasMoved = true;
        } else {
          state.board[row][3] = state.board[row][0];
          state.board[row][0] = null;
          state.board[row][3].hasMoved = true;
        }
      }

      state.board[r][c] = piece;
      state.board[from.r][from.c] = null;
      piece.hasMoved = true;

      if (piece.type === 'P' && Math.abs(r - from.r) === 2)
        state.enPassant = { r: (r + from.r) / 2, c };

      if (piece.type === 'K') state.castlingRights[piece.color] = { K: false, Q: false };
      if (piece.type === 'R') {
        if (from.c === 0) state.castlingRights[piece.color].Q = false;
        if (from.c === 7) state.castlingRights[piece.color].K = false;
      }
      if (isCheckmate(state.whiteTurn ? 'w' : 'b')) {
        log(`${state.whiteTurn ? 'Blanc' : 'Noir'} est en échec et mat !`);
      }

      if (isKingInCheck(piece.color)) {
        state.board = snapshot;
        log('Mouvement illégal (roi en échec)');
      } else {
        state.history.push(snapshot);
        state.whiteTurn = !state.whiteTurn;
        log(`${piece.color === 'w' ? '♙ Blanc' : '♟ Noir'} joue ${piece.type} ${String.fromCharCode(65 + from.c)}${8 - from.r} → ${String.fromCharCode(65 + c)}${8 - r}${captured ? ' (x)' : ''}`);
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
  for (let r = 7; r >= 0; r--) {
    for (let c = 0; c < 8; c++) {
      const cell = state.board[r][c];
      const sq = document.createElement('div');
      sq.className = `square ${(r + c) % 2 === 0 ? 'white' : 'black'}`;
      if (state.selected && state.selected.r === r && state.selected.c === c) sq.classList.add('selected');
      if (state.selected) {
        const moves = validMoves(state.selected.r, state.selected.c);
        if (moves.some(m => m.r === r && m.c === c)) sq.classList.add('highlight');
      }

      if (cell) sq.textContent = pieceSymbol(cell);
      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }   
  turnLabel.textContent = state.whiteTurn ? 'Blanc' : 'Noir';
  if (isKingInCheck(state.whiteTurn ? 'w' : 'b')) {
    turnLabel.textContent += ' Échec !';
  }
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
  state.selected = null;
  state.whiteTurn = true;
  state.history = [];
  state.enPassant = null;
  state.castlingRights = { w: { K: true, Q: true }, b: { K: true, Q: true } };
  render();
  log('Nouvelle partie');
});

function isCheckmate(color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (piece && piece.color === color) {
        if (validMoves(r, c).length > 0) return false;
      }
    }
  }
  return isKingInCheck(color);
}
state.whiteTurn = true;
state.board = initBoard();
render();
log('Jeu initialisé');

