/* ============================================================
   config.js — Constantes & état global
   ============================================================ */

const TAILLE_GRILLE = 8;
const TYPES_UNITES = {
  S: { nom: 'Soldat',   icone: 'fa-helmet-safety', force: 3, deplacement: 1 },
  C: { nom: 'Cavalier', icone: 'fa-horse',          force: 2, deplacement: 2 },
  T: { nom: 'Tank',     icone: 'fa-shield-halved',  force: 5, deplacement: 1 }
};

const TYPES_CASES = {
  NEUTRE: 'neutral',
  J1:     'j1',
  J2:     'j2',
  BONUS:  'bonus',
  PIEGE:  'trap'
};

const MAX_UNITES    = 5;
const ZONE_DEPART   = { j1: [0, 1], j2: [6, 7] };
const NB_BONUS      = 4;
const NB_PIEGES     = 3;
const CASES_VICTOIRE = 33;
const DUREE_TOUR    = 30;

let etat = {};
const BONUS_DEFENSE = 3;
