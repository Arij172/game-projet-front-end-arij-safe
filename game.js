/* ============================================================
   game.js — Logique de jeu & IA
   ============================================================ */

// ============================================================
// INITIALISATION
// ============================================================
function reinitialiserJeu() {
  if (etat.timerId) clearInterval(etat.timerId);
  const modeActuel = etat.modeJeu || 'pc';
  document.getElementById('modal-fin').classList.remove('visible');
  etat = {
    phase:             'placement',
    joueurActif:       'j1',
    tourNumero:        1,
    deJete:            false,
    valeurDe:          0,
    unitePicker:       null,
    unitesPlacees:     { j1: 0, j2: 0 },
    caseSelectionnee:  null,
    uniteSelectionnee: null,
    scores:            { j1: 0, j2: 0 },
    grille:            [],
    unites:            [],
    timerId:           null,
    tempsRestant:      DUREE_TOUR,
    modeJeu:           modeActuel,
    enPause: false ,
    tirageJ1 : null,
    tirageJ2 : null
  };
  document.getElementById('timer-display').textContent = '—';
  document.getElementById('timer-display').className = 'timer-display';

  genererGrille();
  afficherGrille();
  mettreAJourUI();
  viderLog();
  log('<i class="fas fa-gamepad"></i> Nouvelle partie !', 'sys');
  log('<i class="fas fa-circle"></i> Joueur 1 : placez vos 5 unités.', 'j1');
  demarrerPhasePlacement();
}

function genererGrille() {
  etat.grille = [];
  for (let l = 0; l < TAILLE_GRILLE; l++) {
    etat.grille[l] = [];
    for (let c = 0; c < TAILLE_GRILLE; c++) {
      etat.grille[l][c] = { ligne: l, col: c, type: TYPES_CASES.NEUTRE, unite: null };
    }
  }
  placerCasesSpeciales(TYPES_CASES.BONUS, NB_BONUS);
  placerCasesSpeciales(TYPES_CASES.PIEGE, NB_PIEGES);
}

function placerCasesSpeciales(type, nombre) {
  let placees = 0;
  while (placees < nombre) {
    let l = Math.floor(Math.random() * 4) + 2;
    let c = Math.floor(Math.random() * TAILLE_GRILLE);
    if (etat.grille[l][c].type === TYPES_CASES.NEUTRE) {
      etat.grille[l][c].type = type;
      placees++;
    }
  }
}

// ============================================================
// PHASE DE PLACEMENT
// ============================================================
function demarrerPhasePlacement() {
  etat.phase = 'placement';
  etat.joueurActif = 'j1';
  mettreEnEvidenceZoneDepart('j1');
  document.getElementById('btn-dice').disabled = true;
  document.getElementById('btn-end-turn').style.display = 'none';
}

function choisirUnite(type) {
  if (etat.phase !== 'placement') return;
  etat.unitePicker = type;
  document.querySelectorAll('.btn-unit').forEach(b => b.classList.remove('selected-unit'));
  event.target.classList.add('selected-unit');
}

function placerUnite(ligne, col) {
  if (!etat.unitePicker) return;
  if (!ZONE_DEPART[etat.joueurActif].includes(ligne)) return;

  const nouvelleUnite = {
    id: `${etat.joueurActif}-${Math.random()}`,
    type: etat.unitePicker,
    joueur: etat.joueurActif,
    ligne, col, estVivante: true,
    enDefense: false 
  };

  etat.grille[ligne][col].unite = nouvelleUnite;
  etat.grille[ligne][col].type  = TYPES_CASES[etat.joueurActif.toUpperCase()];
  etat.unites.push(nouvelleUnite);
  etat.unitesPlacees[etat.joueurActif]++;

  mettreAJourCase(ligne, col);
  mettreAJourUI();

  if (etat.unitesPlacees[etat.joueurActif] >= MAX_UNITES) {
    if (etat.joueurActif === 'j1') {
      etat.joueurActif = 'j2';
      if (etat.modeJeu === 'pc') {
        log('<i class="fas fa-robot"></i> Le PC place ses unités...', 'j2');
        setTimeout(placementAutomatiquePC, 1000);
      } else {
        log('<i class="fas fa-circle"></i> Joueur 2 : placez vos 5 unités.', 'j2');
        deselectionner();
        mettreEnEvidenceZoneDepart('j2');
      }
    } else {
      demarrerPhaseJeu();
    }
  }
}

function placementAutomatiquePC() {
  const types = ['S', 'C', 'T'];
  const lignesPC = ZONE_DEPART.j2;
  for (let i = 0; i < MAX_UNITES; i++) {
    etat.unitePicker = types[Math.floor(Math.random() * types.length)];
    let l, c;
    do {
      l = lignesPC[Math.floor(Math.random() * lignesPC.length)];
      c = Math.floor(Math.random() * TAILLE_GRILLE);
    } while (etat.grille[l][c].unite);
    placerUnite(l, c);
  }
}

// ============================================================
// PHASE DE JEU
// ============================================================
function demarrerPhaseJeu() {
  etat.phase = 'tirage'; // ← nouvelle phase temporaire
  etat.deJete = false;
  etat.valeurDe = 0;
  etat.tirageJ1 = null;
  etat.tirageJ2 = null;
  document.getElementById('unit-picker').style.display = 'none';
  document.getElementById('btn-dice').disabled = false; // J1 peut lancer
  document.getElementById('dice-result').textContent = '—';
  document.getElementById('phase-label').textContent = 'Phase : Tirage initial';
  document.getElementById('action-msg').textContent = '🎲 Joueur 1, lancez votre dé pour déterminer qui commence !';
  mettreAJourUI();
  log('<i class="fas fa-flag"></i> La partie commence !', 'sys');
  log('<i class="fas fa-dice"></i> Tirage au sort — qui commence ?', 'sys');
  log('<i class="fas fa-circle" style="color:var(--j1)"></i> Joueur 1, lancez votre dé !', 'j1');
}

function tiragePourCommencer() {
  log('<i class="fas fa-dice"></i> Tirage au sort pour déterminer qui commence...', 'sys');

  const deJ1 = Math.floor(Math.random() * 6) + 1;
  const deJ2 = Math.floor(Math.random() * 6) + 1;

  log(`<i class="fas fa-circle" style="color:var(--j1)"></i> Joueur 1 tire : <strong>${deJ1}</strong>`, 'j1');

  const nomJ2 = etat.modeJeu === 'pc' ? 'PC' : 'Joueur 2';
  log(`<i class="fas fa-circle" style="color:var(--j2)"></i> ${nomJ2} tire : <strong>${deJ2}</strong>`, 'j2');

  determinerPremierJoueur(deJ1, deJ2);
}

function determinerPremierJoueur(deJ1, deJ2) {
  const nomJ2 = etat.modeJeu === 'pc' ? 'PC' : 'Joueur 2';

  // Égalité → relancer
  if (deJ1 === deJ2) {
    log(`<i class="fas fa-equals"></i> Égalité (${deJ1}) ! On relance...`, 'sys');
    document.getElementById('action-msg').textContent = `Égalité ! Joueur 1, relancez le dé.`;
    etat.tirageJ1 = null;
    etat.tirageJ2 = null;
    document.getElementById('btn-dice').disabled = false;
    log('<i class="fas fa-circle" style="color:var(--j1)"></i> Joueur 1, relancez votre dé !', 'j1');
    return;
  }

  // Déterminer le gagnant
  etat.joueurActif = deJ1 > deJ2 ? 'j1' : 'j2';
  const gagnantNom = etat.joueurActif === 'j1' ? 'Joueur 1' : nomJ2;

  log(`<i class="fas fa-trophy"></i> <strong>${gagnantNom}</strong> commence avec ${Math.max(deJ1, deJ2)} !`, 'sys');
  document.getElementById('action-msg').textContent = `${gagnantNom} commence !`;

  // Passer en phase jeu réelle
  etat.phase = 'jeu';
  etat.deJete = false;
  etat.valeurDe = 0;
  document.getElementById('dice-result').textContent = '—';
  document.getElementById('phase-label').textContent = 'Phase : Jeu';
  mettreAJourUI();
  demarrerTimer();

  // Si PC commence
  if (etat.joueurActif === 'j2' && etat.modeJeu === 'pc') {
    document.getElementById('btn-dice').disabled = true;
    setTimeout(jouerTourPC, 1000);
  } else {
    // J1 commence → activer le dé
    document.getElementById('btn-dice').disabled = false;
    log('<i class="fas fa-circle" style="color:var(--j1)"></i> Joueur 1, lancez votre dé !', 'j1');
  }
}

function lancerDe() {
  if (etat.enPause) return;

  // ── CAS TIRAGE INITIAL ──────────────────────────────────────
  if (etat.phase === 'tirage') {

    if (etat.tirageJ1 === null) {
      // Étape 1 : J1 lance son dé
      etat.tirageJ1 = Math.floor(Math.random() * 6) + 1;
      document.getElementById('dice-result').textContent = etat.tirageJ1;
      document.getElementById('btn-dice').disabled = true;
      log(`<i class="fas fa-circle" style="color:var(--j1)"></i> Joueur 1 tire : <strong>${etat.tirageJ1}</strong>`, 'j1');
      document.getElementById('action-msg').textContent = `Joueur 1 : ${etat.tirageJ1} — Le PC lance son dé...`;

      // Étape 2 : PC/J2 lance automatiquement après 1.5s
      setTimeout(() => {
        etat.tirageJ2 = Math.floor(Math.random() * 6) + 1;
        const nomJ2 = etat.modeJeu === 'pc' ? 'PC' : 'Joueur 2';
        document.getElementById('dice-result').textContent = etat.tirageJ2;
        log(`<i class="fas fa-robot"></i> ${nomJ2} tire : <strong>${etat.tirageJ2}</strong>`, 'j2');
        document.getElementById('action-msg').textContent = `${nomJ2} : ${etat.tirageJ2}`;

        // Étape 3 : comparaison après 1s
        setTimeout(() => determinerPremierJoueur(etat.tirageJ1, etat.tirageJ2), 1000);
      }, 1500);
    }

    return; // ← sortir, pas de logique jeu normal
  }

  // ── CAS JEU NORMAL ──────────────────────────────────────────
  if (etat.deJete) return;
  etat.valeurDe = Math.floor(Math.random() * 6) + 1;
  etat.deJete = true;
  document.getElementById('dice-result').textContent = etat.valeurDe;
  document.getElementById('btn-dice').disabled = true;
  const nomJoueur = etat.joueurActif === 'j1' ? 'Joueur 1' : (etat.modeJeu === 'pc' ? 'PC' : 'Joueur 2');
  log(`<i class="fas fa-dice"></i> ${nomJoueur} lance le dé : ${etat.valeurDe}`, etat.joueurActif);
}
function basculerPause() {
  if (etat.phase !== 'jeu') return;
  etat.enPause = !etat.enPause;

  if (etat.enPause) {
    arreterTimer();
    // ← icône change en "play"
    document.getElementById('btn-pause').innerHTML = '<i class="fas fa-play"></i>';
    document.getElementById('btn-pause').classList.add('en-pause');
    document.getElementById('overlay-pause').classList.add('visible');
    log('<i class="fas fa-pause"></i> Jeu en pause.', 'sys');
  } else {
    demarrerTimer(false);
    // ← icône revient en "pause"
    document.getElementById('btn-pause').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('btn-pause').classList.remove('en-pause');
    document.getElementById('overlay-pause').classList.remove('visible');
    log('<i class="fas fa-play"></i> Jeu repris.', 'sys');
  }
}
function retourAccueil() {
  // Arrête le timer
  if (etat.timerId) clearInterval(etat.timerId);

  // Remet en pause si nécessaire
  etat.enPause = false;
  etat.phase = 'fini';

  document.getElementById('unit-picker').style.display = 'flex';

  // Cache l'overlay pause si visible
  document.getElementById('overlay-pause').classList.remove('visible');

  // Réaffiche l'écran de démarrage
  const screen = document.getElementById('start-screen');
  screen.classList.remove('hidden');
  screen.style.opacity = '0';
  screen.style.transition = 'opacity 0.5s ease';
  setTimeout(() => {
    screen.style.opacity = '1';
  }, 50);

  log('<i class="fas fa-house"></i> Retour à l\'accueil.', 'sys');
}

function clicSurCase(l, c) {
  if (etat.enPause) return;
  if (etat.phase === 'placement') return placerUnite(l, c);
  if (etat.phase !== 'jeu') return;
  if (etat.modeJeu === 'pc' && etat.joueurActif !== 'j1') return;

  const caseData = etat.grille[l][c];

  if (etat.uniteSelectionnee) {
    const el = document.getElementById(`cell-${l}-${c}`);
    if (el.classList.contains('reachable'))  return deplacerUnite(etat.uniteSelectionnee, l, c);
    if (el.classList.contains('attackable')) return lancerCombat(etat.uniteSelectionnee, l, c);
    deselectionner();
  }

  if (caseData.unite && caseData.unite.joueur === etat.joueurActif && etat.deJete) {
    selectionnerUnite(l, c);
  }
}

function selectionnerUnite(l, c) {
  deselectionner();
  const unite = etat.grille[l][c].unite;
  etat.uniteSelectionnee = unite;
  document.getElementById(`cell-${l}-${c}`).classList.add('selected');

  const accessibles = calculerCasesAccessibles(unite);
  accessibles.forEach(pos => {
    const cl = pos.estEnnemi ? 'attackable' : 'reachable';
    document.getElementById(`cell-${pos.l}-${pos.c}`).classList.add(cl);
  });
  afficherBoutonDefense(l, c);
}
function afficherBoutonDefense(l, c) {
  const ancien = document.getElementById('btn-defend-flottant');
  if (ancien) ancien.remove();

  const unite = etat.grille[l][c].unite;
  if (!unite || unite.enDefense) return;

  const cellEl = document.getElementById(`cell-${l}-${c}`);
  const rect = cellEl.getBoundingClientRect();

  const btn = document.createElement('button');
  btn.id = 'btn-defend-flottant';
  btn.innerHTML = '<i class="fas fa-shield"></i> Défendre';
  btn.className = 'btn-defend-flottant';
  btn.style.position = 'fixed';
  btn.style.left = rect.left + 'px';
  btn.style.top  = (rect.top - 44) + 'px';
  btn.style.zIndex = '500';

  btn.onclick = (e) => {
    e.stopPropagation();
    activerDefense(l, c);
    btn.remove();
  };

  document.body.appendChild(btn);
}


function deplacerUnite(unite, nl, nc) {
  unite.enDefense = false; 
  const al = unite.ligne, ac = unite.col;
  const nCase = etat.grille[nl][nc];

  etat.grille[al][ac].unite = null;

  if (nCase.type === TYPES_CASES.PIEGE) {
    log(`<i class="fas fa-skull"></i> Piège ! ${unite.joueur} perd une unité`, 'combat');
    supprimerUnite(unite);
    const trapEl = document.getElementById(`cell-${nl}-${nc}`);
    if (trapEl) { trapEl.classList.add('flash-trap'); trapEl.addEventListener('animationend', () => trapEl.classList.remove('flash-trap'), { once: true }); }
  } else {
    if (nCase.type === TYPES_CASES.BONUS) ajouterUnites(unite.joueur, 2);
    unite.ligne = nl; unite.col = nc;
    nCase.unite = unite;
    nCase.type  = TYPES_CASES[unite.joueur.toUpperCase()];
    const captEl = document.getElementById(`cell-${nl}-${nc}`);
    if (captEl) { captEl.classList.add('flash-capture'); captEl.addEventListener('animationend', () => captEl.classList.remove('flash-capture'), { once: true }); }
  }

  mettreAJourCase(al, ac);
  mettreAJourCase(nl, nc);
  finaliserAction();
}

function lancerCombat(att, dl, dc) {
  const defCase = etat.grille[dl][dc];
  const def = defCase.unite;
  const scoreAtt = etat.valeurDe + TYPES_UNITES[att.type].force;

  const bonusDefense = def.enDefense ? BONUS_DEFENSE : 0;
  const scoreDef = TYPES_UNITES[def.type].force
                 + (def.type === 'T' ? 2 : 0)
                 + bonusDefense;

  if (def.enDefense) {
    log(`<i class="fas fa-shield"></i> ${TYPES_UNITES[def.type].nom} est en défense ! (+${BONUS_DEFENSE})`, 'combat');
  }
 log(`<i class="fas fa-sword"></i> Combat : ${TYPES_UNITES[att.type].nom} ${scoreAtt} vs ${TYPES_UNITES[def.type].nom}  ${scoreDef}`, 'combat');
  if (scoreAtt > scoreDef) {
    log('<i class="fas fa-check-circle"></i> Victoire ! Case capturée.', att.joueur);
    const combatEl = document.getElementById(`cell-${dl}-${dc}`);
    if (combatEl) lancerConfettis(combatEl);
    if (def.estVivante) def.enDefense = false;
    supprimerUnite(def);
    deplacerUnite(att, dl, dc);
  } else {
    log('<i class="fas fa-times-circle"></i> Échec de l\'attaque.', 'combat');
    if (def.estVivante) def.enDefense = false;
    finaliserAction();
  }
}
function activerDefense(ligne, col) {
  if (etat.phase !== 'jeu') return;
  //if (etat.modeJeu === 'pc' && etat.joueurActif !== 'j1') return;

  const unite = etat.grille[ligne][col].unite;
  if (!unite || unite.joueur !== etat.joueurActif) return;

  unite.enDefense = true;
  mettreAJourCase(ligne, col);

  const nomUnite = TYPES_UNITES[unite.type].nom;
  log(`<i class="fas fa-shield"></i> ${nomUnite} passe en mode défense ! (+${BONUS_DEFENSE})`, etat.joueurActif);

  deselectionner();
  verifierVictoire();
  if (etat.phase === 'jeu') finirTour();
}

function finaliserAction() {
  mettreAJourUI();
  deselectionner();
  verifierVictoire();
  if (etat.phase === 'jeu') finirTour();
}

function finirTour() {
  arreterTimer();
  etat.joueurActif = (etat.joueurActif === 'j1') ? 'j2' : 'j1';
  etat.deJete = false;
  etat.valeurDe = 0;
  if (etat.joueurActif === 'j1') etat.tourNumero++;

  mettreAJourUI();
  document.getElementById('btn-dice').disabled = (etat.joueurActif === 'j2' && etat.modeJeu === 'pc');

  if (etat.joueurActif === 'j2' && etat.phase === 'jeu' && etat.modeJeu === 'pc') {
    demarrerTimer();
    setTimeout(jouerTourPC, 1000);
  } else if (etat.phase === 'jeu') {
    demarrerTimer();
  }
}

// ============================================================
// INTELLIGENCE ARTIFICIELLE (PC)
// ============================================================
function jouerTourPC() {
  if (etat.enPause) return;
  lancerDe();
  setTimeout(() => {
    if (etat.enPause) return;
    const mesUnites = etat.unites
      .filter(u => u.joueur === 'j2' && u.estVivante)
      .sort(() => Math.random() - 0.5);

    let actionFaite = false;

    for (let u of mesUnites) {
      const cibles = calculerCasesAccessibles(u);

      // CONDITION 1 : PC bloqué
      if (cibles.length === 0) {
        log('<i class="fas fa-shield"></i> PC bloqué → défense !', 'j2');
        activerDefense(u.ligne, u.col);
        actionFaite = true;
        break;
      }

      // CONDITION 2 : ennemi adjacent plus fort que l'unité du PC
      if (verifierEnnemiplusFort(u)) {
        log('<i class="fas fa-shield"></i> PC détecte un ennemi plus fort → défense !', 'j2');
        activerDefense(u.ligne, u.col);
        actionFaite = true;
        break;
      }

      // comportement normal : attaquer ou se déplacer
      const attaque = cibles.find(c => c.estEnnemi);
      const cible   = attaque || cibles[Math.floor(Math.random() * cibles.length)];
      if (cible.estEnnemi) lancerCombat(u, cible.l, cible.c);
      else deplacerUnite(u, cible.l, cible.c);
      actionFaite = true;
      break;
    }

    if (!actionFaite) finirTour();
  }, 1000);
}

// Vérifie si un ennemi adjacent est plus fort que l'unité du PC
function verifierEnnemiplusFort(unite) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (let d of dirs) {
    const nl = unite.ligne + d[0];
    const nc = unite.col   + d[1];
    if (nl < 0 || nl >= TAILLE_GRILLE) continue;
    if (nc < 0 || nc >= TAILLE_GRILLE) continue;
    const voisine = etat.grille[nl][nc];
    if (voisine.unite &&
        voisine.unite.joueur !== unite.joueur &&
        TYPES_UNITES[voisine.unite.type].force > TYPES_UNITES[unite.type].force) {
      return true;
    }
  }
  return false;
}
// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================
function calculerCasesAccessibles(u) {
  const acc  = [];
  const dist = TYPES_UNITES[u.type].deplacement;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

  dirs.forEach(d => {
    for (let i = 1; i <= dist; i++) {
      const nl = u.ligne + d[0]*i, nc = u.col + d[1]*i;
      if (nl < 0 || nl >= TAILLE_GRILLE || nc < 0 || nc >= TAILLE_GRILLE) break;
      const target = etat.grille[nl][nc];
      if (!target.unite) acc.push({ l: nl, c: nc, estEnnemi: false });
      else if (target.unite.joueur !== u.joueur) { acc.push({ l: nl, c: nc, estEnnemi: true }); break; }
      else break;
    }
  });
  return acc;
}

function supprimerUnite(u) {
  u.estVivante = false;
  etat.grille[u.ligne][u.col].unite = null;
  etat.unites = etat.unites.filter(un => un.estVivante);
}

function ajouterUnites(joueur, nb) {
  const types = ['S', 'C', 'T'];
  const zone  = ZONE_DEPART[joueur];
  const libres = [];
  for (let l = 0; l < TAILLE_GRILLE; l++)
    for (let c = 0; c < TAILLE_GRILLE; c++)
      if (!etat.grille[l][c].unite) libres.push({ l, c });

  const enZone = libres.filter(p => zone.includes(p.l));
  const cibles = enZone.length >= nb ? enZone : libres;

  let placed = 0;
  for (let i = 0; i < cibles.length && placed < nb; i++) {
    const { l, c } = cibles[i];
    if (etat.grille[l][c].unite) continue;
    const nouvelleUnite = {
      id: `${joueur}-bonus-${Math.random()}`,
      type: types[Math.floor(Math.random() * types.length)],
      joueur, ligne: l, col: c, estVivante: true,
      enDefense: false

    };
    etat.grille[l][c].unite = nouvelleUnite;
    etat.grille[l][c].type  = TYPES_CASES[joueur.toUpperCase()];
    etat.unites.push(nouvelleUnite);
    mettreAJourCase(l, c);
    placed++;
  }
  log(`<i class="fas fa-star"></i> Bonus ! ${joueur === 'j1' ? 'Joueur 1' : 'PC'} gagne ${placed} unité(s)`, joueur);
}

function verifierVictoire() {
  const j1Cases = etat.grille.flat().filter(c => c.type === 'j1').length;
  const j2Cases = etat.grille.flat().filter(c => c.type === 'j2').length;

  if (j1Cases >= CASES_VICTOIRE || etat.unites.filter(u => u.joueur === 'j2').length === 0) {
    afficherVictoire('j1', 'Le Joueur 1 a gagné !');
  } else if (j2Cases >= CASES_VICTOIRE || etat.unites.filter(u => u.joueur === 'j1').length === 0) {
    afficherVictoire('j2', etat.modeJeu === 'pc' ? 'Le PC a gagné !' : 'Le Joueur 2 a gagné !');
  }
}

// ============================================================
// LANCEMENT
// ============================================================
function lancerJeu(mode) {
  etat.modeJeu = mode || 'pc';
  const screen = document.getElementById('start-screen');

  screen.classList.add('fading-out');
  document.getElementById('unit-picker').style.display = 'flex';
  screen.addEventListener('animationend', () => {
    screen.classList.add('hidden');
    screen.classList.remove('fading-out');
    reinitialiserJeu();
  }, { once: true });
}
