// universidade.js
// Tela da fase universitária: um botão "jogar temporada" por vez,
// mostrando o relatório de desempenho e o crescimento de cada atributo.
const LIMITE_TEMPORADAS_UNIVERSIDADE = 4; // padrão de elegibilidade (NCAA)

(function () {
  const { NOMES_ATRIBUTOS, ATRIBUTOS, criarJogadorDaCarreira, progredirTemporada } = window.CB;

  const elUniversidade = document.getElementById("universidade");
  let jogador = null;
  let ultimoRegistro = null;

  window.addEventListener("cb:iniciar-carreira", (evento) => {
    jogador = criarJogadorDaCarreira(evento.detail.atributos, 18);
    jogador.universidade = evento.detail.universidade;
    Object.assign(jogador, window.CB.personagem); // nome, posicao, altura, peso
    elUniversidade.style.display = "block";
    render();
  });

  function overallDe(mapaAtributos) {
    return Math.round(
      ATRIBUTOS.reduce((soma, a) => soma + mapaAtributos[a], 0) / ATRIBUTOS.length
    );
  }

  function renderCabecalho() {
    const uni = jogador.universidade;
    if (!uni) {
      return `
        <h2 class="lenda-nome">${jogador.nome}</h2>
        <p class="meta-linha">${jogador.posicao} · ${jogador.altura}cm · ${jogador.peso}kg</p>
      `;
    }

    return `
      <div class="uni-carreira-topo">
        <img class="uni-logo-grande" src="${uni.imagem}" alt="${uni.nome}" />
        <div class="uni-carreira-info">
          <span class="lenda-posicao">Temporada ${Math.min(jogador.temporada, LIMITE_TEMPORADAS_UNIVERSIDADE)}/${LIMITE_TEMPORADAS_UNIVERSIDADE} · ${jogador.idade} anos</span>
          <h2 class="lenda-nome">${jogador.nome}</h2>
          <p class="meta-linha uni-carreira-meta">${uni.nome} · ${jogador.posicao} · ${jogador.altura}cm · ${jogador.peso}kg</p>
        </div>
      </div>
    `;
  }

  function render() {
    const overallAtual = overallDe(jogador.atual);
    const overallPotencial = overallDe(jogador.potencial);

    elUniversidade.innerHTML = `
      <div class="carta-lenda">
        ${renderCabecalho()}

        <div class="stats-strip">
          <div class="stat-pill"><div class="stat-val">${overallAtual}</div><div class="stat-lab">Overall</div></div>
          <div class="stat-pill"><div class="stat-val">${overallPotencial}</div><div class="stat-lab">Potencial</div></div>
          <div class="stat-pill"><div class="stat-val">${jogador.idade}</div><div class="stat-lab">Idade</div></div>
        </div>

        <div class="trilha" style="margin-bottom:24px;">
          ${ATRIBUTOS.map((attr) => `
            <div class="slot preenchido">
              <div class="slot-label">${NOMES_ATRIBUTOS[attr]}</div>
              <div class="slot-valor">${jogador.atual[attr]}<span style="font-size:0.9rem;color:var(--text-muted);"> / ${jogador.potencial[attr]}</span></div>
            </div>
          `).join("")}
        </div>

        ${ultimoRegistro ? renderRelatorio(ultimoRegistro) : ""}

        <div class="acoes-stack">${renderAcaoPrincipal()}</div>
      </div>
    `;

    const btnJogar = document.getElementById("btn-jogar-temporada");
    if (btnJogar) {
      btnJogar.addEventListener("click", () => {
        ultimoRegistro = progredirTemporada(jogador);
        render();
      });
    }

    const btnDraftNba = document.getElementById("btn-draft-nba");
    if (btnDraftNba) {
      btnDraftNba.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("cb:declarar-draft-nba", { detail: jogador }));
      });
    }
  }

  function renderAcaoPrincipal() {
    const temporadasJogadas = jogador.temporada - 1;
    const elegibilidadeEsgotada = jogador.temporada > LIMITE_TEMPORADAS_UNIVERSIDADE;
    if (elegibilidadeEsgotada) {
      return `
        <p style="color:var(--text-muted); margin-bottom:12px;">
          Elegibilidade universitária esgotada (${LIMITE_TEMPORADAS_UNIVERSIDADE} temporadas).
        </p>
        <button class="acao" id="btn-draft-nba">Ir para o Draft da NBA</button>
      `;
    }
    return `
      ${
        temporadasJogadas > 0
          ? `<p class="meta-linha compacta" style="margin-bottom:12px;">
               Você já pode declarar pro draft, mas cada temporada a mais costuma dar mais exposição.
             </p>`
          : ""
      }
      <button class="acao" id="btn-jogar-temporada">Jogar temporada</button>
      <button class="acao secundaria" id="btn-draft-nba">Declarar para o Draft da NBA</button>
    `;
  }

  function renderRelatorio(registro) {
    const linhas = ATRIBUTOS.map((attr) => {
      const delta = registro.crescimentos[attr];
      const sinal = delta > 0 ? "+" : "";
      const cor = delta > 0 ? "var(--amber)" : delta < 0 ? "var(--danger)" : "var(--text-muted)";
      return `<div class="historico-item"><span>${NOMES_ATRIBUTOS[attr]}</span><span style="color:${cor}">${sinal}${delta}</span></div>`;
    }).join("");

    return `
      <div class="historico" style="margin-bottom:24px; text-align:left;">
        <h2>Temporada ${registro.temporada} — desempenho ${registro.desempenho}/100</h2>
        ${linhas}
      </div>
    `;
  }
})();