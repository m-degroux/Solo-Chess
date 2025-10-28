
const state = {
  board: [],
  whiteTurn: true,
  selected: null,
  flipped: false,
};

const boardEl = document.getElementById("board");
const turnLabel = document.getElementById("turnLabel");

function initBoard() {
  const setup = [
    ["R","N","B","Q","K","B","N","R"],
    ["P","P","P","P","P","P","P","P"],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ["p","p","p","p","p","p","p","p"],
    ["r","n","b","q","k","b","n","r"]
  ];

  state.board = setup.map(row =>
    row.map(ch => ch ? { type: ch.toUpperCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' } : null)
  );
  render();
}

function resetGame() {
  state.whiteTurn = true;
  state.selected = null;
  initBoard();
  log("Nouvelle partie !");
}

document.getElementById("resetBtn").onclick = resetGame;

function render() {
  boardEl.innerHTML = "";
  const rOrder = state.flipped ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
  const cOrder = state.flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  for (let r of rOrder) {
    for (let c of cOrder) {
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
      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }
  boardEl.onclick = (ev) => {
    const sq = ev.target.closest('.square');
    if (!sq) return;
    const r = Number(sq.dataset.r);
    const c = Number(sq.dataset.c);
    onSquareClick(r, c);
  };

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
      setTimeout(() => maybePlayAI(), 400);
      return;
    }
  }
  if (piece && ((state.whiteTurn && piece.color === 'w') || (!state.whiteTurn && piece.color === 'b'))) {
    state.selected = { r, c };
    highlightMoves(legalMoves(r, c));
  }
}

function highlightMoves(moves) {
  document.querySelectorAll(".square").forEach(el => el.classList.remove("highlight"));
  for (const m of moves) {
    const sq = document.querySelector(`.square[data-r='${m.r}'][data-c='${m.c}']`);
    if (sq) sq.classList.add("highlight");
  }
}

function movePiece(from, to) {
  const piece = state.board[from.r][from.c];
  state.board[to.r][to.c] = piece;
  state.board[from.r][from.c] = null;
  state.whiteTurn = !state.whiteTurn;
  log(`${piece.color === 'w' ? 'Blanc' : 'Noir'} joue ${piece.type} en ${String.fromCharCode(97 + to.c)}${8 - to.r}`);
}

function log(msg) {
  const el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

function legalMoves(r, c) {
  const p = state.board[r][c];
  if (!p) return [];
  const moves = [];
  const dir = p.color === 'w' ? -1 : 1;

  function add(r2, c2) {
    if (!inBounds(r2, c2)) return false;
    const target = state.board[r2][c2];
    if (!target) {
      moves.push({ r: r2, c: c2 });
      return true;
    } else if (target.color !== p.color) {
      moves.push({ r: r2, c: c2 });
      return false;
    }
    return false;
  }

  if (p.type === 'P') {
    if (!state.board[r + dir]?.[c]) moves.push({ r: r + dir, c });
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (inBounds(nr, nc) && state.board[nr][nc] && state.board[nr][nc].color !== p.color)
        moves.push({ r: nr, c: nc });
    }
  }

  if (p.type === 'N') {
    const d = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for (const [dr,dc] of d) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && (!state.board[nr][nc] || state.board[nr][nc].color !== p.color))
        moves.push({ r: nr, c: nc });
    }
  }

  if (p.type === 'B' || p.type === 'R' || p.type === 'Q') {
    const dirs = [];
    if (p.type === 'B' || p.type === 'Q') dirs.push(...[[1,1],[1,-1],[-1,1],[-1,-1]]);
    if (p.type === 'R' || p.type === 'Q') dirs.push(...[[1,0],[-1,0],[0,1],[0,-1]]);
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (!add(nr, nc)) break;
      }
    }
  }

  if (p.type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr || dc) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && (!state.board[nr][nc] || state.board[nr][nc].color !== p.color))
            moves.push({ r: nr, c: nc });
        }
      }
    }
  }

  return moves;
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

window.addEventListener('DOMContentLoaded', () => {
  initBoard();
});