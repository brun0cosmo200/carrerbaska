// draftNba.js
// Transição universidade -> NBA: calcula a posição do jogador no
// draft com base no desempenho universitário (pior desempenho =
// escolhe primeiro, como a loteria real).
(function (global) {

const dados =
  typeof module !== "undefined" && module.exports
    ? require("./data.js")
    : global.CB;

const timesData =
  typeof module !== "undefined" && module.exports
    ? require("./times.js")
    : global.CB;

const { ATRIBUTOS } = dados;
const { TIMES } = timesData;

const TOTAL_POSICOES = 60; // 2 rounds, padrão NBA
const VARIACAO_LOTERIA = 3; // +-3 posições de aleatoriedade

function overallDe(mapaAtributos) {
  return ATRIBUTOS.reduce((soma, a) => soma + mapaAtributos[a], 0) / ATRIBUTOS.length;
}

// Métrica 0-100: média entre o overall final e a média de desempenho
// das temporadas jogadas na universidade.
function calcularMetricaDraft(jogador) {
  const overallFinal = overallDe(jogador.atual);
  const desempenhos = jogador.historicoTemporadas.map((t) => t.desempenho);
  const mediaDesempenho =
    desempenhos.length > 0
      ? desempenhos.reduce((a, b) => a + b, 0) / desempenhos.length
      : overallFinal;
  const exposicaoBonus = jogador.universidade ? jogador.universidade.exposicaoBonus : 0;
  const metrica = (overallFinal + mediaDesempenho) / 2 + exposicaoBonus;
  return Math.max(0, Math.min(100, metrica));
}

// Métrica alta = escolha baixa (nº 1). Métrica baixa = escolha alta (nº 60).
function calcularPosicaoDraft(jogador) {
  const metrica = calcularMetricaDraft(jogador);
  const posicaoBase = TOTAL_POSICOES - (metrica / 100) * (TOTAL_POSICOES - 1);
  const variacao = (Math.random() * 2 - 1) * VARIACAO_LOTERIA;
  const posicaoFinal = Math.round(posicaoBase + variacao);
  return Math.max(1, Math.min(TOTAL_POSICOES, posicaoFinal));
}

// Ordem do draft sorteada na hora (loteria ponderada por força).
// 2ª rodada repete a ordem da 1ª.
function timeNaPosicao(posicao, ordemDraft) {
  const ordem =
    ordemDraft ||
    (typeof global !== "undefined" && global.CB && global.CB.gerarOrdemDraftLoteria
      ? global.CB.gerarOrdemDraftLoteria(TIMES)
      : [...TIMES].sort((a, b) => a.forca - b.forca + (Math.random() - 0.5) * 8));
  const indice = (posicao - 1) % ordem.length;
  return ordem[indice];
}

const api = { TOTAL_POSICOES, calcularMetricaDraft, calcularPosicaoDraft, timeNaPosicao };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);

// --- Tela de resultado (só roda no navegador) ---
if (typeof window !== "undefined") {
  window.addEventListener("cb:declarar-draft-nba", (evento) => {
    const jogador = evento.detail;
    const { calcularPosicaoDraft, TOTAL_POSICOES, timeNaPosicao, gerarOrdemDraftLoteria, TIMES } = window.CB;
    const posicao = calcularPosicaoDraft(jogador);
    const round = posicao <= 30 ? 1 : 2;
    const ordemDraft = gerarOrdemDraftLoteria
      ? gerarOrdemDraftLoteria(TIMES)
      : [...TIMES].sort((a, b) => a.forca - b.forca + (Math.random() - 0.5) * 10);
    const time = timeNaPosicao(posicao, ordemDraft);
    jogador.time = time;

    document.getElementById("universidade").style.display = "none";

    const contextoInicial = round === 1 ? "nba" : "gleague";
    const rotuloContexto = round === 1 ? "elenco da NBA" : "G-League (contrato two-way)";

    const elResultado = document.createElement("div");
    elResultado.id = "resultado-draft";
    elResultado.innerHTML = `
      <div class="carta-lenda tela-final">
        <span class="lenda-posicao">Draft da NBA</span>
        <div class="draft-time-destaque">
          <img class="time-logo-draft" src="${time.imagem}" alt="${time.nome}" />
          <div>
            <p class="draft-time-label">Draftado por</p>
            <h2 class="lenda-nome draft-time-nome">${time.nome}</h2>
            <p class="meta-linha compacta">força ${time.forca} · ${time.conferencia} · ${jogador.nome}</p>
          </div>
        </div>
        <p class="meta-linha">${jogador.posicao} · ${jogador.altura}cm · ${jogador.peso}kg</p>
        <div class="overall" style="margin:12px 0;">${posicao}ª</div>
        <p class="meta-linha compacta">${round}ª rodada · escolha ${posicao} de ${TOTAL_POSICOES}</p>
        <p class="meta-linha">Começa em: <b style="color:var(--text);">${rotuloContexto}</b></p>
        <div class="acoes-stack">
          <button class="acao" id="btn-iniciar-profissional">Começar carreira profissional</button>
        </div>
      </div>
    `;
    const ancoraDraft = document.getElementById("painel-historico");
    ancoraDraft.parentNode.insertBefore(elResultado, ancoraDraft);

    document.getElementById("btn-iniciar-profissional").addEventListener("click", () => {
      jogador.contexto = contextoInicial;
      elResultado.style.display = "none";
      window.dispatchEvent(new CustomEvent("cb:iniciar-carreira-profissional", { detail: jogador }));
    });
  });
}