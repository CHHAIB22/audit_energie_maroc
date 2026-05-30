import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { hashPassword, verifyPassword, signJWT, verifyJWT } from './lib/auth'
import { calculateDPE, generateRecommendations, MOYENNE_NATIONALE, getDPEColor, AuditInput } from './lib/dpe'
import { renderPage } from './pages'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

type Variables = {
  userId: number
  userEmail: string
  userNom: string
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/*', cors())

// ---- Helpers ----
function getSecret(c: any): string {
  return c.env?.JWT_SECRET || 'audit-energie-maroc-dev-secret-change-in-prod'
}

// Middleware d'authentification pour les routes /api/protected/*
async function authMiddleware(c: any, next: any) {
  const token = getCookie(c, 'auth_token') || (c.req.header('Authorization')?.replace('Bearer ', ''))
  if (!token) {
    return c.json({ error: 'Non authentifié' }, 401)
  }
  const payload = await verifyJWT(token, getSecret(c))
  if (!payload || !payload.userId) {
    return c.json({ error: 'Session invalide ou expirée' }, 401)
  }
  c.set('userId', payload.userId)
  c.set('userEmail', payload.email)
  c.set('userNom', payload.nom)
  await next()
}

// ====================== AUTH API ======================
app.post('/api/register', async (c) => {
  try {
    const { nom, email, password } = await c.req.json()
    if (!nom || !email || !password) {
      return c.json({ error: 'Tous les champs sont obligatoires' }, 400)
    }
    if (password.length < 6) {
      return c.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, 400)
    }
    const emailNorm = String(email).toLowerCase().trim()

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(emailNorm).first()
    if (existing) {
      return c.json({ error: 'Cet email est déjà utilisé' }, 409)
    }

    const hash = await hashPassword(password)
    const result = await c.env.DB.prepare(
      'INSERT INTO users (nom, email, password_hash) VALUES (?, ?, ?)'
    ).bind(nom.trim(), emailNorm, hash).run()

    const userId = result.meta.last_row_id
    const token = await signJWT({ userId, email: emailNorm, nom: nom.trim() }, getSecret(c))
    setCookie(c, 'auth_token', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7 })

    return c.json({ success: true, user: { id: userId, nom: nom.trim(), email: emailNorm } })
  } catch (e: any) {
    return c.json({ error: 'Erreur lors de l\'inscription : ' + e.message }, 500)
  }
})

app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) {
      return c.json({ error: 'Email et mot de passe requis' }, 400)
    }
    const emailNorm = String(email).toLowerCase().trim()
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(emailNorm).first<any>()
    if (!user) {
      return c.json({ error: 'Email ou mot de passe incorrect' }, 401)
    }
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) {
      return c.json({ error: 'Email ou mot de passe incorrect' }, 401)
    }
    const token = await signJWT({ userId: user.id, email: user.email, nom: user.nom }, getSecret(c))
    setCookie(c, 'auth_token', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
    return c.json({ success: true, user: { id: user.id, nom: user.nom, email: user.email } })
  } catch (e: any) {
    return c.json({ error: 'Erreur lors de la connexion : ' + e.message }, 500)
  }
})

app.post('/api/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' })
  return c.json({ success: true })
})

// ====================== PROTECTED API ======================
app.use('/api/protected/*', authMiddleware)

// Infos utilisateur courant
app.get('/api/protected/me', async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT id, nom, email, created_at FROM users WHERE id = ?').bind(userId).first<any>()
  return c.json({ user })
})

// Changer le mot de passe
app.post('/api/protected/change-password', async (c) => {
  try {
    const userId = c.get('userId')
    const { current_password, new_password } = await c.req.json()
    if (!current_password || !new_password) {
      return c.json({ error: 'Tous les champs sont requis' }, 400)
    }
    if (new_password.length < 6) {
      return c.json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' }, 400)
    }
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<any>()
    const ok = await verifyPassword(current_password, user.password_hash)
    if (!ok) {
      return c.json({ error: 'Mot de passe actuel incorrect' }, 401)
    }
    const hash = await hashPassword(new_password)
    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, userId).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: 'Erreur : ' + e.message }, 500)
  }
})

// Calcul DPE (sans sauvegarde) — preview du résultat
app.post('/api/protected/calculate', async (c) => {
  const data = await c.req.json()
  const input: AuditInput = data
  const result = calculateDPE(input)
  const recommendations = generateRecommendations(input, result)
  return c.json({ result, recommendations, moyenne_nationale: MOYENNE_NATIONALE })
})

// Créer / sauvegarder un audit
app.post('/api/protected/audits', async (c) => {
  try {
    const userId = c.get('userId')
    const data = await c.req.json()
    const input: AuditInput = data
    if (!data.nom_batiment || !data.surface) {
      return c.json({ error: 'Le nom du bâtiment et la surface sont obligatoires' }, 400)
    }
    const result = calculateDPE(input)

    const res = await c.env.DB.prepare(`
      INSERT INTO audits (
        user_id, nom_batiment, type_batiment, surface, annee_construction,
        type_chauffage, electricite_kwh, gaz_kwh, isolation, vitrage, climatisation,
        dpe_classe, consommation_specifique, emissions_co2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      data.nom_batiment,
      data.type_batiment,
      Number(data.surface),
      data.annee_construction ? Number(data.annee_construction) : null,
      data.type_chauffage,
      Number(data.electricite_kwh) || 0,
      Number(data.gaz_kwh) || 0,
      data.isolation,
      data.vitrage,
      data.climatisation,
      result.dpe_classe,
      result.consommation_specifique,
      result.emissions_co2
    ).run()

    return c.json({ success: true, id: res.meta.last_row_id, result })
  } catch (e: any) {
    return c.json({ error: 'Erreur lors de la sauvegarde : ' + e.message }, 500)
  }
})

// Liste des audits de l'utilisateur
app.get('/api/protected/audits', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM audits WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()
  return c.json({ audits: results })
})

// Détail d'un audit
app.get('/api/protected/audits/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const audit = await c.env.DB.prepare(
    'SELECT * FROM audits WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first<any>()
  if (!audit) {
    return c.json({ error: 'Audit introuvable' }, 404)
  }
  const recommendations = generateRecommendations(audit, {
    dpe_classe: audit.dpe_classe,
    consommation_specifique: audit.consommation_specifique,
    consommation_brute: audit.consommation_specifique,
    emissions_co2: audit.emissions_co2,
    couleur: getDPEColor(audit.dpe_classe),
  })
  return c.json({ audit, recommendations, moyenne_nationale: MOYENNE_NATIONALE })
})

// Supprimer un audit
app.delete('/api/protected/audits/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM audits WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return c.json({ success: true })
})

// Statistiques profil
app.get('/api/protected/stats', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT dpe_classe, consommation_specifique FROM audits WHERE user_id = ?'
  ).bind(userId).all<any>()

  const total = results.length
  let avgDpe = '—'
  if (total > 0) {
    const ordre = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const sum = results.reduce((acc: number, r: any) => acc + ordre.indexOf(r.dpe_classe), 0)
    avgDpe = ordre[Math.round(sum / total)] || '—'
  }
  const avgConso = total > 0
    ? Math.round((results.reduce((a: number, r: any) => a + r.consommation_specifique, 0) / total) * 10) / 10
    : 0

  return c.json({ total_audits: total, average_dpe: avgDpe, average_conso: avgConso })
})

// ====================== PAGES (SPA) ======================
// Favicon (évite de renvoyer le HTML de la SPA)
app.get('/favicon.ico', (c) => c.body(null, 204))

// Toutes les routes non-API renvoient la SPA
app.get('*', (c) => {
  return c.html(renderPage())
})

export default app
