const state = {
  board: [],
  whiteTurn: true,
  selected: null,
  flipped: false,
  aiEnabled: false,
  aiDepth: 2,
  playerColor: 'w',
  enPassant: null,
  moved: {},
  history: [],
  moveCount: 0
};

let boardEl, turnLabel;

function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}
function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}
function log(msg) {
  const el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

function initBoard() {
  const setup = [
    ["r","n","b","q","k","b","n","r"],
    ["p","p","p","p","p","p","p","p"],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ["P","P","P","P","P","P","P","P"],
    ["R","N","B","Q","K","B","N","R"]
  ];
  state.board = setup.map(row => row.map(ch => ch ? { type: ch.toUpperCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' } : null));
  state.whiteTurn = true;
  state.selected = null;
  state.enPassant = null;
  state.moved = {};
  state.history = [];
  state.moveCount = 0;
  render();
  log("Nouvelle partie !");
}

function render() {
  boardEl.innerHTML = "";
  const rows = [...Array(8).keys()];
  const cols = [...Array(8).keys()];
  const rOrder = state.flipped ? [...rows].reverse() : rows;
  const cOrder = state.flipped ? [...cols].reverse() : cols;

  const inCheck = isKingInCheck(state.whiteTurn ? 'w' : 'b');
  const checkmate = inCheck && isCheckmate(state.whiteTurn ? 'w' : 'b');

  for (let rIdx = 0; rIdx < 8; rIdx++) {
    for (let cIdx = 0; cIdx < 8; cIdx++) {
      const r = rOrder[rIdx];
      const c = cOrder[cIdx];
      const sq = document.createElement("div");
      sq.className = `square ${(r + c) % 2 === 0 ? "light" : "dark"}`;
      sq.dataset.r = r;
      sq.dataset.c = c;

      const piece = state.board[r][c];
      if (piece) {
        const img = document.createElement("img");
        img.className = "piece";
        img.src = `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${piece.color}${piece.type.toLowerCase()}.png`;
        sq.appendChild(img);
      }
      if (state.selected && state.selected.r === r && state.selected.c === c)
        sq.classList.add("selected");
      if (piece && piece.type === "K" && piece.color === (state.whiteTurn ? 'w' : 'b')) {
        if (inCheck) sq.style.border  = checkmate ? "4px solid black" : "4px solid red";
      }

      sq.addEventListener("click", () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
  if (state.selected) highlightMoves(legalMoves(state.selected.r, state.selected.c));

  turnLabel.textContent = state.whiteTurn ? "Blanc" : "Noir";
}

function onSquareClick(r, c) {
  const piece = state.board[r][c];

  if (state.selected) {
    const moves = legalMoves(state.selected.r, state.selected.c);
    const chosen = moves.find(m => m.r === r && m.c === c);
    if (chosen) {
      movePiece(state.selected, chosen);
      state.selected = null;
      render();
      setTimeout(() => maybePlayAI(), 100);
      return;
    }
    state.selected = null;
    render();
    return;
  }
  if (piece && ((state.whiteTurn && piece.color === 'w') || (!state.whiteTurn && piece.color === 'b'))) {
    state.selected = { r, c };
    render();
  }
}

function highlightMoves(moves) {
  document.querySelectorAll(".square").forEach(el => el.classList.remove("highlight"));
  for (const m of moves) {
    const sq = document.querySelector(`.square[data-r='${m.r}'][data-c='${m.c}']`);
    if (sq) sq.classList.add("highlight");
  }
}
function legalMoves(r, c, board = state.board) {
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
  if (p.type === 'P') {
    const nr = r + dir;
    const nr2 = r + 2 * dir;
    const startRow = p.color === 'w' ? 6 : 1;
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
if (state.enPassant) {
      const ep = state.enPassant;
      if (ep.r === r + dir && Math.abs(ep.c - c) === 1 && ep.color !== p.color) {
        moves.push({ r: ep.r, c: ep.c, enPassant: true });
      }
    }
  }

  if (p.type === 'N') {
    const d = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for (const [dr,dc] of d) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr,nc) && (!board[nr][nc] || board[nr][nc].color !== p.color))
        moves.push({ r: nr, c: nc });
    }
  }


  if (p.type === 'B' || p.type === 'R' || p.type === 'Q') {
    const dirs = [];
    if (p.type !== 'R') dirs.push(...[[1,1],[1,-1],[-1,1],[-1,-1]]);
    if (p.type !== 'B') dirs.push(...[[1,0],[-1,0],[0,1],[0,-1]]);
    for (const [dr,dc] of dirs) {
      for (let i=1;i<8;i++) {
        const nr = r + dr*i, nc = c + dc*i;
        if (!inBounds(nr,nc)) break;
        if (!add(nr,nc)) break;
      }
    }
  }

  if (p.type === 'K') {

    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
      if (dr===0 && dc===0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== p.color))
        moves.push({ r: nr, c: nc });
    }
const kingKey = p.color + "K" + r + c;

    if (!state.moved[kingKey]) {

      const rookKeyK = p.color + "R" + r + 7;
      if (!state.moved[rookKeyK] && !board[r][c+1] && !board[r][c+2]) {
moves.push({ r: r, c: c+2, castle: 'king' });
      }
      const rookKeyQ = p.color + "R" + r + 0;
      if (!state.moved[rookKeyQ] && !board[r][c-1] && !board[r][c-2] && !board[r][c-3]) {
        moves.push({ r: r, c: c-2, castle: 'queen' });
      }
    }
  }
 return moves.filter(m => !wouldCauseCheck(r, c, m.r, m.c, board));
}


function isKingInCheck(color, board = state.board) {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "K" && p.color === color) {
        kr = r; 
        kc = c;
        break;
      }
    }
    if (kr !== -1) break;
  }
  if (kr === -1) return false; 
  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kr, kc, enemy);
}

function wouldCauseCheck(r1,c1,r2,c2) {
  const newBoard = cloneBoard(state.board);
  const piece = newBoard[r1][c1];
  newBoard[r2][c2] = piece;
  newBoard[r1][c1] = null;
  return isKingInCheck(piece.color, newBoard);
}

function isCheckmate(color) {
  if (!isKingInCheck(color)) return false;
  for (let r=0;r<8;r++)
    for (let c=0;c<8;c++)
      if (state.board[r][c]?.color === color) {
        const moves = legalMoves(r,c);
        if (moves.length>0) return false;
      }
  return true;
}

window.addEventListener("DOMContentLoaded", ()=>{
  boardEl = document.getElementById("board");
  turnLabel = document.getElementById("turnLabel");
  initBoard();

  document.getElementById("resetBtn").onclick = initBoard;
  document.getElementById("flipBtn").onclick = ()=>{ state.flipped=!state.flipped; render(); };

  const controls=document.querySelector(".controls");
  const aiToggle=document.createElement("button");
  aiToggle.id="aiToggle";
  aiToggle.className="btn btn-sm btn-outline-primary";
  aiToggle.textContent="Activer IA";
  aiToggle.onclick=()=>{
    state.aiEnabled=!state.aiEnabled;
    aiToggle.textContent=state.aiEnabled?"Désactiver IA":"Activer IA";
    aiToggle.classList.toggle("btn-primary",state.aiEnabled);
  };
  controls.appendChild(aiToggle);
});



function isSquareAttacked(board, tr, tc, byColor) {
  function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }

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
    for (let i=1;i<8;i++) {
      const r = tr + dr*i, c = tc + dc*i;
      if (!inBounds(r,c)) break;
      const p = board[r][c];
      if (!p) continue;
      if (p.color !== byColor) break;
      if (p.color === byColor && (p.type === 'R' || p.type === 'Q')) return true;
      break;
    }
  }

  const diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const [dr,dc] of diagDirs) {
    for (let i=1;i<8;i++) {
      const r = tr + dr*i, c = tc + dc*i;
      if (!inBounds(r,c)) break;
      const p = board[r][c];
      if (!p) continue;
      if (p.color !== byColor) break;
      if (p.color === byColor && (p.type === 'B' || p.type === 'Q')) return true;
      break;
    }
  }

  for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
    if (dr===0 && dc===0) continue;
    const r = tr + dr, c = tc + dc;
    if (!inBounds(r,c)) continue;
    const p = board[r][c];
    if (p && p.color === byColor && p.type === 'K') return true;
  }

  return false;
}

function isKingInCheck(color, board = state.board) {
  let kr = -1, kc = -1;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c];
    if (p && p.type === 'K' && p.color === color) { kr = r; kc = c; break; }
  }
  if (kr === -1) return false; 
  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kr, kc, enemy);
}

function wouldCauseCheck(r1, c1, r2, c2, board = state.board) {
  const newBoard = cloneBoard(board);
  const piece = newBoard[r1][c1];
  if (!piece) return false;
 const wasDestinationEmpty = !board[r2][c2];
  newBoard[r2][c2] = piece ? { ...piece } : null;
  newBoard[r1][c1] = null;
if (piece.type === 'P' && c1 !== c2 && wasDestinationEmpty) {
    newBoard[r1][c2] = null;
  }
    if (piece.type === 'K' && Math.abs(c2 - c1) === 2) {
    const row = r1;
    if (c2 > c1) {
      const rook = newBoard[row][7];
      newBoard[row][5] = rook ? { ...rook } : null;
      newBoard[row][7] = null;
    } else {

      const rook = newBoard[row][0];
      newBoard[row][3] = rook ? { ...rook } : null;
      newBoard[row][0] = null;
    }
  }
return isKingInCheck(piece.color, newBoard);
}

function allMovesForBoard(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
const mvs = legalMoves(r, c, board);
        for (const m of mvs) moves.push({ from: { r, c }, to: m });
      }
    }
  }
  return moves;
}


function movePiece(from, to) {
  if (!from || !to) return;

  const piece = state.board[from.r][from.c];
  if (!piece) return;
  if (piece.type === "P" && state.enPassant &&
      to.r === state.enPassant.r && to.c === state.enPassant.c) {
    const dir = piece.color === "w" ? 1 : -1;
    state.board[to.r + dir][to.c] = null;
  }

  if (piece.type === "K" && Math.abs(to.c - from.c) === 2) {
    if (to.c === 6) {
      const rook = state.board[from.r][7];
      state.board[from.r][5] = rook;
      state.board[from.r][7] = null;
    }
    if (to.c === 2) {
      const rook = state.board[from.r][0];
      state.board[from.r][3] = rook;
      state.board[from.r][0] = null;
    }
  }

  state.board[to.r][to.c] = piece;
  state.board[from.r][from.c] = null;
  if (piece.type === "P" && (to.r === 0 || to.r === 7)) {
    piece.type = "Q";
  }
  state.enPassant = null;
  if (piece.type === "P" && Math.abs(to.r - from.r) === 2) {
    state.enPassant = {
      r: (from.r + to.r) / 2,
      c: from.c,
      color: piece.color
    };
  }
  const key = piece.color + piece.type + from.r + from.c;
  state.moved[key] = true;
  state.whiteTurn = !state.whiteTurn;
}

function maybePlayAI() {
  if (!state.aiEnabled) return;
  if (state.whiteTurn) return;

  const best = chooseBestMove();
  if (!best) return;

  movePiece(best.from, best.to);
  render();
}


