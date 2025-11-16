# Solo-Chess ♟️

Solo-Chess est un jeu d’échecs où le but est de mettre le roi adverse en échec et mat, c’est-à-dire de le placer dans une situation où il ne peut plus échapper à la capture. Ce projet est développé en JavaScript, HTML et CSS et est jouable directement depuis votre navigateur.

## Git page

Pour [jouer](https://m-degroux.github.io/Solo-Chess/).


## Fonctionnalités

- Échiquier interactif en HTML/CSS
- Déplacements légaux selon les règles classiques des échecs
- Chaque coup peut capturer une pièce adverse
- Détection de l’échec et des cases attaquées
- Système basique d’IA pour jouer contre un adversaire virtuel
- Possibilité d’augmenter la difficulté de l’IA
- Changement des couleurs de l’échiquier
- Interface simple et responsive


## Règles du jeu

1) Objectif du jeu : mettre le roi adverse en échec et mat.

2) Déplacement des pièces :

    - Roi : une case dans toutes les directions

    - Reine : en diagonale, horizontale et verticale, autant de cases que possible

    - Tour : en ligne droite horizontalement ou verticalement

    - Fou : en diagonale

    - Cavalier : en “L” (deux cases dans une direction + une case perpendiculaire)

    - Pion : une case en avant, capture en diagonale

3) Échec : le roi est menacé de capture. Le joueur doit protéger son roi au prochain coup.

4) Échec et mat : le roi est menacé et aucun mouvement légal ne permet d’éviter la capture. Le joueur perd la partie.

5) Promotion : lorsqu’un pion atteint la dernière rangée, il peut être transformé en une autre pièce (reine, tour, fou ou cavalier).

6) Roque : déplacement spécial impliquant le roi et la tour pour sécuriser le roi et activer la tour.

7) Prise en passant : capture spéciale d’un pion qui vient de se déplacer de deux cases.
