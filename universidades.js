// universidades.js
// Lista de universidades com efeito mecânico real: tier determina
// multiplicador de crescimento (só durante a fase universitária) e
// bônus/penalidade de exposição na métrica do draft da NBA.
(function (global) {

const UNIVERSIDADES = [
  // Elite: potencial médio >= 90
  { nome: "Duke",            slug: "duke",            tier: "Elite",   potencialMinimo: 90, crescimentoMultiplicador: 1.15, exposicaoBonus: 10 },
  { nome: "Kentucky",        slug: "kentucky",        tier: "Elite",   potencialMinimo: 90, crescimentoMultiplicador: 1.15, exposicaoBonus: 10 },
  { nome: "Kansas",          slug: "kansas",          tier: "Elite",   potencialMinimo: 90, crescimentoMultiplicador: 1.15, exposicaoBonus: 10 },
  { nome: "North Carolina",  slug: "north-carolina",  tier: "Elite",   potencialMinimo: 90, crescimentoMultiplicador: 1.15, exposicaoBonus: 10 },
  { nome: "Gonzaga",         slug: "gonzaga",         tier: "Elite",   potencialMinimo: 90, crescimentoMultiplicador: 1.15, exposicaoBonus: 10 },

  // Forte: potencial médio >= 80
  { nome: "UCLA",            slug: "ucla",            tier: "Forte",   potencialMinimo: 80, crescimentoMultiplicador: 1.08, exposicaoBonus: 5 },
  { nome: "Villanova",       slug: "villanova",       tier: "Forte",   potencialMinimo: 80, crescimentoMultiplicador: 1.08, exposicaoBonus: 5 },
  { nome: "Michigan State",  slug: "michigan-state",  tier: "Forte",   potencialMinimo: 80, crescimentoMultiplicador: 1.08, exposicaoBonus: 5 },
  { nome: "Arizona",         slug: "arizona",         tier: "Forte",   potencialMinimo: 80, crescimentoMultiplicador: 1.08, exposicaoBonus: 5 },

  // Mediana: potencial médio >= 65
  { nome: "Wisconsin",       slug: "wisconsin",       tier: "Mediana", potencialMinimo: 65, crescimentoMultiplicador: 1.0,  exposicaoBonus: 0 },
  { nome: "Xavier",          slug: "xavier",          tier: "Mediana", potencialMinimo: 65, crescimentoMultiplicador: 1.0,  exposicaoBonus: 0 },
  { nome: "Texas Tech",      slug: "texas-tech",      tier: "Mediana", potencialMinimo: 65, crescimentoMultiplicador: 1.0,  exposicaoBonus: 0 },
  { nome: "Saint Mary's",    slug: "saint-marys",     tier: "Mediana", potencialMinimo: 65, crescimentoMultiplicador: 1.0,  exposicaoBonus: 0 },

  // Fraca: sem requisito
  { nome: "Presbyterian",       slug: "presbyterian",       tier: "Fraca", potencialMinimo: 0, crescimentoMultiplicador: 0.95, exposicaoBonus: -8 },
  { nome: "Norfolk State",      slug: "norfolk-state",      tier: "Fraca", potencialMinimo: 0, crescimentoMultiplicador: 0.95, exposicaoBonus: -8 },
  { nome: "Mount St. Mary's",   slug: "mount-st-marys",     tier: "Fraca", potencialMinimo: 0, crescimentoMultiplicador: 0.95, exposicaoBonus: -8 },
  { nome: "Central Arkansas",   slug: "central-arkansas",   tier: "Fraca", potencialMinimo: 0, crescimentoMultiplicador: 0.95, exposicaoBonus: -8 },
];

UNIVERSIDADES.forEach((u) => {
  u.imagem = `img/universidades/${u.slug}.png`;
});

// Universidades elegíveis pro potencial médio deste jogador.
function universidadesElegiveis(potencialMedio) {
  return UNIVERSIDADES.filter((u) => potencialMedio >= u.potencialMinimo);
}

const api = { UNIVERSIDADES, universidadesElegiveis };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);
