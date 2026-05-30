// Shell HTML de l'application SPA
export function renderPage(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AuditÉnergie Maroc — Diagnostic de Performance Énergétique</title>
  <meta name="description" content="Réalisez le diagnostic de performance énergétique (DPE) de vos bâtiments, suivez votre historique et obtenez des recommandations.">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="/static/styles.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
</head>
<body>
  <div id="app"></div>
  <div id="toast-container"></div>
  <script src="/static/app.js"></script>
</body>
</html>`
}
