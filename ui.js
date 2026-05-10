/* ============================================================
   ui.js — Affichage, timer & effets visuels
   ============================================================ */

// ============================================================
// GRILLE & CASES
// ============================================================
function afficherGrille() {
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  for (let l = 0; l < TAILLE_GRILLE; l++) {
    for (let c = 0; c < TAILLE_GRILLE; c++) {
      const cellEl = document.createElement('div');
      cellEl.id = `cell-${l}-${c}`;
      cellEl.addEventListener('click', () => clicSurCase(l, c));
      gridEl.appendChild(cellEl);
      mettreAJourCase(l, c);
    }
  }
}

function mettreAJourCase(l, c) {
  const caseData = etat.grille[l][c];
  const cellEl = document.getElementById(`cell-${l}-${c}`);
  if (!cellEl) return;

  cellEl.className = 'cell ' + caseData.type;
  cellEl.innerHTML = `<span class="cell-coord">${l},${c}</span>`;

  if (caseData.unite) {
    const icone = document.createElement('span');
    icone.className = 'unit-icon';
    icone.innerHTML = `<i class="fas ${TYPES_UNITES[caseData.unite.type].icone}"></i>`;
    cellEl.appendChild(icone);

    const label = document.createElement('span');
    label.className = `unit-label ${caseData.unite.joueur}-label`;
    label.textContent = TYPES_UNITES[caseData.unite.type].nom[0];
    cellEl.appendChild(label);
    if (caseData.unite.enDefense) {
      cellEl.classList.add('en-defense');
      const shield = document.createElement('span');
      shield.className = 'defense-badge';
      shield.innerHTML = '<i class="fas fa-shield"></i>';
      cellEl.appendChild(shield);
    }
  } else if (caseData.type === TYPES_CASES.BONUS) {
    cellEl.innerHTML += '<span class="unit-icon"><i class="fas fa-star"></i></span>';
  } else if (caseData.type === TYPES_CASES.PIEGE) {
    cellEl.innerHTML += '<span class="unit-icon"><i class="fas fa-skull"></i></span>';
  }
}

function deselectionner() {
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected', 'reachable', 'attackable'));
  etat.uniteSelectionnee = null;
  const btn = document.getElementById('btn-defend-flottant');
  if (btn) btn.remove();
}

function mettreEnEvidenceZoneDepart(j) {
  document.querySelectorAll('.cell').forEach(c => {
    const l = parseInt(c.id.split('-')[1]);
    if (ZONE_DEPART[j].includes(l)) c.classList.add('reachable');
  });
}

// ============================================================
// MISE À JOUR DU PANNEAU
// ============================================================
function mettreAJourUI() {
  const s = { j1: 0, j2: 0 };
  etat.grille.flat().forEach(c => { if (s[c.type] !== undefined) s[c.type]++; });
  document.getElementById('score-j1').textContent = s.j1;
  document.getElementById('score-j2').textContent = s.j2;

  const u = { j1: 0, j2: 0 };
  etat.unites.forEach(un => { if (u[un.joueur] !== undefined) u[un.joueur]++; });
  document.getElementById('units-j1').textContent = u.j1;
  document.getElementById('units-j2').textContent = u.j2;

  const totalCases = TAILLE_GRILLE * TAILLE_GRILLE; // 64 cases
  const pctJ1 = (s.j1 / totalCases) * 100;
  const pctJ2 = (s.j2 / totalCases) * 100;
  document.getElementById('progress-j1').style.width = pctJ1 + '%';
  document.getElementById('progress-j2').style.width = pctJ2 + '%';

  const cardJ1 = document.getElementById('card-j1');
  const cardJ2 = document.getElementById('card-j2');
  cardJ1.classList.toggle('active-j1', etat.joueurActif === 'j1');
  cardJ1.classList.toggle('active-j2', false);
  cardJ2.classList.toggle('active-j2', etat.joueurActif === 'j2');
  cardJ2.classList.toggle('active-j1', false);

  document.getElementById('turn-indicator').innerHTML = etat.joueurActif === 'j1'
    ? '<i class="fas fa-circle" style="color:var(--j1)"></i> Joueur 1'
    : (etat.modeJeu === 'pc'
        ? '<i class="fas fa-robot"></i> PC'
        : '<i class="fas fa-circle" style="color:var(--j2)"></i> Joueur 2');
}

function afficherVictoire(gagnant, msg) {
  arreterTimer();
  document.getElementById('timer-display').textContent = '—';
  document.getElementById('timer-display').className = 'timer-display';
  etat.phase = 'fini';
  document.getElementById('modal-title').textContent = msg;
  document.getElementById('modal-fin').classList.add('visible');
}

// ============================================================
// TIMER
// ============================================================
function demarrerTimer(reset = true) {
  arreterTimer();
  if (reset) etat.tempsRestant = DUREE_TOUR; 
  mettreAJourAffichageTimer();
  etat.timerId = setInterval(() => {
    etat.tempsRestant--;
    mettreAJourAffichageTimer();
    if (etat.tempsRestant <= 0) {
      arreterTimer();
      if (etat.joueurActif === 'j1' && etat.phase === 'jeu') {
        log('<i class="fas fa-clock"></i> Temps écoulé ! Tour terminé automatiquement.', 'sys');
        finirTour();
      }
    }
  }, 1000);
}

function arreterTimer() {
  if (etat.timerId) {
    clearInterval(etat.timerId);
    etat.timerId = null;
  }
}

function mettreAJourAffichageTimer() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  el.textContent = etat.tempsRestant + 's';
  el.className = 'timer-display';
  if (etat.tempsRestant <= 10) el.classList.add('timer-warning');
  if (etat.tempsRestant <= 5)  el.classList.add('timer-critical');
}

// ============================================================
// EFFETS VISUELS
// ============================================================
function lancerConfettis(cellEl) {
  const rect = cellEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const couleurs = ['#f5a623', '#3a86ff', '#52b788', '#e94560', '#ffffff', '#a8c8ff'];
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    const angle = (i / 20) * 360 + Math.random() * 18;
    const dist  = 35 + Math.random() * 55;
    p.style.left       = cx + 'px';
    p.style.top        = cy + 'px';
    p.style.background = couleurs[Math.floor(Math.random() * couleurs.length)];
    p.style.setProperty('--dx', (Math.cos(angle * Math.PI / 180) * dist) + 'px');
    p.style.setProperty('--dy', (Math.sin(angle * Math.PI / 180) * dist) + 'px');
    document.body.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }
}



// ============================================================
// JOURNAL
// ============================================================
function viderLog() { document.getElementById('log').innerHTML = ''; }

function log(m, c) {
  const e = document.createElement('div');
  e.className = `log-entry ${c}`;
  e.innerHTML = m;
  const l = document.getElementById('log');
  l.appendChild(e);
  l.scrollTop = l.scrollHeight;
}
