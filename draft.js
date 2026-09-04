// draft.js
// Camada de UI do draft. Não tem regra de jogo aqui — só chama CB (engine.js)
// e renderiza o estado no DOM.
(function () {
  const {
    ATRIBUTOS,
    NOMES_ATRIBUTOS,
    novoEstadoDraft,
    sortearLenda,
    marcasEscolhiveis,
    roubarAtributo,
    draftCompleto,
  } = window.CB;

  let estado = novoEstadoDraft();

  const elTrilha = document.getElementById("trilha");
  const elCarta = document.getElementById("carta-lenda");
  const elHistorico = document.getElementById("lista-historico");

  function nomeAtributo(chave) {
    return NOMES_ATRIBUTOS[chave];
  }

  function renderTrilha() {
    elTrilha.innerHTML = "";
    ATRIBUTOS.forEach((attr) => {
      const valor = estado.atributos[attr];
      const div = document.createElement("div");
      div.className = "slot" + (valor !== null ? " preenchido" : "");
      div.innerHTML = `
        <div class="slot-label">${nomeAtributo(attr)}</div>
        <div class="slot-valor">${valor !== null ? valor : "--"}</div>
      `;
      elTrilha.appendChild(div);
    });
  }

  function renderHistorico() {
    elHistorico.innerHTML = "";
    estado.historico
      .slice()
      .reverse()
      .forEach((h) => {
        const li = document.createElement("div");
        li.className = "historico-item";
        const perdaTexto = h.perdido
          ? `perdeu ${nomeAtributo(h.perdido)}`
          : "sem perda (slot já ocupado)";
        li.innerHTML = `<span><b>${h.lenda}</b> — ${nomeAtributo(h.roubado)} (${h.valor})</span><span>${perdaTexto}</span>`;
        elHistorico.appendChild(li);
      });
  }

  function renderRodada() {
    renderTrilha();
    renderHistorico();

    if (draftCompleto(estado)) {
      renderTelaFinal();
      return;
    }

    const lenda = sortearLenda(estado);
    const opcoes = marcasEscolhiveis(estado, lenda);

    elCarta.innerHTML = `
      <div class="carta-lenda">
        <span class="lenda-posicao">${lenda.posicao}</span>
        <h2 class="lenda-nome">${lenda.nome}</h2>
        <div class="opcoes">
          ${opcoes
            .map((attr) => {
              const outraMarca = lenda.marcas.find((m) => m !== attr);
              const vaiPerder = estado.atributos[outraMarca] === null;
              return `
                <button class="opcao-atributo" data-lenda="${lenda.id}" data-atributo="${attr}">
                  <span class="rotulo">${nomeAtributo(attr)}</span>
                  <span class="valor">${lenda.valores[attr]}</span>
                  ${vaiPerder ? `<span class="perde">abre mão de ${nomeAtributo(outraMarca)}</span>` : ""}
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;

    elCarta.querySelectorAll(".opcao-atributo").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lendaId = Number(btn.dataset.lenda);
        const atributo = btn.dataset.atributo;
        roubarAtributo(estado, lendaId, atributo);
        renderRodada();
      });
    });
  }

  function renderTelaFinal() {
    const overall = Math.round(
      ATRIBUTOS.reduce((soma, a) => soma + estado.atributos[a], 0) / ATRIBUTOS.length
    );

    elCarta.innerHTML = `
      <div class="carta-lenda tela-final">
        <span class="lenda-posicao">Carta pronta</span>
        <h2 class="lenda-nome">Draft completo</h2>
        <div class="overall">${overall}</div>
        <p class="meta-linha compacta">overall médio dos atributos roubados</p>
        <div class="acoes-stack">
          <button class="acao" id="btn-iniciar-carreira">Iniciar carreira universitária</button>
          <button class="acao secundaria" id="btn-reiniciar">Sortear outro jogador</button>
        </div>
      </div>
    `;

    document.getElementById("btn-reiniciar").addEventListener("click", () => {
      estado = novoEstadoDraft();
      renderRodada();
    });

    document.getElementById("btn-iniciar-carreira").addEventListener("click", () => {
      document.getElementById("trilha").style.display = "none";
      elCarta.style.display = "none";
      document.getElementById("painel-historico").style.display = "none";
      window.dispatchEvent(
        new CustomEvent("cb:draft-lendas-completo", { detail: { ...estado.atributos } })
      );
    });
  }

  window.addEventListener("cb:personagem-criado", () => {
    renderRodada();
  });
})();
