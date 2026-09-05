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
  const NACIONALIDADES = [
    ["BR", "🇧🇷", "Brasil"], ["US", "🇺🇸", "Estados Unidos"], ["CA", "🇨🇦", "Canadá"], ["FR", "🇫🇷", "França"],
    ["ES", "🇪🇸", "Espanha"], ["AU", "🇦🇺", "Austrália"], ["RS", "🇷🇸", "Sérvia"], ["DE", "🇩🇪", "Alemanha"], ["AR", "🇦🇷", "Argentina"], ["OTHER", "🌍", "Outra"],
  ];

  let posicaoSelecionada = "PG";
  const GALERIA_ABERTURA = [
    "img/abertura-01.png", "img/abertura-02.png", "img/abertura-03.png", "img/abertura-04.png",
    "img/abertura-05.png", "img/abertura-06.png", "img/abertura-07.png",
  ];

  elCriacao.innerHTML = `
    <section class="hero-criacao">
      <div class="hero-criacao-copy">
        <span class="eyebrow">Simulador de carreira</span>
        <h1 class="hero-title">Você é um fenômeno da NBA?</h1>
        <p class="hero-lead">
          Roube um atributo de cada lenda, monte um jogador impossível e viva a carreira inteira —
          da universidade até o topo da liga. Até onde você chega?
        </p>
      </div>
      <figure class="hero-cena" aria-label="Galeria de grandes momentos do basquete">
        <div class="hero-cena-trilho">
          ${[...GALERIA_ABERTURA, GALERIA_ABERTURA[0]].map((foto, indice) => `<img src="${foto}" alt="Momento marcante do basquete ${indice < GALERIA_ABERTURA.length ? indice + 1 : 1}" />`).join("")}
        </div>
        <span class="hero-cena-luz" aria-hidden="true"></span>
        <figcaption><b>O LEGADO NÃO É DADO.</b><span>É construído posse por posse.</span><i aria-hidden="true">01 — 07</i></figcaption>
      </figure>
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

      <div class="campo-row">
        <label class="campo">
          Número da camisa
          <span class="hint">De 0 a 99</span>
          <input id="input-camisa" type="number" value="0" min="0" max="99" inputmode="numeric" />
        </label>
        <label class="campo">
          Nacionalidade
          <select id="input-nacionalidade">${NACIONALIDADES.map(([codigo, bandeira, nome]) => `<option value="${codigo}"${codigo === "BR" ? " selected" : ""}>${bandeira} ${nome}</option>`).join("")}</select>
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
    const numeroCamisa = Number(document.getElementById("input-camisa").value);
    const nacionalidadeCodigo = document.getElementById("input-nacionalidade").value;
    const nacionalidade = NACIONALIDADES.find(([codigo]) => codigo === nacionalidadeCodigo) || NACIONALIDADES[0];
    if (!Number.isInteger(numeroCamisa) || numeroCamisa < 0 || numeroCamisa > 99) {
      document.getElementById("input-camisa").focus();
      return;
    }

    window.CB.personagem = { nome, posicao: posicaoSelecionada, altura, peso, numeroCamisa, nacionalidade: nacionalidade[2], bandeira: nacionalidade[1], codigoNacionalidade: nacionalidade[0] };

    elCriacao.style.display = "none";
    document.getElementById("titulo-draft").style.display = "block";
    document.getElementById("subtitulo-draft").style.display = "block";
    document.getElementById("trilha").style.display = "block";
    document.getElementById("carta-lenda").style.display = "block";
    document.getElementById("painel-historico").style.display = "block";

    window.dispatchEvent(new CustomEvent("cb:personagem-criado", { detail: window.CB.personagem }));
  });
})();
