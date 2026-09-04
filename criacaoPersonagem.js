// criacaoPersonagem.js
// Primeira tela do jogo: cria o personagem (nome, posição, altura, peso)
// antes de entrar no draft de lendas.
(function () {
  const elCriacao = document.getElementById("criacao-personagem");

  const POSICOES = [
    { value: "PG", label: "Armador" },
    { value: "SG", label: "Ala-armador" },
    { value: "SF", label: "Ala" },
    { value: "PF", label: "Ala-pivô" },
    { value: "C", label: "Pivô" },
  ];

  let posicaoSelecionada = "PG";

  elCriacao.innerHTML = `
    <section class="hero-criacao">
      <span class="eyebrow">Simulador de carreira</span>
      <h1 class="hero-title">Você é um fenômeno da NBA?</h1>
      <p class="hero-lead">
        Roube um atributo de cada lenda, monte um jogador impossível e viva a carreira inteira —
        da universidade até o topo da liga. Até onde você chega?
      </p>
    </section>

    <div class="painel-form">
      <label class="campo">
        Seu nome
        <span class="hint">O que o narrador vai gritar</span>
        <input id="input-nome" type="text" placeholder="Nome do jogador" maxlength="30" autocomplete="off" />
      </label>

      <div class="campo" style="margin-top:20px;">
        Escolha sua posição
        <div class="chip-grid" id="grid-posicoes" role="group" aria-label="Posição">
          ${POSICOES.map(
            (p) => `
              <button type="button" class="chip${p.value === posicaoSelecionada ? " ativo" : ""}" data-posicao="${p.value}">
                <span class="chip-code">${p.value}</span>${p.label}
              </button>
            `
          ).join("")}
        </div>
      </div>

      <div class="campo-row">
        <label class="campo">
          Altura (cm)
          <input id="input-altura" type="number" value="198" min="170" max="230" />
        </label>
        <label class="campo">
          Peso (kg)
          <input id="input-peso" type="number" value="95" min="70" max="150" />
        </label>
      </div>

      <div class="acoes-stack" style="margin-top:28px;">
        <button class="acao" id="btn-criar-personagem">Começar o draft</button>
      </div>
    </div>
  `;

  const grid = document.getElementById("grid-posicoes");
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    posicaoSelecionada = btn.dataset.posicao;
    grid.querySelectorAll(".chip").forEach((c) => c.classList.toggle("ativo", c === btn));
  });

  document.getElementById("btn-criar-personagem").addEventListener("click", () => {
    const nome = document.getElementById("input-nome").value.trim() || "Jogador";
    const altura = Number(document.getElementById("input-altura").value);
    const peso = Number(document.getElementById("input-peso").value);

    window.CB.personagem = { nome, posicao: posicaoSelecionada, altura, peso };

    elCriacao.style.display = "none";
    document.getElementById("titulo-draft").style.display = "block";
    document.getElementById("subtitulo-draft").style.display = "block";
    document.getElementById("trilha").style.display = "flex";
    document.getElementById("carta-lenda").style.display = "block";
    document.getElementById("painel-historico").style.display = "block";

    window.dispatchEvent(new CustomEvent("cb:personagem-criado", { detail: window.CB.personagem }));
  });
})();
