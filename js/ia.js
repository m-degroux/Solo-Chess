const PIECE_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

function evaluateBoardSimple(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUE[p.type] || 0;
      score += p.color === "w" ? val : -val;
    }
  }
  return score;
}

function cloneBoardLocal(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function allMovesForBoard(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const mvs = legalMovesLocal(r, c, board, color);
        for (const m of mvs) moves.push({ from: { r, c }, to: m });
      }
    }
  }
  return moves;
}

function legalMovesLocal(r, c, board) {
  const p = board[r][c];
  if (!p) return [];
  const moves = [];
  const dir = p.color === 'w' ? -1 : 1;
  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function add(r2, c2) {
    if (!inBounds(r2, c2)) return false;
    const target = board[r2][c2];
    if (!target) { moves.push({ r: r2, c: c2 }); return true; }
    if (target.color !== p.color) moves.push({ r: r2, c: c2 });
    return false;
  }

  if (p.type === "P") {
    const nr = r + dir;
    const nr2 = r + 2 * dir;
    const startRow = p.color === "w" ? 6 : 1;
    if (inBounds(nr, c) && !board[nr][c]) {
      moves.push({ r: nr, c });
      if (r === startRow && inBounds(nr2, c) && !board[nr2][c]) moves.push({ r: nr2, c });
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir, tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color !== p.color) moves.push({ r: tr, c: tc });
    }
  }
if (p.type === "N") {
    const d = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for (const [dr, dc] of d) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== p.color))
        moves.push({ r: nr, c: nc });
    }
  }

  if (p.type === "B" || p.type === "R" || p.type === "Q") {
    const dirs = [];
    if (p.type !== "R") dirs.push(...[[1,1],[1,-1],[-1,1],[-1,-1]]);
    if (p.type !== "B") dirs.push(...[[1,0],[-1,0],[0,1],[0,-1]]);
    for (const [dr, dc] of dirs)
      for (let i = 1; i < 8; i++) if (!add(r + dr * i, c + dc * i)) break;
  }

  if (p.type === "K") {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (dr || dc) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== p.color))
            moves.push({ r: nr, c: nc });
        }
  }

  return moves;
}

function applyMoveToBoard(board, move) {
  const nb = cloneBoardLocal(board);
  const piece = nb[move.from.r][move.from.c];
  nb[move.to.r][move.to.c] = piece ? { ...piece } : null;
  nb[move.from.r][move.from.c] = null;
  if (piece && piece.type === "P" && (move.to.r === 0 || move.to.r === 7))
    nb[move.to.r][move.to.c].type = "Q";
  return nb;
}

function minimaxBoard(board, depth, maximizingColor, alpha, beta) {
  if (depth === 0) return evaluateBoardSimple(board);
  const moves = allMovesForBoard(board, maximizingColor);
  if (moves.length === 0) return evaluateBoardSimple(board);

  const nextColor = maximizingColor === "w" ? "b" : "w";
  let bestEval = maximizingColor === "w" ? -Infinity : Infinity;

  if (maximizingColor === "w") {
    for (const m of moves) {
      const nb = applyMoveToBoard(board, m);
      const eval_ = minimaxBoard(nb, depth - 1, nextColor, alpha, beta);
      bestEval = Math.max(bestEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
  } else {
    for (const m of moves) {
      const nb = applyMoveToBoard(board, m);
      const eval_ = minimaxBoard(nb, depth - 1, nextColor, alpha, beta);
      bestEval = Math.min(bestEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
  }
  return bestEval;
}

function chooseBestMove() {
  const color = "b";
  const moves = allMovesForBoard(state.board, color);
  let bestMove = null;
  let bestScore = Infinity;

  for (const m of moves) {
    const newBoard = applyMoveToBoard(state.board, m);
    const score = minimaxBoard(newBoard, state.aiDepth, "w", -Infinity, Infinity);
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
