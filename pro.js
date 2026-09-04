// pro.js
// Loop de temporada da carreira profissional: NBA <-> G-League,
// com offseason (ficar / pedir troca / ofertas).
(function () {
  const { NOMES_ATRIBUTOS, ATRIBUTOS, progredirTemporada, TIMES } = window.CB;
  const { simularTemporadaCompleta } = window.CB;
  const {
    initCarreiraPro,
    sugerirPapel,
    infoPapel,
    avaliarPremiosIndividuais,
    acumularPremios,
    montarResumoCarreira,
    baixarCartaCarreira,
    copiarResumoCarreira,
  } = window.CB;

  const LIMIAR_CALLUP = 75;
  const LIMIAR_SENDDOWN = 40;
  const LIMIAR_APOSENTADORIA = 0.75; // queda de forma: overall abaixo de 75% do pico
  const ANOS_EXTRA_APOS_DECLINIO = 6; // teto absoluto: joga no máximo até idadeDeclinio + isso

  // Chance de pendurar as chuteiras por idade, independente de queda de
  // forma. Cresce com o quadrado dos anos já em declínio — no 1º ano de
  // declínio é raro parar (~5%), depois de 5-6 anos fica bem provável,
  // e o teto absoluto (idadeDeclinio + ANOS_EXTRA_APOS_DECLINIO) garante
  // que ninguém joga pra sempre mesmo em ótima forma.
  function chanceAposentadoriaPorIdade(jogador) {
    if (jogador.idade < jogador.idadeDeclinio) return 0;
    const anosDeclinio = jogador.idade - jogador.idadeDeclinio;
    return Math.min(0.92, 0.05 + anosDeclinio * anosDeclinio * 0.015);
  }

  function idadeAposentadoriaMaxima(jogador) {
    return jogador.idadeDeclinio + ANOS_EXTRA_APOS_DECLINIO;
  }

  const elPro = document.createElement("div");
  elPro.id = "carreira-pro";
  elPro.style.display = "none";
  const ancoraPro = document.getElementById("painel-historico");
  ancoraPro.parentNode.insertBefore(elPro, ancoraPro);

  let jogador = null;
  let ultimoRegistro = null;
  let aposentado = false;
  let motivoAposentadoria = null;
  let eventoPendente = null;
  let ultimoRelatorioTemporada = null;
  let offseason = null; // { ofertas, forçada, ultimoMovimento }
  let temporadasNoTimeAtual = 0;
  let ultimosPremiosIndividuais = null;
  let resumoCarreira = null;

  window.addEventListener("cb:iniciar-carreira-profissional", (evento) => {
    jogador = evento.detail;
    jogador.temporada = 1;
    jogador.historicoTimes = jogador.historicoTimes || [];
    initCarreiraPro(jogador);
    if (jogador.time) {
      jogador.historicoTimes.push({
        nome: jogador.time.nome,
        imagem: jogador.time.imagem,
        conferencia: jogador.time.conferencia,
        temporadaInicio: 1,
        temporadaFim: null,
      });
    }
    temporadasNoTimeAtual = 0;
    offseason = null;
    elPro.style.display = "block";
    render();
  });

  function overallDe(mapaAtributos) {
    return Math.round(
      ATRIBUTOS.reduce((soma, a) => soma + mapaAtributos[a], 0) / ATRIBUTOS.length
    );
  }

  function nomeContexto(contexto) {
    return contexto === "nba" ? "NBA" : "G-League";
  }

  function fecharPassagemNoTime() {
    if (!jogador.historicoTimes || !jogador.historicoTimes.length) return;
    const atual = jogador.historicoTimes[jogador.historicoTimes.length - 1];
    if (atual && atual.temporadaFim === null) {
      atual.temporadaFim = Math.max(1, jogador.temporada - 1);
    }
  }

  function trocarTime(novoTime, motivo) {
    const anterior = jogador.time;
    fecharPassagemNoTime();
    jogador.time = novoTime;
    jogador.contexto = "nba";
    temporadasNoTimeAtual = 0;
    jogador.historicoTimes.push({
      nome: novoTime.nome,
      imagem: novoTime.imagem,
      conferencia: novoTime.conferencia,
      temporadaInicio: jogador.temporada,
      temporadaFim: null,
    });
    offseason = {
      ...offseason,
      ultimoMovimento: {
        de: anterior,
        para: novoTime,
        motivo,
      },
      ofertas: [],
      forçada: null,
      pedindo: false,
    };
  }

  // Times com interesse real: rebuilders querem talento; contenders querem peças.
  function calcularOfertasDeTroca() {
    const overall = overallDe(jogador.atual);
    const idade = jogador.idade;
    const timeAtual = jogador.time;

    return TIMES.filter((t) => t.nome !== timeAtual.nome)
      .map((t) => {
        let score = Math.random() * 28;
        if (overall >= t.forca - 8) score += 22;
        if (overall >= 78 && t.forca <= 82) score += 24;
        if (overall >= 85 && t.forca >= 84) score += 20;
        if (idade <= 24) score += 16;
        if (idade <= 27) score += 8;
        if (idade >= 32) score -= 18;
        if (idade >= 35) score -= 25;
        if (t.conferencia === timeAtual.conferencia) score += 4;
        // Time fraco atual: mais gente quer "resgatar"
        if (timeAtual.forca <= 78 && overall >= 80) score += 10;
        return { time: t, score: Math.round(score) };
      })
      .filter((o) => o.score >= 48)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  function iniciarOffseason() {
    const ofertas = jogador.contexto === "nba" && jogador.time ? calcularOfertasDeTroca() : [];
    let forçada = null;

    // Temporada ruim + overall abaixo do time → risco de ser mandado embora.
    if (
      jogador.contexto === "nba" &&
      jogador.time &&
      ultimoRegistro &&
      ultimoRegistro.desempenho < 48 &&
      overallDe(jogador.atual) < jogador.time.forca - 6 &&
      Math.random() < 0.4 &&
      ofertas.length
    ) {
      forçada = ofertas[Math.floor(Math.random() * Math.min(2, ofertas.length))];
    }

    offseason = {
      ofertas,
      forçada,
      pedindo: false,
      ultimoMovimento: null,
    };
    eventoPendente = forçada ? "trade-forçada" : "offseason";
  }

  function jogarTemporada() {
    // Papel reavaliado a cada temporada, com base no encaixe atual do
    // jogador no elenco — afeta minutos (e portanto médias) e lesão.
    jogador.papel = sugerirPapel(jogador);
    const contextoDaTemporada = jogador.contexto;

    const relatorioTemporada = simularTemporadaCompleta(jogador);
    ultimoRelatorioTemporada = relatorioTemporada;
    ultimoRegistro = progredirTemporada(jogador, relatorioTemporada.desempenhoMedio);
    temporadasNoTimeAtual++;
    eventoPendente = null;
    offseason = null;
    ultimosPremiosIndividuais = null;

    if (contextoDaTemporada === "nba") {
      jogador.temporadasNba = (jogador.temporadasNba || 0) + 1;
      const individuais = avaliarPremiosIndividuais(jogador, relatorioTemporada);
      const ganhos = acumularPremios(jogador, individuais, `Temporada ${jogador.temporadasNba}`);
      if (ganhos.length) ultimosPremiosIndividuais = ganhos;
    }

    const emDeclinio = jogador.idade >= jogador.idadeDeclinio;
    const overallAtual = ultimoRegistro.overallApos;

    const quedaDeForma = emDeclinio && overallAtual < jogador.picoOverall * LIMIAR_APOSENTADORIA;
    const idadeLimite = jogador.idade >= idadeAposentadoriaMaxima(jogador);
    const sorteioIdade = emDeclinio && Math.random() < chanceAposentadoriaPorIdade(jogador);

    if (quedaDeForma || idadeLimite || sorteioIdade) {
      motivoAposentadoria = idadeLimite ? "idade" : quedaDeForma ? "queda-de-forma" : "escolha";
      fecharPassagemNoTime();
      aposentado = true;
      eventoPendente = "aposentadoria";
      render();
      return;
    }

    if (jogador.contexto === "gleague" && relatorioTemporada.desempenhoMedio >= LIMIAR_CALLUP) {
      eventoPendente = "callup-disponivel";
    } else if (jogador.contexto === "nba" && relatorioTemporada.desempenhoMedio < LIMIAR_SENDDOWN) {
      jogador.contexto = "gleague";
      eventoPendente = "senddown";
    } else if (jogador.contexto === "nba") {
      iniciarOffseason();
    }

    render();
  }

  function tentarCallup() {
    const chance = ultimoRegistro.desempenho;
    const sucesso = Math.random() * 100 < chance;
    if (sucesso) {
      jogador.contexto = "nba";
      eventoPendente = "callup-sucesso";
    } else {
      eventoPendente = "callup-falha";
    }
    render();
  }

  function continuarAposEvento() {
    if (jogador.contexto === "nba") {
      iniciarOffseason();
    } else {
      eventoPendente = null;
      offseason = null;
    }
    render();
  }

  function ficarNoTime() {
    eventoPendente = null;
    offseason = offseason
      ? { ...offseason, pedindo: false, forçada: null, ultimoMovimento: null }
      : null;
    render();
  }

  function abrirPedidosDeTroca() {
    if (!offseason) return;
    if (!offseason.ofertas.length) {
      offseason = { ...offseason, pedindo: true, semInteresse: true };
    } else {
      offseason = { ...offseason, pedindo: true, semInteresse: false };
    }
    eventoPendente = "offseason-pedindo";
    render();
  }

  function aceitarOferta(nomeTime) {
    const oferta = offseason.ofertas.find((o) => o.time.nome === nomeTime);
    if (!oferta) return;
    trocarTime(oferta.time, "Troca pedida na offseason");
    eventoPendente = "trade-aceito";
    render();
  }

  function aceitarTrocaForcada() {
    if (!offseason || !offseason.forçada) return;
    trocarTime(offseason.forçada.time, "Trocado pelo time na offseason");
    eventoPendente = "trade-forçada-feita";
    render();
  }

  function renderCabecalhoPro() {
    const time = jogador.time;
    if (!time) {
      return `
        <span class="lenda-posicao">${nomeContexto(jogador.contexto)} — Temporada ${jogador.temporada} · ${jogador.idade} anos</span>
        <h2 class="lenda-nome">${jogador.nome}</h2>
        <p class="meta-linha">${jogador.posicao} · ${jogador.altura}cm · ${jogador.peso}kg</p>
      `;
    }

    return `
      <div class="uni-carreira-topo">
        <img class="uni-logo-grande" src="${time.imagem}" alt="${time.nome}" />
        <div class="uni-carreira-info">
          <span class="lenda-posicao">${nomeContexto(jogador.contexto)} · ${time.conferencia || ""} — Temporada ${jogador.temporada} · ${jogador.idade} anos</span>
          <h2 class="lenda-nome">${jogador.nome}</h2>
          <p class="meta-linha uni-carreira-meta">${time.nome} · ${jogador.posicao} · ${jogador.altura}cm · ${jogador.peso}kg</p>
        </div>
      </div>
    `;
  }

  function renderHistoricoTimes() {
    if (!jogador.historicoTimes || jogador.historicoTimes.length < 2) return "";
    return `
      <div class="historico-times">
        <h2>Times na carreira</h2>
        ${jogador.historicoTimes
          .map((h) => {
            const fim = h.temporadaFim === null ? "atual" : `T${h.temporadaFim}`;
            return `
              <div class="historico-times-item">
                <img class="mini-logo" src="${h.imagem}" alt="" />
                <span class="mini-nome">${h.nome}</span>
                <span class="mini-rec">T${h.temporadaInicio}–${fim}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function render() {
    const overallAtual = overallDe(jogador.atual);
    const overallPotencial = overallDe(jogador.potencial);

    if (aposentado) {
      resumoCarreira = montarResumoCarreira(jogador);
      const r = resumoCarreira;
      const p = r.premios;
      const logoTime = jogador.time
        ? `<img class="time-logo-draft" src="${jogador.time.imagem}" alt="${jogador.time.nome}" style="margin:0 auto 12px;" />`
        : "";
      const textoMotivo =
        motivoAposentadoria === "idade"
          ? "Encerrou por idade"
          : motivoAposentadoria === "queda-de-forma"
          ? "Encerrou após queda de rendimento"
          : "Decidiu se aposentar";

      const premiosResumo = [
        ["Anéis", p.aneis || 0],
        ["MVP", p.mvp || 0],
        ["All-Star", p.allStar || 0],
        ["All-NBA", p.allNba || 0],
        ["DPOY", p.dpoy || 0],
        ["Sexto Homem", p.sixthMan || 0],
      ];

      elPro.innerHTML = `
        <div class="carta-lenda tela-final">
          <span class="lenda-posicao">Fim de carreira</span>
          ${logoTime}
          <h2 class="lenda-nome">${jogador.nome}</h2>
          <p class="meta-linha">Aposentado aos ${jogador.idade} anos${jogador.time ? " · " + jogador.time.nome : ""}</p>
          <p class="meta-linha compacta">${textoMotivo}</p>

          <div class="stats-strip" style="margin:16px 0;">
            <div class="stat-pill"><div class="stat-val" style="color:${r.veredito.cor};">${r.veredito.titulo}</div><div class="stat-lab">Veredito</div></div>
            <div class="stat-pill"><div class="stat-val">${r.veredito.pontos}</div><div class="stat-lab">Score de carreira</div></div>
          </div>

          <div class="overall">${jogador.picoOverall}</div>
          <p class="meta-linha compacta">pico de overall na carreira</p>
          <p class="meta-linha">Overall final: ${overallAtual} · ${r.temporadasNba} temporadas na NBA</p>

          <div class="trilha" style="margin:20px 0;">
            ${premiosResumo
              .map(
                (s) => `
              <div class="slot preenchido">
                <div class="slot-label">${s[0]}</div>
                <div class="slot-valor">${s[1]}</div>
              </div>
            `
              )
              .join("")}
          </div>

          ${renderHistoricoTimes()}

          <div class="acoes-stack" style="margin-top:20px;">
            <button class="acao" id="btn-baixar-carta">Baixar carta da carreira</button>
            <button class="acao secundaria" id="btn-copiar-resumo">Copiar resumo</button>
          </div>
        </div>
      `;

      const btnBaixar = document.getElementById("btn-baixar-carta");
      if (btnBaixar) btnBaixar.addEventListener("click", () => baixarCartaCarreira(resumoCarreira));

      const btnCopiar = document.getElementById("btn-copiar-resumo");
      if (btnCopiar) {
        btnCopiar.addEventListener("click", async () => {
          const ok = await copiarResumoCarreira(resumoCarreira);
          btnCopiar.textContent = ok ? "Copiado!" : "Não foi possível copiar";
          setTimeout(() => {
            btnCopiar.textContent = "Copiar resumo";
          }, 2000);
        });
      }
      return;
    }

    elPro.innerHTML = `
      <div class="carta-lenda">
        ${renderCabecalhoPro()}
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

        ${ultimoRelatorioTemporada ? renderResumoTemporada(ultimoRelatorioTemporada) : ""}
        ${renderPremiosIndividuais()}
        ${ultimoRegistro ? renderRelatorio(ultimoRegistro) : ""}
        ${renderEvento()}
        ${renderOffseason()}
        ${renderAcaoPrincipal()}
      </div>
    `;

    bindEventos();
  }

  function bindEventos() {
    const btnJogar = document.getElementById("btn-jogar-temporada-pro");
    if (btnJogar) btnJogar.addEventListener("click", jogarTemporada);

    const btnCallup = document.getElementById("btn-tentar-callup");
    if (btnCallup) btnCallup.addEventListener("click", tentarCallup);

    const btnContinuar = document.getElementById("btn-continuar-evento");
    if (btnContinuar) btnContinuar.addEventListener("click", continuarAposEvento);

    const btnFicar = document.getElementById("btn-ficar-time");
    if (btnFicar) btnFicar.addEventListener("click", ficarNoTime);

    const btnPedir = document.getElementById("btn-pedir-troca");
    if (btnPedir) btnPedir.addEventListener("click", abrirPedidosDeTroca);

    const btnVoltarOff = document.getElementById("btn-voltar-offseason");
    if (btnVoltarOff) {
      btnVoltarOff.addEventListener("click", () => {
        eventoPendente = "offseason";
        if (offseason) offseason.pedindo = false;
        render();
      });
    }

    document.querySelectorAll("[data-aceitar-troca]").forEach((btn) => {
      btn.addEventListener("click", () => aceitarOferta(btn.dataset.aceitarTroca));
    });

    const btnForcada = document.getElementById("btn-aceitar-forcada");
    if (btnForcada) btnForcada.addEventListener("click", aceitarTrocaForcada);
  }

  function renderResumoTemporada(r) {
    const linhaClassificacao = r.classificacao
      ? `<div class="historico-item"><span>Classificação</span><span>#${r.classificacao.posicaoConferencia} ${r.classificacao.conferencia} · #${r.classificacao.posicao} NBA${r.classificacao.vagaPlayoff ? " · playoffs" : " · fora"}</span></div>`
      : "";

    const linhaPlayoffs = r.playoffs
      ? r.playoffs.campeao
        ? `<div class="historico-item"><span>Playoffs</span><span style="color:var(--nba-red);">Campeão da NBA!</span></div>`
        : `<div class="historico-item"><span>Playoffs</span><span>eliminado na ${r.playoffs.eliminadoNa}${r.playoffs.eliminadoPor ? " por " + r.playoffs.eliminadoPor.nome : ""}</span></div>`
      : r.classificacao && !r.classificacao.vagaPlayoff
        ? `<div class="historico-item"><span>Playoffs</span><span>não classificou (fora do top 8 da conferência)</span></div>`
        : "";

    const blocoPremios = r.premios
      ? `
        <div class="premios-liga">
          <div class="premio-card">
            <img class="premio-logo" src="${r.premios.campeao.imagem}" alt="${r.premios.campeaoNome}" />
            <div>
              <span class="premio-label">Campeão NBA</span>
              <span class="premio-nome">${r.premios.campeaoNome}</span>
            </div>
          </div>
          <div class="premio-card premio-card-duplo">
            <div class="premio-mini">
              <img class="premio-logo" src="${r.premios.campeaoLeste.imagem}" alt="" />
              <div>
                <span class="premio-label">Finalista Leste</span>
                <span class="premio-nome premio-nome-sm">${r.premios.campeaoLeste.nome}</span>
              </div>
            </div>
            <div class="premio-mini">
              <img class="premio-logo" src="${r.premios.campeaoOeste.imagem}" alt="" />
              <div>
                <span class="premio-label">Finalista Oeste</span>
                <span class="premio-nome premio-nome-sm">${r.premios.campeaoOeste.nome}</span>
              </div>
            </div>
          </div>
          <div class="premio-card">
            <img class="premio-logo" src="${r.premios.mvpTime.imagem}" alt="${r.premios.mvpTime.nome}" />
            <div>
              <span class="premio-label">MVP</span>
              <span class="premio-nome">${r.premios.mvpDaLiga}</span>
              <span class="premio-sub">${r.premios.mvpTime.nome}</span>
            </div>
          </div>
        </div>
      `
      : "";

    const renderConf = (nome, linhas) => `
      <div class="conf-bloco">
        <h3 class="conf-titulo">${nome}</h3>
        ${linhas
          .map(
            (l) => `
          <div class="mini-tabela-linha${l.playoff ? "" : " fora-playoff"}">
            <span class="mini-pos">#${l.posicao}</span>
            <img class="mini-logo" src="${l.imagem}" alt="" />
            <span class="mini-nome">${l.nome}</span>
            <span class="mini-rec">${l.vitorias}-${l.derrotas}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    const blocoTabelas = r.tabelasConferencia
      ? `
        <div class="tabelas-conferencia">
          <h2>Playoff picture</h2>
          <div class="conf-grid">
            ${renderConf("Leste", r.tabelasConferencia.Leste)}
            ${renderConf("Oeste", r.tabelasConferencia.Oeste)}
          </div>
        </div>
      `
      : "";

    const blocoDraft = r.draft
      ? `
        <div class="draft-anual">
          <h2>Draft da NBA — loteria</h2>
          <div class="draft-anual-lista">
            ${r.draft
              .slice(0, 10)
              .map(
                (pick) => `
              <div class="draft-pick">
                <span class="draft-pick-num">${pick.posicao}º</span>
                <img class="mini-logo" src="${pick.time.imagem}" alt="${pick.time.nome}" />
                <span class="mini-nome">${pick.time.nome}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
      : "";

    return `
      <div class="historico" style="margin-bottom:20px; text-align:left;">
        <h2>Resumo da temporada — ${r.vitorias}-${r.derrotas}</h2>
        <div class="historico-item"><span>Médias por jogo</span><span>${r.medias.pontos} PPG · ${r.medias.rebotes} RPG · ${r.medias.assistencias} APG</span></div>
        <div class="historico-item"><span>Roubos / Tocos</span><span>${r.medias.roubos} SPG · ${r.medias.tocos} BPG</span></div>
        <div class="historico-item"><span>MVPs de partida</span><span>${r.mvpsDePartida} jogos</span></div>
        ${linhaClassificacao}
        ${linhaPlayoffs}
        ${blocoPremios}
        ${blocoTabelas}
        ${blocoDraft}
      </div>
    `;
  }

  function renderPremiosIndividuais() {
    if (!ultimosPremiosIndividuais || !ultimosPremiosIndividuais.length) return "";
    const papelAtual = infoPapel(jogador.papel).label;
    return `
      <div class="historico" style="margin-bottom:24px; text-align:left;">
        <h2>Prêmios da temporada — ${papelAtual}</h2>
        ${ultimosPremiosIndividuais
          .map((g) => `<div class="historico-item"><span>${g}</span></div>`)
          .join("")}
      </div>
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

  function renderEvento() {
    if (eventoPendente === "callup-sucesso") {
      return `<p class="evento-msg ok">Call-up! Você subiu pra NBA.</p>`;
    }
    if (eventoPendente === "callup-falha") {
      return `<p class="evento-msg erro">Call-up negado. Continua na G-League.</p>`;
    }
    if (eventoPendente === "senddown") {
      return `<p class="evento-msg erro">Desempenho fraco: rebaixado pra G-League.</p>`;
    }
    if (eventoPendente === "trade-aceito" && offseason && offseason.ultimoMovimento) {
      const m = offseason.ultimoMovimento;
      return `
        <div class="trade-resultado">
          <p class="evento-msg ok">Troca fechada</p>
          <div class="trade-fluxo">
            <img class="premio-logo" src="${m.de.imagem}" alt="${m.de.nome}" />
            <span class="trade-seta">→</span>
            <img class="premio-logo" src="${m.para.imagem}" alt="${m.para.nome}" />
          </div>
          <p class="meta-linha">${m.de.nome} → <b style="color:var(--text)">${m.para.nome}</b></p>
        </div>
      `;
    }
    if (eventoPendente === "trade-forçada-feita" && offseason && offseason.ultimoMovimento) {
      const m = offseason.ultimoMovimento;
      return `
        <div class="trade-resultado">
          <p class="evento-msg erro">Você foi trocado</p>
          <div class="trade-fluxo">
            <img class="premio-logo" src="${m.de.imagem}" alt="${m.de.nome}" />
            <span class="trade-seta">→</span>
            <img class="premio-logo" src="${m.para.imagem}" alt="${m.para.nome}" />
          </div>
          <p class="meta-linha">${m.de.nome} → <b style="color:var(--text)">${m.para.nome}</b></p>
        </div>
      `;
    }
    return "";
  }

  function renderOffseason() {
    if (eventoPendente === "trade-forçada" && offseason && offseason.forçada) {
      const t = offseason.forçada.time;
      return `
        <div class="offseason-box">
          <h2>Offseason — o time quer te trocar</h2>
          <p class="meta-linha" style="margin-top:0;text-align:left;">Após uma temporada fraca, a franquia fechou sua saída.</p>
          <div class="uni-opcao" style="cursor:default;">
            <img class="uni-logo" src="${t.imagem}" alt="${t.nome}" />
            <span class="uni-info">
              <span class="uni-tier">${t.conferencia} · força ${t.forca}</span>
              <span class="uni-nome">${t.nome}</span>
              <span class="uni-meta">destino da troca</span>
            </span>
          </div>
        </div>
      `;
    }

    if (eventoPendente === "offseason-pedindo" && offseason) {
      if (offseason.semInteresse || !offseason.ofertas.length) {
        return `
          <div class="offseason-box">
            <h2>Mercado de trocas</h2>
            <p class="meta-linha" style="margin-top:0;text-align:left;">Nenhuma franquia topou te buscar nesta offseason.</p>
          </div>
        `;
      }
      return `
        <div class="offseason-box">
          <h2>Ofertas de troca</h2>
          <p class="meta-linha" style="margin-top:0;text-align:left;">Escolha o destino ou volte e fique onde está.</p>
          <div class="lista-universidades">
            ${offseason.ofertas
              .map(
                (o) => `
              <button class="uni-opcao" type="button" data-aceitar-troca="${o.time.nome}">
                <img class="uni-logo" src="${o.time.imagem}" alt="${o.time.nome}" />
                <span class="uni-info">
                  <span class="uni-tier">${o.time.conferencia} · força ${o.time.forca}</span>
                  <span class="uni-nome">${o.time.nome}</span>
                  <span class="uni-meta">interesse ${o.score}</span>
                </span>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    if (eventoPendente === "offseason") {
      return `
        <div class="offseason-box">
          <h2>Offseason</h2>
          <p class="meta-linha" style="margin-top:0;text-align:left;">
            ${temporadasNoTimeAtual} temporada(s) em ${jogador.time ? jogador.time.nome : "—"}.
            Fique ou peça troca.
          </p>
        </div>
      `;
    }

    return "";
  }

  function renderAcaoPrincipal() {
    if (eventoPendente === "callup-disponivel") {
      return `
        <p style="color:var(--text-muted); margin-bottom:12px;">
          Desempenho de ${ultimoRegistro.desempenho} te qualifica pra tentar o call-up (chance: ${ultimoRegistro.desempenho}%).
        </p>
        <div class="acoes-stack">
          <button class="acao" id="btn-tentar-callup">Tentar call-up pra NBA</button>
        </div>
      `;
    }

    if (eventoPendente === "callup-sucesso" || eventoPendente === "callup-falha" || eventoPendente === "senddown") {
      return `
        <div class="acoes-stack">
          <button class="acao" id="btn-continuar-evento">Continuar</button>
        </div>
      `;
    }

    if (eventoPendente === "trade-forçada") {
      return `
        <div class="acoes-stack">
          <button class="acao" id="btn-aceitar-forcada">Seguir para o novo time</button>
        </div>
      `;
    }

    if (eventoPendente === "offseason") {
      return `
        <div class="acoes-stack">
          <button class="acao" id="btn-ficar-time">Ficar no time</button>
          <button class="acao secundaria" id="btn-pedir-troca">Pedir troca</button>
        </div>
      `;
    }

    if (eventoPendente === "offseason-pedindo") {
      return `
        <div class="acoes-stack">
          <button class="acao secundaria" id="btn-voltar-offseason">Voltar</button>
          <button class="acao" id="btn-ficar-time">Ficar no time mesmo assim</button>
        </div>
      `;
    }

    if (eventoPendente === "trade-aceito" || eventoPendente === "trade-forçada-feita") {
      return `
        <div class="acoes-stack">
          <button class="acao" id="btn-ficar-time">Próxima temporada</button>
        </div>
      `;
    }

    return `
      <div class="acoes-stack">
        <button class="acao" id="btn-jogar-temporada-pro">Jogar temporada</button>
      </div>
    `;
  }
})();