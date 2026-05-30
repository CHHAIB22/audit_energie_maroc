# AuditÉnergie Maroc — Energy Audit Dashboard
link = https://audit-energie-maroc.pages.dev
## Vue d'ensemble
- **Nom** : AuditÉnergie Maroc
- **Objectif** : Outil d'audit énergétique des bâtiments permettant de calculer la classe DPE (Diagnostic de Performance Énergétique), d'estimer les émissions de CO₂, de suivre un historique d'audits et d'obtenir des recommandations personnalisées.
- **Langue** : Français (interface complète)

## Fonctionnalités terminées
- ✅ **Authentification complète** : inscription, connexion, déconnexion
  - Mot de passe haché via **PBKDF2** (Web Crypto API, compatible Cloudflare Workers)
  - Sessions via **JWT** signé HMAC-SHA256, stocké dans un cookie `httpOnly`
  - Routes protégées (le dashboard n'est accessible qu'aux utilisateurs connectés)
  - Isolation des données : chaque utilisateur ne voit que ses propres audits
- ✅ **Landing page** moderne (hero, fonctionnalités, échelle DPE, charte verte/bleue)
- ✅ **Formulaire de nouvel audit** avec tous les champs requis
- ✅ **Moteur de calcul DPE** avec facteurs de correction (isolation, vitrage, climatisation)
- ✅ **Classification DPE A→G** selon le standard européen/marocain avec badges colorés officiels
- ✅ **Estimation des émissions CO₂** (électricité × 0.057 + gaz × 0.205)
- ✅ **Page de résultat** : badge DPE, barre énergétique visuelle, graphique en anneau (Chart.js), comparaison à la moyenne nationale (180 kWh/m²/an)
- ✅ **Moteur de recommandations** automatiques basé sur les données de l'audit
- ✅ **Historique des audits** : tableau filtrable (par classe DPE / type), clic pour détail, suppression avec confirmation
- ✅ **Page profil** : infos utilisateur, statistiques (total audits, DPE moyen, conso moyenne), changement de mot de passe
- ✅ **Export PDF** via impression navigateur (styles `@media print`)
- ✅ **Notifications toast** (succès / erreur / info)
- ✅ **Design responsive** (mobile + desktop) avec sidebar du dashboard

## URLs des fonctionnalités (frontend SPA)
Routes côté client (Single Page Application) :
- `/` — Landing page
- `/login` — Connexion
- `/register` — Inscription
- `/dashboard` ou `/nouvel-audit` — Formulaire de nouvel audit + résultat
- `/historique` — Liste des audits sauvegardés
- `/audit/:id` — Détail d'un audit
- `/profil` — Profil utilisateur et statistiques

## Points d'entrée API (backend Hono)
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/register` | Non | Inscription (`nom`, `email`, `password`) |
| POST | `/api/login` | Non | Connexion (`email`, `password`) |
| POST | `/api/logout` | Non | Déconnexion (supprime le cookie) |
| GET | `/api/protected/me` | Oui | Infos de l'utilisateur courant |
| POST | `/api/protected/change-password` | Oui | Changement de mot de passe |
| POST | `/api/protected/calculate` | Oui | Calcul DPE sans sauvegarde (preview) |
| POST | `/api/protected/audits` | Oui | Créer/sauvegarder un audit |
| GET | `/api/protected/audits` | Oui | Liste des audits de l'utilisateur |
| GET | `/api/protected/audits/:id` | Oui | Détail d'un audit + recommandations |
| DELETE | `/api/protected/audits/:id` | Oui | Supprimer un audit |
| GET | `/api/protected/stats` | Oui | Statistiques (total, DPE moyen, conso moyenne) |

## Moteur de calcul DPE
```
total_kwh = electricite + gaz
consommation_specifique = total_kwh / surface
```
Facteurs de correction appliqués :
- Isolation : Aucune (+20%), Partielle (0%), Complète (−15%)
- Vitrage : Simple (+15%), Double (0%), Triple (−10%)
- Climatisation : Oui (+10%)

Classes DPE (kWh/m²/an) :
| Classe | Plage | Couleur |
|--------|-------|---------|
| A | < 50 | vert foncé `#1a9850` |
| B | 51–90 | vert clair `#66bd63` |
| C | 91–150 | jaune-vert `#a6d96a` |
| D | 151–230 | jaune `#fee08b` |
| E | 231–330 | orange `#fdae61` |
| F | 331–450 | rouge clair `#f46d43` |
| G | > 450 | rouge `#d73027` |

Émissions CO₂ : `emissions_kg = electricite × 0.057 + gaz × 0.205`

## Architecture des données
- **Modèles** :
  - `users` : id, nom, email, password_hash, created_at
  - `audits` : id, user_id, nom_batiment, type_batiment, surface, annee_construction, type_chauffage, electricite_kwh, gaz_kwh, isolation, vitrage, climatisation, dpe_classe, consommation_specifique, emissions_co2, created_at
- **Service de stockage** : **Cloudflare D1** (SQLite distribué) — binding `DB`
- **Flux** : Le frontend (SPA Vanilla JS) communique avec l'API Hono via axios → l'API accède à D1 → les calculs DPE sont effectués côté serveur.

## Guide utilisateur
1. Depuis la landing page, cliquez sur **« Commencer un audit »** pour vous inscrire.
2. Créez un compte (nom, email, mot de passe ≥ 6 caractères).
3. Dans le dashboard, remplissez le **formulaire de nouvel audit** puis cliquez sur **« Calculer le DPE »**.
4. Consultez le résultat (classe DPE, consommation, CO₂, graphique, recommandations).
5. Cliquez sur **« Sauvegarder cet audit »** pour l'enregistrer.
6. Retrouvez tous vos audits dans **Historique**, filtrez-les, ouvrez le détail, ou supprimez-les.
7. Consultez vos statistiques et changez votre mot de passe dans **Profil**.
8. Utilisez **« Exporter en PDF »** sur une page de résultat pour imprimer/sauvegarder.

## Stack technique
- **Backend** : Hono (sur runtime Cloudflare Pages/Workers)
- **Frontend** : HTML + CSS + JavaScript Vanilla (SPA), Chart.js, axios, Font Awesome (CDN)
- **Base de données** : Cloudflare D1 (SQLite)
- **Auth** : PBKDF2 (hachage) + JWT HMAC-SHA256 (Web Crypto API)
- **Build** : Vite + @hono/vite-build
- **Process manager (dev)** : PM2

## Développement local
```bash
# Installer (déjà fait dans le sandbox)
npm install

# Appliquer les migrations D1 en local
npm run db:migrate:local

# Build
npm run build

# Démarrer (PM2 + wrangler pages dev avec D1 local)
pm2 start ecosystem.config.cjs

# Tester
curl http://localhost:3000
```

## Déploiement
- **Plateforme** : Cloudflare Pages
- **Statut** : ⚙️ Prêt pour déploiement (en cours d'exécution en local sur le sandbox)
- **Étapes de déploiement production** :
  1. `setup_cloudflare_api_key` (configurer l'API key)
  2. `npx wrangler d1 create webapp-production` puis copier le `database_id` dans `wrangler.jsonc`
  3. `npm run db:migrate:prod`
  4. `npm run deploy:prod`
  5. Définir le secret JWT : `npx wrangler pages secret put JWT_SECRET --project-name <projet>`

## Prochaines étapes recommandées
- Déployer sur Cloudflare Pages (production) et configurer une vraie base D1
- Définir un `JWT_SECRET` fort comme secret Cloudflare (au lieu de la valeur de dev)
- Ajouter l'export PDF avancé via jsPDF (mise en page dédiée) en plus de l'impression navigateur
- Ajouter la possibilité de modifier un audit existant
- Ajouter des graphiques de tendance dans le profil (évolution des audits dans le temps)
- Ajouter la réinitialisation de mot de passe par email (via un service tiers comme Resend)

## Dernière mise à jour
2026-05-30
