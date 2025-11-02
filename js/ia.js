
const PIECE_VALUE = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000
};

function evaluateBoardSimple(board) {
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      score += p.color === "w" ? PIECE_VALUE[p.type] : -PIECE_VALUE[p.type];
    }
  return score;
}

function allMovesForBoard(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const mvs = legalMoves(r, c, board);
        for (const m of mvs) {
          moves.push({ from: { r, c }, to: m });
        }
      }
    }
  return moves;
}

function applyMoveToBoard(board, move) {
  const nb = cloneBoard(board);
  const piece = nb[move.from.r][move.from.c];

  nb[move.to.r][move.to.c] = piece;
  nb[move.from.r][move.from.c] = null;

  if (piece && piece.type === "P" && (move.to.r === 0 || move.to.r === 7))
    piece.type = "Q";

  return nb;
}

function minimaxBoard(board, depth, maximizingColor, alpha, beta) {
  if (depth === 0) return evaluateBoardSimple(board);

  const moves = allMovesForBoard(board, maximizingColor);
  if (moves.length === 0) return evaluateBoardSimple(board);

  const nextColor = maximizingColor === "w" ? "b" : "w";
  let best = maximizingColor === "w" ? -Infinity : Infinity;

  if (maximizingColor === "w") {
    for (const m of moves) {
      const nb = applyMoveToBoard(board, m);
      const eval_ = minimaxBoard(nb, depth - 1, nextColor, alpha, beta);
      best = Math.max(best, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
  } else {
    for (const m of moves) {
      const nb = applyMoveToBoard(board, m);
      const eval_ = minimaxBoard(nb, depth - 1, nextColor, alpha, beta);
      best = Math.min(best, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
  }

  return best;
}

function chooseBestMove() {
  const color = "b";
  const moves = allMovesForBoard(state.board, color);
  let bestMove = null;
  let bestScore = Infinity;

  for (const m of moves) {
    const nb = applyMoveToBoard(state.board, m);
    const score = minimaxBoard(nb, state.aiDepth, "w", -Infinity, Infinity);
    if (score < bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return bestMove;
}

function maybePlayAI() {
  if (!state.aiEnabled || state.whiteTurn) return;

  const best = chooseBestMove();
  if (!best) return;

  movePiece(best.from, best.to);
  render();
}

function isSquareAttacked(board, tr, tc, byColor) {
    function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    const pawnDir = byColor === 'w' ? -1 : 1;
    for (const dc of [-1, 1]) {
        const pr = tr - pawnDir;
        const pc = tc + dc;
        if (inBounds(pr, pc)) {
            const p = board[pr][pc];
            if (p && p.type === 'P' && p.color === byColor) return true;
        }
    }

    const knightD = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for (const [dr,dc] of knightD) {
        const r = tr + dr, c = tc + dc;
        if (!inBounds(r,c)) continue;
        const p = board[r][c];
        if (p && p.color === byColor && p.type === 'N') return true;
    }

    const straightDirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dr,dc] of straightDirs) {
        for (let i = 1; i < 8; i++) {
            const r = tr + dr*i, c = tc + dc*i;
            if (!inBounds(r,c)) break;
            const p = board[r][c];
            if (!p) continue;
            if (p.color !== byColor) break;
            if (p.type === 'R' || p.type === 'Q') return true;
            break;
        }
    }

    const diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr,dc] of diagDirs) {
        for (let i = 1; i < 8; i++) {
            const r = tr + dr*i, c = tc + dc*i;
            if (!inBounds(r,c)) break;
            const p = board[r][c];
            if (!p) continue;
            if (p.color !== byColor) break;
            if (p.type === 'B' || p.type === 'Q') return true;
            break;
        }
    }

    for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
            if (!(dr === 0 && dc === 0)) {
                const r = tr + dr, c = tc + dc;
                if (!inBounds(r,c)) continue;
                const p = board[r][c];
                if (p && p.color === byColor && p.type === 'K') return true;
            }

    return false;
}

window.isSquareAttacked = isSquareAttacked;