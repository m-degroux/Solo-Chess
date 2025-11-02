const state = {
  board: [],
  whiteTurn: true,
  selected: null,
  flipped: false,
  aiEnabled: false,
  aiDepth: 2,
  enPassant: null,
  moved: {},
  history: [],
  moveCount: 0
};

let boardEl, turnLabel;

function log(msg) {
  const el = document.getElementById("log");
  el.innerHTML += msg + "<br>";
  el.scrollTop = el.scrollHeight;
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Initialisation
function initBoard() {
  const setup = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"]
  ];

  state.board = setup.map(row => row.map(ch =>
    ch ? { type: ch.toUpperCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' } : null
  ));

  state.whiteTurn = true;
  state.selected = null;
  state.enPassant = null;
  state.moved = {};
  state.history = [];
  state.moveCount = 0;

  render();
  log("Nouvelle partie !");
}

// Rendu du plateau
function render() {
  boardEl.innerHTML = "";

  const rows = [...Array(8).keys()];
  const cols = [...Array(8).keys()];
  const rOrder = state.flipped ? rows.slice().reverse() : rows;
  const cOrder = state.flipped ? cols.slice().reverse() : cols;

  const inCheck = isKingInCheck(state.whiteTurn ? "w" : "b");
  const checkmate = inCheck && isCheckmate(state.whiteTurn ? "w" : "b");

  for (let ri = 0; ri < 8; ri++) {
    for (let ci = 0; ci < 8; ci++) {

      const r = rOrder[ri];
      const c = cOrder[ci];

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

      if (piece && piece.type === "K" && piece.color === (state.whiteTurn ? "w" : "b")) {
        if (inCheck) sq.style.border = checkmate ? "4px solid black" : "4px solid red";
      }

      if (state.selected && state.selected.r === r && state.selected.c === c) {
        sq.classList.add("selected");
      }

      sq.addEventListener("click", () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }

  if (state.selected) {
    const moves = legalMoves(state.selected.r, state.selected.c);
    highlightMoves(moves);
  }

  turnLabel.textContent = state.whiteTurn ? "Blanc" : "Noir";
}

// Click sur une case
function onSquareClick(r, c) {
  const piece = state.board[r][c];

  if (state.selected) {
    const moves = legalMoves(state.selected.r, state.selected.c);
    const choice = moves.find(m => m.r === r && m.c === c);

    if (choice) {
      movePiece(state.selected, choice);
      state.selected = null;
      render();
      setTimeout(maybePlayAI, 50);
      return;
    }

    state.selected = null;
    render();
    return;
  }

  // Sélection d'une pièce
  if (piece && piece.color === (state.whiteTurn ? "w" : "b")) {
    state.selected = { r, c };
    render();
  }
}

// Highlight des coups
function highlightMoves(moves) {
  document.querySelectorAll(".square").forEach(sq =>
    sq.classList.remove("highlight")
  );

  for (const m of moves) {
    const sq = document.querySelector(
      `.square[data-r='${m.r}'][data-c='${m.c}']`
    );
    if (sq) sq.classList.add("highlight");
  }
}

function legalMoves(r, c, board = state.board) {
  const p = board[r][c];
  if (!p) return [];

  const moves = [];
  const dir = p.color === "w" ? -1 : 1;

  function add(r2, c2) {
    if (!inBounds(r2, c2)) return false;
    const t = board[r2][c2];
    if (!t) { moves.push({ r: r2, c: c2 }); return true; }
    if (t.color !== p.color) moves.push({ r: r2, c: c2 });
    return false;
  }

  // Pion
  if (p.type === "P") {
    const nr = r + dir;
    const nr2 = r + 2 * dir;
    const startRow = p.color === "w" ? 6 : 1;
    if (inBounds(nr, c) && !board[nr][c]) {
      moves.push({ r: nr, c });
      if (r === startRow && inBounds(nr2, c) && !board[nr2][c]) {
        moves.push({ r: nr2, c });
      }
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const target = board[tr][tc];
      if (target && target.color !== p.color) {
        moves.push({ r: tr, c: tc });
      }
    }
  }

  // Cavalier
  if (p.type === "N") {
    const d = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
    for (const [dr, dc] of d) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== p.color))
        moves.push({ r: nr, c: nc });
    }
  }

  // Fou, Tour, Dame
  if (["B", "R", "Q"].includes(p.type)) {
    const dirs = [];
    if (p.type !== "R") dirs.push(...[[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    if (p.type !== "B") dirs.push(...[[1, 0], [-1, 0], [0, 1], [0, -1]]);
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        if (!add(r + dr * i, c + dc * i)) break;
      }
    }
  }

  // Roi + Roque
  if (p.type === "K") {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (dr || dc) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) &&
            (!board[nr][nc] || board[nr][nc].color !== p.color))
            moves.push({ r: nr, c: nc });
        }

    const keyK = p.color + "K" + r + c;

    if (!state.moved[keyK]) {
      // Roque roi
      const rookKR = p.color + "R" + r + 7;
      if (!state.moved[rookKR] && !board[r][c + 1] && !board[r][c + 2])
        moves.push({ r, c: c + 2, castle: "king" });

      // Roque dame
      const rookQR = p.color + "R" + r + 0;
      if (!state.moved[rookQR] && !board[r][c - 1] && !board[r][c - 2] && !board[r][c - 3])
        moves.push({ r, c: c - 2, castle: "queen" });
    }
  }
  // EN PASSANT
  if (state.enPassant) {
    if (state.enPassant.r === r + dir && Math.abs(state.enPassant.c - c) === 1) {
      const target = board[r][state.enPassant.c];
      if (target && target.type === "P" && target.color !== p.color) {
        moves.push({ r: state.enPassant.r, c: state.enPassant.c, enPassant: true });
      }
    }
  }

  return moves.filter(m => !wouldCauseCheck(r, c, m.r, m.c, board));
}

function movePiece(from, to) {
  const piece = state.board[from.r][from.c];
  if (!piece) return;

  // Pion
  if (piece.type === "P" && to.enPassant) {
    const capturedRow = from.r;
    const capturedCol = to.c;
    const captured = state.board[capturedRow][capturedCol];
    if (captured && captured.type === "P" && captured.color !== piece.color) {
      state.board[capturedRow][capturedCol] = null;
      log(`Capture en passant supprimée : ${captured.color} Pion en ${capturedRow},${capturedCol}`);
    } else {
      return;
    }
  }

  // Roque 
  if (piece.type === "K" && Math.abs(to.c - from.c) === 2) {
    if (to.c > from.c) {
      const rook = state.board[from.r][7];
      state.board[from.r][5] = rook;
      state.board[from.r][7] = null;
      log(`Petit roque du roi ${piece.color}`);
    } else {
      const rook = state.board[from.r][0];
      state.board[from.r][3] = rook;
      state.board[from.r][0] = null;
      log(`Grand roque du roi ${piece.color}`);
    }
  }

  // Déplacement principal
  state.board[to.r][to.c] = piece;
  state.board[from.r][from.c] = null;

  // Promotion automatique
  if (piece.type === "P" && (to.r === 0 || to.r === 7)) {
    piece.type = "Q";
    log(`Promotion automatique en Q en ${to.r},${to.c}`);
  }

  state.enPassant = null;

  if (piece.type === "P" && Math.abs(to.r - from.r) === 2) {
    state.enPassant = { r: (from.r + to.r) / 2, c: from.c, pawnColor: piece.color };
  }

  const movedKey = piece.color + piece.type + from.r + from.c;
  state.moved[movedKey] = true;

  state.whiteTurn = !state.whiteTurn;
}

function wouldCauseCheck(r1, c1, r2, c2, board = state.board) {
  const nb = cloneBoard(board);
  const p = nb[r1][c1];

  nb[r2][c2] = p;
  nb[r1][c1] = null;

  // Gestion du roque
  if (p.type === "K" && Math.abs(c2 - c1) === 2) {
    if (c2 > c1) {
      nb[r1][5] = nb[r1][7];
      nb[r1][7] = null;
    } else {
      nb[r1][3] = nb[r1][0];
      nb[r1][0] = null;
    }
  }

  return isKingInCheck(p.color, nb);
}

function isKingInCheck(color, board = state.board) {
  let kr = -1, kc = -1;

  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.color === color) {
        kr = r;
        kc = c;
      }
    }

  if (kr === -1) return false;

  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kr, kc, enemy);
}

function isCheckmate(color) {
  if (!isKingInCheck(color)) return false;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (state.board[r][c]?.color === color)
        if (legalMoves(r, c).length > 0)
          return false;
  return true;
}

window.addEventListener("DOMContentLoaded", () => {
  boardEl = document.getElementById("board");
  turnLabel = document.getElementById("turnLabel");

  initBoard();

  document.getElementById("resetBtn").onclick = initBoard;

  document.getElementById("flipBtn").onclick = () => {
    state.flipped = !state.flipped;
    render();
  };

  const controls = document.querySelector(".controls");
  const aiBtn = document.createElement("button");
  aiBtn.className = "btn btn-sm btn-outline-primary";
  aiBtn.textContent = "Activer IA";
  aiBtn.onclick = () => {
    state.aiEnabled = !state.aiEnabled;
    aiBtn.textContent = state.aiEnabled ? "Désactiver IA" : "Activer IA";
  };
  controls.appendChild(aiBtn);
});
