// Moteur de calcul DPE (Diagnostic de Performance Énergétique)

export interface AuditInput {
  surface: number
  electricite_kwh: number
  gaz_kwh: number
  isolation: string // Aucune | Partielle | Complète
  vitrage: string // Simple vitrage | Double vitrage | Triple vitrage
  climatisation: string // Oui | Non
  type_chauffage: string
  type_batiment: string
}

export interface DPEResult {
  dpe_classe: string
  consommation_specifique: number
  consommation_brute: number
  emissions_co2: number
  couleur: string
}

export const MOYENNE_NATIONALE = 180 // kWh/m²/an

const DPE_COLORS: Record<string, string> = {
  A: '#1a9850', // vert foncé
  B: '#66bd63', // vert clair
  C: '#a6d96a', // jaune-vert
  D: '#fee08b', // jaune
  E: '#fdae61', // orange
  F: '#f46d43', // rouge clair
  G: '#d73027', // rouge
}

export function getDPEColor(classe: string): string {
  return DPE_COLORS[classe] || '#999999'
}

export function classifyDPE(conso: number): string {
  if (conso < 50) return 'A'
  if (conso <= 90) return 'B'
  if (conso <= 150) return 'C'
  if (conso <= 230) return 'D'
  if (conso <= 330) return 'E'
  if (conso <= 450) return 'F'
  return 'G'
}

export function calculateDPE(input: AuditInput): DPEResult {
  const surface = Number(input.surface) || 1
  const elec = Number(input.electricite_kwh) || 0
  const gaz = Number(input.gaz_kwh) || 0

  const total_kwh = elec + gaz
  let conso = total_kwh / surface

  // Facteurs de correction
  // Isolation
  if (input.isolation === 'Aucune') conso *= 1.2
  else if (input.isolation === 'Complète') conso *= 0.85
  // Partielle => 0%

  // Vitrage
  if (input.vitrage === 'Simple vitrage') conso *= 1.15
  else if (input.vitrage === 'Triple vitrage') conso *= 0.9
  // Double => 0%

  // Climatisation
  if (input.climatisation === 'Oui') conso *= 1.1

  const consommation_specifique = Math.round(conso * 100) / 100
  const dpe_classe = classifyDPE(consommation_specifique)

  // Émissions CO2
  const emissions_co2 = Math.round((elec * 0.057 + gaz * 0.205) * 100) / 100

  return {
    dpe_classe,
    consommation_specifique,
    consommation_brute: Math.round((total_kwh / surface) * 100) / 100,
    emissions_co2,
    couleur: getDPEColor(dpe_classe),
  }
}

export function generateRecommendations(input: AuditInput, result: DPEResult): string[] {
  const recos: string[] = []

  if (input.isolation === 'Aucune') {
    recos.push("Améliorer l'isolation thermique (économie estimée : 20%)")
  }
  if (input.vitrage === 'Simple vitrage') {
    recos.push('Remplacer par double vitrage (économie estimée : 15%)')
  }
  if (input.type_chauffage === 'Fioul') {
    recos.push('Passer à une pompe à chaleur ou au solaire thermique')
  }
  if (['E', 'F', 'G'].includes(result.dpe_classe)) {
    recos.push('Installer des panneaux solaires photovoltaïques')
  }
  const ordre = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  if (input.climatisation === 'Oui' && ordre.indexOf(result.dpe_classe) > ordre.indexOf('C')) {
    recos.push("Optimiser l'usage de la climatisation")
  }
  recos.push('Effectuer un audit professionnel certifié')

  return recos
}
