// ====================== AuditÉnergie Maroc — SPA ======================
const API = axios.create({ baseURL: '/api', withCredentials: true });

const State = {
  user: null,
  currentAudit: null, // résultat de calcul en attente de sauvegarde
};

const DPE_INFO = {
  A: { color: '#1a9850', range: '< 50' },
  B: { color: '#66bd63', range: '51 – 90' },
  C: { color: '#a6d96a', range: '91 – 150' },
  D: { color: '#fee08b', range: '151 – 230' },
  E: { color: '#fdae61', range: '231 – 330' },
  F: { color: '#f46d43', range: '331 – 450' },
  G: { color: '#d73027', range: '> 450' },
};
const MOYENNE_NATIONALE = 180;

// ---------------- Utils ----------------
const $ = (sel) => document.querySelector(sel);
const app = () => document.getElementById('app');

function toast(message, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
  t.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3500);
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function navigate(path) {
  window.history.pushState({}, '', path);
  render();
}

window.addEventListener('popstate', render);

// ---------------- Auth helpers ----------------
async function fetchUser() {
  try {
    const { data } = await API.get('/protected/me');
    State.user = data.user;
    return data.user;
  } catch {
    State.user = null;
    return null;
  }
}

async function logout() {
  await API.post('/logout');
  State.user = null;
  toast('Déconnexion réussie', 'success');
  navigate('/');
}

// ====================== RENDER ROUTER ======================
async function render() {
  const path = window.location.pathname;
  const protectedRoutes = ['/dashboard', '/nouvel-audit', '/historique', '/profil', '/audit'];
  const isProtected = protectedRoutes.some((p) => path === p || path.startsWith('/audit/'));

  if (isProtected && !State.user) {
    await fetchUser();
    if (!State.user) { navigate('/login'); return; }
  }

  if (path === '/' ) return renderLanding();
  if (path === '/login') return renderLogin();
  if (path === '/register') return renderRegister();
  if (path === '/dashboard' || path === '/nouvel-audit') return renderDashboard('nouvel-audit');
  if (path === '/historique') return renderDashboard('historique');
  if (path === '/profil') return renderDashboard('profil');
  if (path.startsWith('/audit/')) return renderDashboard('audit', path.split('/')[2]);

  renderLanding();
}

// ====================== LANDING ======================
function renderLanding() {
  const dpeRows = Object.entries(DPE_INFO).map(([letter, info]) =>
    `<div class="dpe-row">
      <div class="dpe-letter" style="background:${info.color}">${letter}</div>
      <div class="dpe-range">${info.range} kWh/m²/an</div>
    </div>`).join('');

  app().innerHTML = `
    <nav class="landing-nav">
      <div class="logo"><i class="fas fa-leaf"></i> AuditÉnergie Maroc</div>
      <div class="nav-links">
        <a href="/login" class="btn btn-ghost" data-link>Connexion</a>
        <a href="/register" class="btn btn-primary" data-link>Inscription</a>
      </div>
    </nav>

    <section class="hero" id="hero-section">
      <h1>Diagnostic de Performance Énergétique<br>de vos bâtiments</h1>
      <p>Évaluez la consommation énergétique de vos bâtiments, obtenez une classe DPE officielle (A–G), suivez votre historique et recevez des recommandations personnalisées pour économiser de l'énergie.</p>
      <div class="hero-cta">
        <a href="/register" class="btn btn-primary" data-link><i class="fas fa-bolt"></i> Commencer un audit</a>
        <a href="/login" class="btn btn-outline" data-link>J'ai déjà un compte</a>
      </div>
    </section>

    <section class="features">
      <h2>Fonctionnalités</h2>
      <p class="subtitle">Une plateforme complète pour le diagnostic énergétique</p>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-gauge-high"></i></div>
          <h3>Calcul DPE automatique</h3>
          <p>Obtenez instantanément la classe énergétique (A à G) selon le standard européen et marocain, avec facteurs de correction.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-clock-rotate-left"></i></div>
          <h3>Historique des audits</h3>
          <p>Conservez tous vos audits, filtrez par classe ou type de bâtiment et comparez vos résultats dans le temps.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-lightbulb"></i></div>
          <h3>Recommandations</h3>
          <p>Recevez des conseils personnalisés pour améliorer l'isolation, le vitrage et réduire vos émissions de CO₂.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-smog"></i></div>
          <h3>Émissions CO₂</h3>
          <p>Estimez l'impact carbone de votre bâtiment et comparez-le à la moyenne nationale (180 kWh/m²/an).</p>
        </div>
      </div>
    </section>

    <section class="dpe-scale-section">
      <h2>L'échelle DPE</h2>
      <div class="dpe-scale">${dpeRows}</div>
    </section>

    <footer class="landing-footer">
      <div class="logo" style="justify-content:center;margin-bottom:10px;"><i class="fas fa-leaf"></i> AuditÉnergie Maroc</div>
      <p>© 2026 AuditÉnergie Maroc — Diagnostic de Performance Énergétique</p>
    </footer>
  `;
  bindLinks();
}

// ====================== AUTH PAGES ======================
function renderLogin() {
  app().innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="logo"><i class="fas fa-leaf"></i> AuditÉnergie</div>
        <h2>Connexion</h2>
        <p class="sub">Accédez à votre tableau de bord</p>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required placeholder="vous@exemple.com">
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" name="password" required placeholder="••••••••">
          </div>
          <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-right-to-bracket"></i> Se connecter</button>
        </form>
        <p class="auth-switch">Pas encore de compte ? <a href="/register" data-link>S'inscrire</a></p>
        <p class="auth-switch"><a href="/" data-link>← Retour à l'accueil</a></p>
      </div>
    </div>`;
  bindLinks();
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const fd = new FormData(e.target);
    try {
      const { data } = await API.post('/login', { email: fd.get('email'), password: fd.get('password') });
      State.user = data.user;
      toast('Connexion réussie. Bienvenue ' + data.user.nom + ' !', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur de connexion', 'error');
      btn.disabled = false;
    }
  });
}

function renderRegister() {
  app().innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="logo"><i class="fas fa-leaf"></i> AuditÉnergie</div>
        <h2>Inscription</h2>
        <p class="sub">Créez votre compte gratuitement</p>
        <form id="register-form">
          <div class="form-group">
            <label>Nom complet</label>
            <input type="text" name="nom" required placeholder="Votre nom">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required placeholder="vous@exemple.com">
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" name="password" required minlength="6" placeholder="6 caractères minimum">
          </div>
          <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-user-plus"></i> Créer mon compte</button>
        </form>
        <p class="auth-switch">Déjà inscrit ? <a href="/login" data-link>Se connecter</a></p>
        <p class="auth-switch"><a href="/" data-link>← Retour à l'accueil</a></p>
      </div>
    </div>`;
  bindLinks();
  $('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const fd = new FormData(e.target);
    try {
      const { data } = await API.post('/register', { nom: fd.get('nom'), email: fd.get('email'), password: fd.get('password') });
      State.user = data.user;
      toast('Compte créé avec succès !', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || "Erreur lors de l'inscription", 'error');
      btn.disabled = false;
    }
  });
}

// ====================== DASHBOARD SHELL ======================
function dashShell(activeKey, contentHtml, title) {
  const navItems = [
    { key: 'nouvel-audit', href: '/nouvel-audit', icon: 'plus-circle', label: 'Nouvel Audit' },
    { key: 'historique', href: '/historique', icon: 'clock-rotate-left', label: 'Historique' },
    { key: 'profil', href: '/profil', icon: 'user', label: 'Profil' },
  ];
  const links = navItems.map((i) =>
    `<a href="${i.href}" data-link class="${activeKey === i.key ? 'active' : ''}"><i class="fas fa-${i.icon}"></i> ${i.label}</a>`
  ).join('');

  app().innerHTML = `
    <div class="dash">
      <aside class="sidebar" id="sidebar">
        <div class="logo"><i class="fas fa-leaf"></i> AuditÉnergie</div>
        <nav class="sidebar-nav">
          ${links}
          <a href="#" id="logout-btn"><i class="fas fa-right-from-bracket"></i> Déconnexion</a>
        </nav>
        <div class="sidebar-user">
          <strong>${escapeHtml(State.user?.nom || '')}</strong>
          <span>${escapeHtml(State.user?.email || '')}</span>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <button class="menu-toggle" id="menu-toggle"><i class="fas fa-bars"></i></button>
          <h1>${title}</h1>
          <div></div>
        </div>
        <div id="dash-content">${contentHtml}</div>
      </main>
    </div>`;
  bindLinks();
  $('#logout-btn').addEventListener('click', (e) => { e.preventDefault(); logout(); });
  $('#menu-toggle')?.addEventListener('click', () => $('#sidebar').classList.toggle('open'));
}

async function renderDashboard(view, param) {
  if (!State.user) await fetchUser();
  if (view === 'nouvel-audit') return renderNewAudit();
  if (view === 'historique') return renderHistorique();
  if (view === 'profil') return renderProfil();
  if (view === 'audit') return renderAuditDetail(param);
}

// ====================== NOUVEL AUDIT ======================
function renderNewAudit() {
  const content = `
    <div class="card">
      <h2><i class="fas fa-building"></i> Informations du bâtiment</h2>
      <form id="audit-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Nom du bâtiment</label>
            <input type="text" name="nom_batiment" required placeholder="Ex: Villa Anfa">
          </div>
          <div class="form-group">
            <label>Type de bâtiment</label>
            <select name="type_batiment">
              <option>Résidentiel</option><option>Commercial</option><option>Industriel</option>
            </select>
          </div>
          <div class="form-group">
            <label>Surface (m²)</label>
            <input type="number" name="surface" required min="1" step="0.1" placeholder="120">
          </div>
          <div class="form-group">
            <label>Année de construction</label>
            <input type="number" name="annee_construction" min="1800" max="2026" placeholder="2005">
          </div>
          <div class="form-group">
            <label>Type de chauffage</label>
            <select name="type_chauffage">
              <option>Gaz</option><option>Électrique</option><option>Fioul</option>
              <option>Pompe à chaleur</option><option>Solaire</option>
            </select>
          </div>
          <div class="form-group">
            <label>Consommation électricité (kWh/an)</label>
            <input type="number" name="electricite_kwh" min="0" step="0.1" placeholder="8000" value="0">
          </div>
          <div class="form-group">
            <label>Consommation gaz (kWh/an)</label>
            <input type="number" name="gaz_kwh" min="0" step="0.1" placeholder="5000" value="0">
          </div>
          <div class="form-group">
            <label>Type d'isolation</label>
            <select name="isolation">
              <option>Aucune</option><option>Partielle</option><option>Complète</option>
            </select>
          </div>
          <div class="form-group">
            <label>Vitrage des fenêtres</label>
            <select name="vitrage">
              <option>Simple vitrage</option><option>Double vitrage</option><option>Triple vitrage</option>
            </select>
          </div>
          <div class="form-group">
            <label>Climatisation</label>
            <select name="climatisation"><option>Non</option><option>Oui</option></select>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-calculator"></i> Calculer le DPE</button>
          <button type="reset" class="btn btn-ghost">Réinitialiser</button>
        </div>
      </form>
    </div>
    <div id="result-area"></div>`;
  dashShell('nouvel-audit', content, 'Nouvel Audit Énergétique');

  $('#audit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    try {
      const { data } = await API.post('/protected/calculate', payload);
      State.currentAudit = { input: payload, result: data.result, recommendations: data.recommendations };
      renderResultArea(data.result, data.recommendations, payload, true);
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur de calcul', 'error');
    }
  });
}

// Rendu de la zone résultat (réutilisée pour calcul & détail)
function renderResultArea(result, recommendations, input, savable) {
  const info = DPE_INFO[result.dpe_classe];
  const conso = result.consommation_specifique;
  // position marqueur sur l'échelle (0 à ~500 mappé sur 0-100%)
  const markerPct = Math.min(100, (conso / 500) * 100);

  const recosHtml = recommendations.map((r) => `<li><i class="fas fa-check-circle"></i> ${escapeHtml(r)}</li>`).join('');

  const vsNat = conso > MOYENNE_NATIONALE
    ? `<strong style="color:#d73027">${Math.round((conso / MOYENNE_NATIONALE - 1) * 100)}% au-dessus</strong>`
    : `<strong style="color:#1a9850">${Math.round((1 - conso / MOYENNE_NATIONALE) * 100)}% en-dessous</strong>`;

  const area = $('#result-area') || (() => { const d = document.createElement('div'); d.id = 'result-area'; $('#dash-content').appendChild(d); return d; })();

  area.innerHTML = `
    <div class="card" id="audit-result">
      <h2><i class="fas fa-chart-simple"></i> Résultat du diagnostic</h2>
      <div class="result-grid">
        <div class="dpe-badge-box">
          <div class="dpe-badge" style="background:${info.color}">${result.dpe_classe}</div>
          <div class="dpe-label">Classe énergétique</div>
        </div>
        <div>
          <div class="metric-list">
            <div class="metric"><span class="m-label"><i class="fas fa-bolt"></i> Consommation spécifique</span><span class="m-value">${conso} kWh/m²/an</span></div>
            <div class="metric"><span class="m-label"><i class="fas fa-smog"></i> Émissions CO₂</span><span class="m-value">${result.emissions_co2} kg/an</span></div>
          </div>
          <div class="energy-bar">
            <div class="energy-marker" style="left:${markerPct}%" data-val="${conso}"></div>
          </div>
          <div class="comparison" style="margin-top:18px;">
            <i class="fas fa-flag"></i> Votre bâtiment : <strong>${conso} kWh/m²/an</strong> vs moyenne nationale <strong>${MOYENNE_NATIONALE} kWh/m²/an</strong> → ${vsNat}
          </div>
        </div>
      </div>

      <div style="margin-top:28px;">
        <h2><i class="fas fa-chart-pie"></i> Répartition des consommations</h2>
        <div style="max-width:340px;margin:0 auto;"><canvas id="conso-chart"></canvas></div>
      </div>

      <div style="margin-top:28px;">
        <h2><i class="fas fa-lightbulb"></i> Recommandations</h2>
        <ul class="recos">${recosHtml}</ul>
      </div>

      <div class="form-actions no-print">
        ${savable ? '<button id="save-audit-btn" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Sauvegarder cet audit</button>' : ''}
        <button id="print-btn" class="btn btn-outline"><i class="fas fa-file-pdf"></i> Exporter en PDF</button>
      </div>
    </div>`;

  // Chart répartition
  setTimeout(() => {
    const ctx = document.getElementById('conso-chart');
    if (ctx) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Électricité (kWh)', 'Gaz (kWh)'],
          datasets: [{ data: [Number(input.electricite_kwh) || 0, Number(input.gaz_kwh) || 0], backgroundColor: ['#457b9d', '#fdae61'] }],
        },
        options: { plugins: { legend: { position: 'bottom' } } },
      });
    }
  }, 50);

  $('#print-btn')?.addEventListener('click', () => window.print());
  if (savable) {
    $('#save-audit-btn')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await API.post('/protected/audits', input);
        toast('Audit sauvegardé avec succès !', 'success');
        navigate('/historique');
      } catch (err) {
        toast(err.response?.data?.error || 'Erreur de sauvegarde', 'error');
        e.target.disabled = false;
      }
    });
  }
  area.scrollIntoView({ behavior: 'smooth' });
}

// ====================== HISTORIQUE ======================
async function renderHistorique() {
  dashShell('historique', '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>', 'Historique des Audits');
  let audits = [];
  try {
    const { data } = await API.get('/protected/audits');
    audits = data.audits;
  } catch { toast('Erreur de chargement', 'error'); }

  if (audits.length === 0) {
    $('#dash-content').innerHTML = `
      <div class="card empty-state">
        <i class="fas fa-folder-open"></i>
        <h2>Aucun audit enregistré</h2>
        <p>Commencez par créer votre premier audit énergétique.</p>
        <a href="/nouvel-audit" data-link class="btn btn-primary" style="margin-top:16px;"><i class="fas fa-plus"></i> Nouvel audit</a>
      </div>`;
    bindLinks();
    return;
  }

  const renderRows = (list) => list.map((a) => {
    const info = DPE_INFO[a.dpe_classe];
    const date = new Date(a.created_at + 'Z').toLocaleDateString('fr-FR');
    return `<tr data-id="${a.id}" class="audit-row">
      <td><strong>${escapeHtml(a.nom_batiment)}</strong></td>
      <td>${escapeHtml(a.type_batiment)}</td>
      <td>${a.surface} m²</td>
      <td><span class="dpe-pill" style="background:${info.color}">${a.dpe_classe}</span></td>
      <td>${a.consommation_specifique} kWh/m²/an</td>
      <td>${date}</td>
      <td class="no-print"><button class="btn btn-danger btn-sm del-btn" data-id="${a.id}"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');

  $('#dash-content').innerHTML = `
    <div class="card">
      <div class="filters">
        <select id="filter-dpe">
          <option value="">Toutes les classes DPE</option>
          ${Object.keys(DPE_INFO).map((k) => `<option value="${k}">Classe ${k}</option>`).join('')}
        </select>
        <select id="filter-type">
          <option value="">Tous les types</option>
          <option>Résidentiel</option><option>Commercial</option><option>Industriel</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Bâtiment</th><th>Type</th><th>Surface</th><th>DPE</th><th>Consommation</th><th>Date</th><th></th></tr></thead>
          <tbody id="audit-tbody">${renderRows(audits)}</tbody>
        </table>
      </div>
    </div>`;

  function applyFilters() {
    const dpe = $('#filter-dpe').value;
    const type = $('#filter-type').value;
    const filtered = audits.filter((a) => (!dpe || a.dpe_classe === dpe) && (!type || a.type_batiment === type));
    $('#audit-tbody').innerHTML = filtered.length ? renderRows(filtered) : `<tr><td colspan="7" style="text-align:center;color:#999;padding:30px;">Aucun audit ne correspond aux filtres</td></tr>`;
    bindRowEvents();
  }

  function bindRowEvents() {
    document.querySelectorAll('.audit-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.del-btn')) return;
        navigate('/audit/' + row.dataset.id);
      });
    });
    document.querySelectorAll('.del-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(btn.dataset.id, () => { audits = audits.filter((a) => String(a.id) !== String(btn.dataset.id)); applyFilters(); });
      });
    });
  }

  $('#filter-dpe').addEventListener('change', applyFilters);
  $('#filter-type').addEventListener('change', applyFilters);
  bindRowEvents();
}

function confirmDelete(id, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3><i class="fas fa-triangle-exclamation" style="color:#d73027"></i> Confirmer la suppression</h3>
      <p>Voulez-vous vraiment supprimer cet audit ? Cette action est irréversible.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-del">Annuler</button>
        <button class="btn btn-danger" id="confirm-del">Supprimer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#cancel-del').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.querySelector('#confirm-del').onclick = async () => {
    try {
      await API.delete('/protected/audits/' + id);
      toast('Audit supprimé', 'success');
      onDone && onDone();
    } catch { toast('Erreur de suppression', 'error'); }
    overlay.remove();
  };
}

// ====================== DÉTAIL AUDIT ======================
async function renderAuditDetail(id) {
  dashShell('historique', '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>', 'Détail de l\'audit');
  try {
    const { data } = await API.get('/protected/audits/' + id);
    const a = data.audit;
    $('#dash-content').innerHTML = `
      <div class="card no-print" style="display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;"><i class="fas fa-building"></i> ${escapeHtml(a.nom_batiment)}</h2>
        <a href="/historique" data-link class="btn btn-ghost"><i class="fas fa-arrow-left"></i> Retour</a>
      </div>
      <div class="card">
        <h2>Caractéristiques</h2>
        <div class="form-grid">
          ${detailRow('Type', a.type_batiment)}
          ${detailRow('Surface', a.surface + ' m²')}
          ${detailRow('Année', a.annee_construction || '—')}
          ${detailRow('Chauffage', a.type_chauffage)}
          ${detailRow('Électricité', a.electricite_kwh + ' kWh/an')}
          ${detailRow('Gaz', a.gaz_kwh + ' kWh/an')}
          ${detailRow('Isolation', a.isolation)}
          ${detailRow('Vitrage', a.vitrage)}
          ${detailRow('Climatisation', a.climatisation)}
        </div>
      </div>
      <div id="result-area"></div>`;
    bindLinks();
    renderResultArea(
      { dpe_classe: a.dpe_classe, consommation_specifique: a.consommation_specifique, emissions_co2: a.emissions_co2 },
      data.recommendations, a, false
    );
  } catch {
    $('#dash-content').innerHTML = `<div class="card empty-state"><i class="fas fa-circle-exclamation"></i><h2>Audit introuvable</h2><a href="/historique" data-link class="btn btn-primary" style="margin-top:14px;">Retour</a></div>`;
    bindLinks();
  }
}

function detailRow(label, value) {
  return `<div class="metric"><span class="m-label">${label}</span><span class="m-value" style="font-size:15px;">${escapeHtml(value)}</span></div>`;
}

// ====================== PROFIL ======================
async function renderProfil() {
  dashShell('profil', '<div class="loading"><i class="fas fa-spinner fa-spin"></i></div>', 'Mon Profil');
  let stats = { total_audits: 0, average_dpe: '—', average_conso: 0 };
  try {
    const { data } = await API.get('/protected/stats');
    stats = data;
  } catch {}
  const dpeColor = DPE_INFO[stats.average_dpe]?.color || '#999';

  $('#dash-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--blue-light)"><i class="fas fa-folder"></i></div>
        <div class="stat-info"><div class="value">${stats.total_audits}</div><div class="label">Audits réalisés</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:${dpeColor}"><i class="fas fa-award"></i></div>
        <div class="stat-info"><div class="value">${stats.average_dpe}</div><div class="label">DPE moyen</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--green)"><i class="fas fa-bolt"></i></div>
        <div class="stat-info"><div class="value">${stats.average_conso}</div><div class="label">Conso moyenne (kWh/m²/an)</div></div>
      </div>
    </div>

    <div class="card">
      <h2><i class="fas fa-id-card"></i> Informations personnelles</h2>
      <div class="form-grid">
        ${detailRow('Nom', State.user?.nom || '')}
        ${detailRow('Email', State.user?.email || '')}
      </div>
    </div>

    <div class="card">
      <h2><i class="fas fa-key"></i> Changer le mot de passe</h2>
      <form id="pwd-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Mot de passe actuel</label>
            <input type="password" name="current_password" required>
          </div>
          <div class="form-group">
            <label>Nouveau mot de passe</label>
            <input type="password" name="new_password" required minlength="6">
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-floppy-disk"></i> Mettre à jour</button>
        </div>
      </form>
    </div>`;

  $('#pwd-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/protected/change-password', { current_password: fd.get('current_password'), new_password: fd.get('new_password') });
      toast('Mot de passe mis à jour', 'success');
      e.target.reset();
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur', 'error');
    }
  });
}

// ---------------- Link binding for SPA ----------------
function bindLinks() {
  document.querySelectorAll('[data-link]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.getAttribute('href'));
    });
  });
}

// ---------------- Boot ----------------
(async function init() {
  // Ne vérifier la session que si l'on n'est pas sur une page publique pure
  const path = window.location.pathname;
  const publicOnly = path === '/' || path === '/login' || path === '/register';
  if (!publicOnly) {
    await fetchUser();
  }
  render();
})();
