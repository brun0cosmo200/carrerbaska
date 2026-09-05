// engine.js
// Motor do draft de lendas: sorteia lenda com slot vazio disponível,
// e aplica o roubo de UM dos 2 atributos-marca dela (o outro é perdido).
(function (global) {

// No navegador, CB.ATRIBUTOS/CB.LENDAS já existem (data.js roda antes,
// via <script>, e escreve em window.CB). No Node, pegamos via require.
const dados =
  typeof module !== "undefined" && module.exports
    ? require("./data.js")
    : global.CB;

const { ATRIBUTOS, LENDAS } = dados;

function novoEstadoDraft() {
  const atributos = {};
  ATRIBUTOS.forEach((a) => (atributos[a] = null));
  return {
    atributos,          // { arremesso: null|valor, ... } — preenche conforme rouba
    lendasRestantes: [...LENDAS], // pool ainda não usado no draft
    historico: [],      // registro de cada roubo (pra tela de recap)
  };
}

// Lendas elegíveis nesta rodada: têm pelo menos 1 marca cujo slot ainda está vazio.
function lendasElegiveis(estado) {
  return estado.lendasRestantes.filter((lenda) =>
    lenda.marcas.some((m) => estado.atributos[m] === null)
  );
}

// Sorteia 1 lenda elegível pra apresentar na rodada.
function sortearLenda(estado) {
  const elegiveis = lendasElegiveis(estado);
  if (elegiveis.length === 0) return null; // draft completo
  const idx = Math.floor(Math.random() * elegiveis.length);
  return elegiveis[idx];
}

// Quais marcas da lenda o jogador pode de fato escolher agora
// (algumas podem já estar preenchidas por outra lenda anterior).
function marcasEscolhiveis(estado, lenda) {
  return lenda.marcas.filter((m) => estado.atributos[m] === null);
}

// Aplica o roubo: joga o valor da marca escolhida no atributo do jogador,
// remove a lenda do pool (a outra marca dela, se ainda vazia, é perdida
// — "a porta fecha").
function roubarAtributo(estado, lendaId, atributoEscolhido) {
  const lenda = estado.lendasRestantes.find((l) => l.id === lendaId);
  if (!lenda) throw new Error("Lenda não está mais disponível.");

  const escolhiveis = marcasEscolhiveis(estado, lenda);
  if (!escolhiveis.includes(atributoEscolhido)) {
    throw new Error("Atributo inválido ou já preenchido: " + atributoEscolhido);
  }

  const atributoPerdido = lenda.marcas.find((m) => m !== atributoEscolhido);
  const valorPerdidoDisponivel = estado.atributos[atributoPerdido] === null;

  estado.atributos[atributoEscolhido] = lenda.valores[atributoEscolhido];
  estado.lendasRestantes = estado.lendasRestantes.filter((l) => l.id !== lendaId);
  estado.historico.push({
    lendaId: lenda.id,
    lenda: lenda.nome,
    roubado: atributoEscolhido,
    valor: lenda.valores[atributoEscolhido],
    perdido: valorPerdidoDisponivel ? atributoPerdido : null, // só conta como "perda" se o slot ainda estava aberto
  });

  return estado;
}

function draftCompleto(estado) {
  return ATRIBUTOS.every((a) => estado.atributos[a] !== null);
}

const api = {
  novoEstadoDraft,
  lendasElegiveis,
  sortearLenda,
  marcasEscolhiveis,
  roubarAtributo,
  draftCompleto,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);
