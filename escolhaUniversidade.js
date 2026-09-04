// escolhaUniversidade.js
// Tela entre o draft de lendas e a carreira universitária: mostra só
// as universidades cujo requisito de potencial o jogador atende.
(function () {
  const { ATRIBUTOS, universidadesElegiveis } = window.CB;

  const elEscolha = document.createElement("div");
  elEscolha.id = "escolha-universidade";
  elEscolha.style.display = "none";
  const ancora = document.getElementById("painel-historico");
  ancora.parentNode.insertBefore(elEscolha, ancora);

  window.addEventListener("cb:draft-lendas-completo", (evento) => {
    const atributosFinais = evento.detail;
    const potencialMedio = Math.round(
      ATRIBUTOS.reduce((soma, a) => soma + atributosFinais[a], 0) / ATRIBUTOS.length
    );
    render(atributosFinais, potencialMedio);
  });

  function render(atributosFinais, potencialMedio) {
    const elegiveis = universidadesElegiveis(potencialMedio);
    elEscolha.style.display = "block";

    elEscolha.innerHTML = `
      <div class="carta-lenda carta-escolha-uni">
        <span class="lenda-posicao">Potencial ${potencialMedio}</span>
        <h2 class="lenda-nome">Escolha sua universidade</h2>
        <p class="meta-linha">Só programas que batem com o seu teto de potencial</p>
        <div class="lista-universidades">
          ${elegiveis
            .map(
              (u) => `
                <button class="uni-opcao" data-nome="${u.nome}" type="button">
                  <img class="uni-logo" src="${u.imagem}" alt="${u.nome}" loading="lazy" />
                  <span class="uni-info">
                    <span class="uni-tier">${u.tier}</span>
                    <span class="uni-nome">${u.nome}</span>
                    <span class="uni-meta">
                      crescimento ${u.crescimentoMultiplicador >= 1 ? "+" : ""}${Math.round((u.crescimentoMultiplicador - 1) * 100)}%
                      · exposição ${u.exposicaoBonus >= 0 ? "+" : ""}${u.exposicaoBonus}
                    </span>
                  </span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    `;

    elEscolha.querySelectorAll(".uni-opcao").forEach((btn) => {
      btn.addEventListener("click", () => {
        const universidade = elegiveis.find((u) => u.nome === btn.dataset.nome);
        elEscolha.style.display = "none";
        window.dispatchEvent(
          new CustomEvent("cb:iniciar-carreira", {
            detail: { atributos: atributosFinais, universidade },
          })
        );
      });
    });
  }
})();
