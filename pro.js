// pro.js
// Loop de temporada da carreira profissional: NBA <-> G-League,
// com offseason (ficar / pedir troca / ofertas).
(function () {
  const { NOMES_ATRIBUTOS, ATRIBUTOS, progredirTemporada, TIMES } = window.CB;
  const { simularTemporadaCompleta } = window.CB;
  const MUNDO_INICIAL = JSON.parse(JSON.stringify(TIMES));
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
  // Loop inspirado em simuladores de carreira enxutos: uma temporada por
  // avanço, leitura do que aconteceu e escolhas apenas quando o mercado abre.
  const MODO_TEMPORADA_ENXUTO = true;

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
  const elSaves = document.createElement("div");
  elSaves.id = "menu-saves";
  elSaves.style.display = "none";
  ancoraPro.parentNode.insertBefore(elSaves, elPro);

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
  let timerApresentacaoTemporada = null;
  let objetivoSelecionado = { id: "playoffs" };
  let ultimoObjetivoTemporada = null;
  let timeLigaSelecionado = null;
  let paginaAtiva = "visao";
  const CHAVE_SAVES = "baska-carreira-slots-v2";
  const CHAVE_SAVE_LEGADO = "baska-carreira-v1";
  let slotAtual = null;
  let planoSelecionado = { foco: "arremesso", papel: "titular", estilo: "equilibrado", simulacao: "manual" };
  let simulacaoEmAndamento = null;

  // Ao entrar (ou restaurar) a carreira profissional, nenhuma tela das
  // etapas anteriores deve continuar no fluxo. Isso também protege saves
  // antigos que foram abertos enquanto o cartão do draft ainda existia.
  function ocultarEtapasAnteriores() {
    ["criacao-personagem", "resultado-draft", "universidade", "escolha-universidade", "carta-lenda", "painel-historico", "titulo-draft", "subtitulo-draft", "trilha"]
      .forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
  }

  window.addEventListener("cb:iniciar-carreira-profissional", (evento) => {
    if (!slotAtual) slotAtual = `carreira-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
    ocultarEtapasAnteriores();
    salvarCarreiraLocal();
    elPro.style.display = "block";
    render();
  });

  function lerSaves() {
    try {
      const saves = JSON.parse(localStorage.getItem(CHAVE_SAVES) || "[]");
      return Array.isArray(saves) ? saves : [];
    } catch (_) { return []; }
  }

  function gravarSaves(saves) {
    try { localStorage.setItem(CHAVE_SAVES, JSON.stringify(saves)); } catch (_) { /* armazenamento pode estar indisponível */ }
  }

  function dadosDaCarreira() {
    return { jogador, ultimoRegistro, ultimoRelatorioTemporada, temporadasNoTimeAtual, aposentado, motivoAposentadoria, mundo: TIMES.map((t) => ({ ...t })), agentesLivres: window.CB.AGENTES_LIVRES || [], historicoLiga: window.CB.HISTORICO_LIGA || [] };
  }

  function restaurarMundoInicial() {
    TIMES.forEach((time, indice) => {
      Object.keys(time).forEach((chave) => delete time[chave]);
      Object.assign(time, JSON.parse(JSON.stringify(MUNDO_INICIAL[indice])));
    });
    if (window.CB.HISTORICO_LIGA) window.CB.HISTORICO_LIGA.splice(0);
    if (window.CB.AGENTES_LIVRES) window.CB.AGENTES_LIVRES.splice(0);
  }

  function salvarCarreiraLocal() {
    if (!slotAtual || !jogador) return;
    const saves = lerSaves();
    const registro = {
      id: slotAtual,
      nome: jogador.nome || "Nova carreira",
      temporada: jogador.temporada || 1,
      time: jogador.time ? jogador.time.nome : "G-League",
      atualizadoEm: Date.now(),
      dados: dadosDaCarreira(),
    };
    const indice = saves.findIndex((save) => save.id === slotAtual);
    if (indice === -1) saves.push(registro);
    else saves[indice] = registro;
    gravarSaves(saves);
  }

  function migrarSaveLegado() {
    const saves = lerSaves();
    if (saves.length) return saves;
    try {
      const legado = JSON.parse(localStorage.getItem(CHAVE_SAVE_LEGADO) || "null");
      if (!legado || !legado.jogador) return saves;
      saves.push({
        id: `carreira-legado-${Date.now()}`,
        nome: legado.jogador.nome || "Carreira anterior",
        temporada: legado.jogador.temporada || 1,
        time: legado.jogador.time ? legado.jogador.time.nome : "G-League",
        atualizadoEm: Date.now(),
        dados: legado,
      });
      gravarSaves(saves);
      localStorage.removeItem(CHAVE_SAVE_LEGADO);
    } catch (_) { /* ignora save legado inválido */ }
    return saves;
  }

  function formatarDataSave(timestamp) {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(timestamp));
  }

  function renderMenuSaves() {
    const saves = lerSaves().sort((a, b) => b.atualizadoEm - a.atualizadoEm);
    elSaves.style.display = "block";
    elSaves.innerHTML = `
      <section class="carta-lenda painel-saves">
        <span class="lenda-posicao">Carreiras salvas</span>
        <h2 class="lenda-nome">Escolha sua jornada</h2>
        <p class="meta-linha">Cada carreira mantém jogador, liga, draft, prêmios e histórico próprios.</p>
        <div class="lista-saves">
          ${saves.length ? saves.map((save) => `
            <article class="save-item">
              <button type="button" class="save-carregar" data-carregar-save="${save.id}">
                <span class="save-nome">${save.nome}</span>
                <span class="save-meta">T${save.temporada} · ${save.time} · salvo em ${formatarDataSave(save.atualizadoEm)}</span>
              </button>
              <button type="button" class="save-apagar" aria-label="Apagar carreira de ${save.nome}" title="Apagar carreira" data-apagar-save="${save.id}">×</button>
            </article>`).join("") : '<div class="pagina-vazia">Nenhuma carreira salva. Crie sua primeira jornada.</div>'}
        </div>
        <div class="acoes-stack"><button class="acao" id="btn-nova-carreira">Criar nova carreira</button></div>
      </section>`;
    document.querySelectorAll("[data-carregar-save]").forEach((btn) => btn.addEventListener("click", () => carregarCarreira(btn.dataset.carregarSave)));
    document.querySelectorAll("[data-apagar-save]").forEach((btn) => btn.addEventListener("click", () => apagarCarreira(btn.dataset.apagarSave)));
    const nova = document.getElementById("btn-nova-carreira");
    if (nova) nova.addEventListener("click", criarNovaCarreira);
  }

  function aplicarCarreiraSalva(salvo) {
    const dados = salvo.dados || salvo;
    restaurarMundoInicial();
    (dados.mundo || []).forEach((estado) => {
      const time = TIMES.find((t) => t.nome === estado.nome);
      if (time) Object.assign(time, estado);
    });
    if (window.CB.HISTORICO_LIGA) window.CB.HISTORICO_LIGA.splice(0, window.CB.HISTORICO_LIGA.length, ...(dados.historicoLiga || []));
    if (window.CB.AGENTES_LIVRES) window.CB.AGENTES_LIVRES.splice(0, window.CB.AGENTES_LIVRES.length, ...(dados.agentesLivres || []));
    jogador = dados.jogador;
    if (jogador.time) jogador.time = TIMES.find((t) => t.nome === jogador.time.nome) || jogador.time;
    ultimoRegistro = dados.ultimoRegistro;
    ultimoRelatorioTemporada = dados.ultimoRelatorioTemporada;
    temporadasNoTimeAtual = dados.temporadasNoTimeAtual || 0;
    aposentado = !!dados.aposentado;
    motivoAposentadoria = dados.motivoAposentadoria || null;
    initCarreiraPro(jogador);
  }

  function carregarCarreira(id) {
    const salvo = lerSaves().find((save) => save.id === id);
    if (!salvo || !salvo.dados || !salvo.dados.jogador) return;
    slotAtual = id;
    paginaAtiva = "visao";
    aplicarCarreiraSalva(salvo);
    ocultarEtapasAnteriores();
    elSaves.style.display = "none";
    elPro.style.display = "block";
    render();
  }

  function criarNovaCarreira() {
    slotAtual = `carreira-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    jogador = null;
    ultimoRegistro = null;
    ultimoRelatorioTemporada = null;
    temporadasNoTimeAtual = 0;
    aposentado = false;
    motivoAposentadoria = null;
    eventoPendente = null;
    offseason = null;
    paginaAtiva = "visao";
    restaurarMundoInicial();
    elPro.innerHTML = "";
    elPro.style.display = "none";
    const resultadoAnterior = document.getElementById("resultado-draft");
    if (resultadoAnterior) resultadoAnterior.remove();
    ocultarEtapasAnteriores();
    document.getElementById("criacao-personagem").style.display = "block";
    elSaves.style.display = "none";
  }

  function apagarCarreira(id) {
    gravarSaves(lerSaves().filter((save) => save.id !== id));
    if (slotAtual === id) {
      slotAtual = null;
      jogador = null;
      elPro.innerHTML = "";
      elPro.style.display = "none";
    }
    renderMenuSaves();
  }

  function abrirGerenciadorSaves() {
    salvarCarreiraLocal();
    ocultarEtapasAnteriores();
    elPro.style.display = "none";
    renderMenuSaves();
  }

  function inicializarSistemaSaves() {
    const saves = migrarSaveLegado();
    if (saves.length) {
      ocultarEtapasAnteriores();
      renderMenuSaves();
    }
  }

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

  function limitar(valor, minimo = 0, maximo = 100) {
    return Math.max(minimo, Math.min(maximo, valor));
  }

  function registrarConsequencia(tipo, texto, efeitos = {}) {
    jogador.historicoDecisoes.push({
      temporada: jogador.temporadasNba + 1,
      marco: tipo,
      estrategia: texto,
      reputacao: efeitos.reputacao || 0,
      tecnico: efeitos.tecnico || 0,
      torcida: efeitos.torcida || 0,
    });
  }

  function prepararContextoDaTemporada() {
    if (!jogador.time || jogador.contexto !== "nba") { jogador.pressao = 0; return; }
    const historico = jogador.time.historicoPlayoffs || [];
    const legadoRecente = historico.slice(-2).reduce((total, entrada) => total + (entrada.includes("Campeão") ? 7 : entrada.includes("Playoffs") ? 3 : 0), 0);
    const ambicao = jogador.objetivoTemporada && ["playoffs", "allstar", "serie"].includes(jogador.objetivoTemporada.id) ? 5 : 0;
    jogador.pressao = limitar(Math.round((jogador.reputacao - 50) * 0.18 + legadoRecente + ambicao), 0, 30);
  }

  function aplicarConsequenciaDePapel(relatorio) {
    if (jogador.contexto !== "nba") return null;
    if (jogador.papel === "sexto" && (relatorio.medias.pontos >= 15 || relatorio.desempenhoMedio >= 72)) {
      jogador.impulsoTitular = limitar((jogador.impulsoTitular || 0) + 6, 0, 12);
      jogador.confiancaTecnico = limitar(jogador.confiancaTecnico + 5);
      jogador.apoioTorcida = limitar(jogador.apoioTorcida + 4);
      const texto = "Impacto como sexto homem abriu disputa por vaga de titular";
      registrarConsequencia("PAPEL", texto, { tecnico: 5, torcida: 4 });
      return texto;
    }
    jogador.impulsoTitular = Math.max(0, (jogador.impulsoTitular || 0) - 2);
    return null;
  }

  function atualizarContratoJogador(automatico = false) {
    if (jogador.contexto !== "nba" || !jogador.contrato) return false;
    if (!Number.isFinite(jogador.contrato.anosRestantes)) jogador.contrato.anosRestantes = 1;
    jogador.contrato.anosRestantes = Math.max(0, jogador.contrato.anosRestantes - 1);
    if (jogador.contrato.anosRestantes > 0) return false;
    if (automatico) {
      jogador.contrato.anosRestantes = 2 + Math.floor(Math.random() * 2);
      jogador.contrato.papelGarantido = sugerirPapel(jogador);
      return false;
    }
    return true;
  }

  function trocarTime(novoTime, motivo) {
    const anterior = jogador.time;
    fecharPassagemNoTime();
    jogador.time = novoTime;
    jogador.contexto = "nba";
    jogador.confiancaTecnico = limitar(45 + Math.round((jogador.reputacao - 50) * 0.18));
    jogador.apoioTorcida = limitar(48 + Math.round((jogador.reputacao - 50) * 0.22));
    jogador.contrato = { anosRestantes: 2, papelGarantido: "banco" };
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
    salvarCarreiraLocal();
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
        score += ((jogador.reputacao || 50) - 50) * 0.35;
        score += (jogador.interesseMercado || 0) * 0.45;
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

  function iniciarNegociacaoExtensao() {
    const anos = jogador.idade >= 32 ? 2 : 3;
    offseason = {
      ofertas: [],
      forçada: null,
      pedindo: false,
      extensao: { anos, papel: sugerirPapel(jogador) },
      ultimoMovimento: null,
    };
    eventoPendente = "extensao";
  }

  function aceitarExtensao() {
    if (!offseason || !offseason.extensao) return;
    jogador.contrato = { anosRestantes: offseason.extensao.anos, papelGarantido: offseason.extensao.papel };
    jogador.confiancaTecnico = limitar(jogador.confiancaTecnico + 6);
    jogador.apoioTorcida = limitar(jogador.apoioTorcida + 5);
    registrarConsequencia("CONTRATO", `Renovou por ${offseason.extensao.anos} anos`, { tecnico: 6, torcida: 5 });
    iniciarOffseason();
    salvarCarreiraLocal();
    render();
  }

  function recusarExtensao() {
    const ofertas = calcularOfertasDeTroca();
    const alternativas = ofertas.length ? ofertas : TIMES
      .filter((time) => time.nome !== jogador.time.nome)
      .map((time) => ({ time, score: Math.round(35 + Math.random() * 35) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    jogador.confiancaTecnico = limitar(jogador.confiancaTecnico - 5);
    jogador.apoioTorcida = limitar(jogador.apoioTorcida - 4);
    jogador.interesseMercado = limitar(jogador.interesseMercado + 12);
    offseason = { ofertas: alternativas, forçada: null, pedindo: false, ultimoMovimento: null, freeAgency: true };
    eventoPendente = "free-agency";
    registrarConsequencia("CONTRATO", "Recusou extensão e entrou na free agency", { tecnico: -5, torcida: -4 });
    salvarCarreiraLocal();
    render();
  }

  function assinarContratoPonte() {
    jogador.contrato = { anosRestantes: 1, papelGarantido: sugerirPapel(jogador) };
    jogador.confiancaTecnico = limitar(jogador.confiancaTecnico - 1);
    registrarConsequencia("CONTRATO", "Ficou por mais um ano sem extensão", { tecnico: -1 });
    iniciarOffseason();
    salvarCarreiraLocal();
    render();
  }

  function iniciarTemporada() {
    jogador.planoTemporada = { ...planoSelecionado };
    prepararContextoDaTemporada();
    // O papel continua sujeito à realidade do elenco: pedir para começar
    // não garante a vaga, mas define a intenção e a carga de minutos.
    const papelSugerido = sugerirPapel(jogador);
    const ordemPapeis = { banco: 0, sexto: 1, titular: 2 };
    jogador.papel = ordemPapeis[planoSelecionado.papel] <= ordemPapeis[papelSugerido]
      ? planoSelecionado.papel
      : papelSugerido;
    const contextoDaTemporada = jogador.contexto;
    const relatorioTemporada = simularTemporadaCompleta(jogador);
    simulacaoEmAndamento = { contextoDaTemporada, relatorioTemporada, indice: 0, ultimoBloco: null, estrategiaChave: null, bonusAgencia: 0 };
    render();
  }

  function jogarTemporadaEnxuta() {
    ultimoObjetivoTemporada = null;
    jogador.planoTemporada = { foco: null, papel: jogador.papel || "titular", estilo: "equilibrado" };
    jogador.objetivoTemporada = { ...objetivoSelecionado };
    prepararContextoDaTemporada();
    jogador.papel = sugerirPapel(jogador);
    const contextoDaTemporada = jogador.contexto;
    const relatorioTemporada = simularTemporadaCompleta(jogador);
    concluirTemporada(contextoDaTemporada, relatorioTemporada);
  }

  function iniciarTemporadaComAnimacao() {
    ultimoObjetivoTemporada = null;
    jogador.planoTemporada = { foco: null, papel: jogador.papel || "titular", estilo: "equilibrado" };
    jogador.objetivoTemporada = { ...objetivoSelecionado };
    prepararContextoDaTemporada();
    jogador.papel = sugerirPapel(jogador);
    const contextoDaTemporada = jogador.contexto;
    const relatorioTemporada = simularTemporadaCompleta(jogador);
    simulacaoEmAndamento = { contextoDaTemporada, relatorioTemporada, indice: 0, ultimoBloco: null, estrategiaChave: null, bonusAgencia: 0, semAgencia: true, autoPassar: true };
    render();
    agendarProximoResultado();
  }

  function agendarProximoResultado() {
    if (timerApresentacaoTemporada) clearTimeout(timerApresentacaoTemporada);
    if (!simulacaoEmAndamento || !simulacaoEmAndamento.autoPassar) return;
    timerApresentacaoTemporada = setTimeout(() => {
      avancarSimulacao();
      agendarProximoResultado();
    }, simulacaoEmAndamento.fase === "playoffs" ? 900 : 280);
  }

  function avaliarObjetivoTemporada(relatorio, individuais) {
    const objetivo = jogador.objetivoTemporada;
    if (!objetivo) return null;
    const definicoes = {
      titular: { titulo: "Ganhar vaga de titular", cumpriu: jogador.papel === "titular" },
      playoffs: { titulo: "Chegar aos playoffs", cumpriu: !!(relatorio.classificacao && relatorio.classificacao.vagaPlayoff) },
      pontos: { titulo: "Média de 20 pontos", cumpriu: relatorio.medias && relatorio.medias.pontos >= 20 },
      allstar: { titulo: "Entrar no All-Star", cumpriu: !!(individuais && individuais.allStar) },
      desenvolver: { titulo: `Desenvolver ${NOMES_ATRIBUTOS[objetivo.atributo]}`, cumpriu: !!(ultimoRegistro && ultimoRegistro.crescimentos[objetivo.atributo] > 0) },
      serie: { titulo: "Vencer uma série de playoff", cumpriu: !!(relatorio.playoffs && relatorio.playoffs.series && relatorio.playoffs.series.some((s) => s.venceu)) },
    };
    const resultado = definicoes[objetivo.id];
    if (resultado.cumpriu) {
      jogador.reputacao = Math.min(100, jogador.reputacao + 4);
      jogador.confiancaTecnico = Math.min(100, jogador.confiancaTecnico + 3);
      jogador.apoioTorcida = Math.min(100, jogador.apoioTorcida + 3);
      jogador.penalidadeMinutos = Math.max(0, (jogador.penalidadeMinutos || 0) - 1);
      resultado.efeito = "reputação +4 · técnico +3 · torcida +3";
    } else {
      jogador.confiancaTecnico = Math.max(0, jogador.confiancaTecnico - 4);
      jogador.apoioTorcida = Math.max(0, jogador.apoioTorcida - 3);
      jogador.penalidadeMinutos = Math.min(3, (jogador.penalidadeMinutos || 0) + 1);
      resultado.efeito = "confiança -4 · torcida -3 · minutos sob observação";
    }
    registrarConsequencia("OBJETIVO", `${resultado.titulo}: ${resultado.cumpriu ? "cumprido" : "não cumprido"}`, resultado.cumpriu ? { reputacao: 4, tecnico: 3, torcida: 3 } : { tecnico: -4, torcida: -3 });
    jogador.objetivoTemporada = null;
    return resultado;
  }

  function simularCarreiraCompleta() {
    let seguranca = 0;
    while (!aposentado && seguranca++ < 35) {
      jogador.planoTemporada = { ...planoSelecionado };
      prepararContextoDaTemporada();
      jogador.papel = sugerirPapel(jogador);
      const contexto = jogador.contexto;
      const relatorio = simularTemporadaCompleta(jogador);
      ultimoRelatorioTemporada = relatorio;
      ultimoRegistro = progredirTemporada(jogador, relatorio.desempenhoMedio);
      // A simulação até a aposentadoria precisa alimentar os mesmos totais
      // usados na tela de carreira normal; antes ela pulava esse acúmulo.
      const ec = jogador.estatisticasCarreira;
      const jogosDaTemporada = relatorio.jogosJogados || 82;
      ec.jogos += jogosDaTemporada;
      ["pontos", "rebotes", "assistencias", "roubos", "tocos"].forEach((chave) => {
        ec[chave] = +(ec[chave] + (relatorio.medias[chave] || 0) * jogosDaTemporada).toFixed(1);
      });
      jogador.energia = Math.min(100, jogador.energia + 8);
      temporadasNoTimeAtual++;

      if (contexto === "nba") {
        jogador.temporadasNba = (jogador.temporadasNba || 0) + 1;
        const individuais = avaliarPremiosIndividuais(jogador, relatorio);
        acumularPremios(jogador, individuais, `Temporada ${jogador.temporadasNba}`);
        aplicarConsequenciaDePapel(relatorio);
        atualizarContratoJogador(true);
        if (jogador.time && jogador.time.historicoPlayoffs) {
          jogador.time.historicoPlayoffs.push(`T${jogador.temporadasNba}: ${relatorio.playoffs && relatorio.playoffs.campeao ? "Campeão NBA" : relatorio.playoffs ? "Playoffs" : "Fora dos playoffs"}`);
        }
      }

      const emDeclinio = jogador.idade >= jogador.idadeDeclinio;
      const queda = emDeclinio && ultimoRegistro.overallApos < jogador.picoOverall * LIMIAR_APOSENTADORIA;
      const limite = jogador.idade >= idadeAposentadoriaMaxima(jogador);
      if (queda || limite || (emDeclinio && Math.random() < chanceAposentadoriaPorIdade(jogador))) {
        motivoAposentadoria = limite ? "idade" : queda ? "queda-de-forma" : "escolha";
        fecharPassagemNoTime();
        aposentado = true;
      } else if (jogador.contexto === "gleague" && relatorio.desempenhoMedio >= LIMIAR_CALLUP) {
        jogador.contexto = "nba";
      } else if (jogador.contexto === "nba" && relatorio.desempenhoMedio < LIMIAR_SENDDOWN) {
        jogador.contexto = "gleague";
      }
    }
    if (!aposentado) { motivoAposentadoria = "idade"; fecharPassagemNoTime(); aposentado = true; }
    salvarCarreiraLocal();
    render();
  }

  function avancarSimulacao() {
    if (!simulacaoEmAndamento) return;
    if (simulacaoEmAndamento.eventoNarrativo) return;
    if (simulacaoEmAndamento.fase === "playoffs") {
      const series = simulacaoEmAndamento.relatorioTemporada.playoffs.series || [];
      if (simulacaoEmAndamento.playoffIndice >= series.length) {
        concluirTemporada(simulacaoEmAndamento.contextoDaTemporada, simulacaoEmAndamento.relatorioTemporada);
        return;
      }
      if (!simulacaoEmAndamento.estrategiaChave && !simulacaoEmAndamento.semAgencia) return;
      if (!simulacaoEmAndamento.semAgencia) simulacaoEmAndamento.bonusAgencia += 2;
      const serie = series[simulacaoEmAndamento.playoffIndice];
      if (simulacaoEmAndamento.estrategiaChave) aplicarImpactoDecisao(simulacaoEmAndamento.estrategiaChave, serie.venceu, serie.rodada);
      simulacaoEmAndamento.estrategiaChave = null;
      simulacaoEmAndamento.playoffIndice++;
      render();
      return;
    }
    if (MARCOS_TEMPORADA[simulacaoEmAndamento.indice] && !simulacaoEmAndamento.estrategiaChave && !simulacaoEmAndamento.semAgencia) return;
    aplicarAgenciaNoJogo(simulacaoEmAndamento);
    const total = simulacaoEmAndamento.relatorioTemporada.jogos.length;
    if (simulacaoEmAndamento.indice >= total) {
      const series = simulacaoEmAndamento.relatorioTemporada.playoffs && simulacaoEmAndamento.relatorioTemporada.playoffs.series;
      if (series && series.length) {
        simulacaoEmAndamento.fase = "playoffs";
        simulacaoEmAndamento.playoffIndice = 0;
        render();
        return;
      }
      concluirTemporada(simulacaoEmAndamento.contextoDaTemporada, simulacaoEmAndamento.relatorioTemporada);
      return;
    }
    simulacaoEmAndamento.indice++;
    simulacaoEmAndamento.ultimoBloco = null;
    render();
    if (jogador.planoTemporada.simulacao === "automatico" && simulacaoEmAndamento.indice < total && !MARCOS_TEMPORADA[simulacaoEmAndamento.indice]) {
      setTimeout(simularBlocoDaTemporada, 550);
    }
  }

  function aplicarAgenciaNoJogo(s) {
    const estrategia = s.estrategiaChave;
    if (!estrategia) return;
    const jogo = s.relatorioTemporada.jogos[s.indice];
    if (!jogo || !jogo.stats) return;
    const antes = { ...jogo.stats };
    if (estrategia === "protagonista") {
      jogo.stats.pontos *= 1.25;
      jogo.stats.assistencias *= 0.88;
    } else if (estrategia === "coletivo") {
      jogo.stats.pontos *= 0.9;
      jogo.stats.assistencias *= 1.28;
    } else {
      jogo.stats.roubos *= 1.4;
      jogo.stats.tocos *= 1.4;
      jogo.stats.rebotes *= 1.12;
    }
    Object.keys(jogo.stats).forEach((chave) => {
      jogo.stats[chave] = +jogo.stats[chave].toFixed(1);
      const diferenca = jogo.stats[chave] - antes[chave];
      if (s.relatorioTemporada.medias[chave] !== undefined) {
        s.relatorioTemporada.medias[chave] = +(s.relatorioTemporada.medias[chave] + diferenca / 82).toFixed(1);
      }
    });
    s.bonusAgencia += 2;
    aplicarImpactoDecisao(estrategia, jogo.venceu, MARCOS_TEMPORADA[s.indice]);
    s.estrategiaChave = null;
  }

  function aplicarImpactoDecisao(estrategia, venceu, marco) {
    const efeito = {
      protagonista: { reputacao: venceu ? 5 : 2, tecnico: venceu ? 1 : -2, rotulo: "Chamou a responsabilidade" },
      coletivo: { reputacao: venceu ? 3 : 1, tecnico: venceu ? 5 : 3, rotulo: "Priorizou o time" },
      defensivo: { reputacao: venceu ? 4 : 2, tecnico: venceu ? 4 : 2, rotulo: "Assumiu a missão defensiva" },
    }[estrategia];
    // O resultado da escolha muda o peso da narrativa, mas os três estilos
    // têm valor: cada um fortalece uma dimensão distinta da carreira.
    const reputacao = venceu ? efeito.reputacao : Math.max(1, efeito.reputacao - 1);
    const tecnico = venceu ? efeito.tecnico : Math.min(efeito.tecnico, 1);
    jogador.reputacao = Math.max(0, Math.min(100, jogador.reputacao + reputacao));
    jogador.confiancaTecnico = Math.max(0, Math.min(100, jogador.confiancaTecnico + tecnico));
    jogador.ultimoImpactoDecisao = { ...efeito, reputacao, tecnico, estrategia, venceu };
    jogador.historicoDecisoes.push({
      temporada: jogador.temporadasNba + 1,
      marco,
      estrategia,
      reputacao,
      tecnico,
    });
  }

  // A temporada é acompanhável sem obrigar 82 cliques: estes são os jogos
  // que recebem atenção individual; o intervalo entre eles vira um bloco
  // com todos os resultados listados na tela.
  const MARCOS_TEMPORADA = {
    0: "Estreia da temporada",
    15: "Primeiro grande teste",
    30: "Jogo do meio da temporada",
    50: "Virada da reta final",
    65: "Corrida pelos playoffs",
    75: "Última sequência",
    81: "Último jogo da temporada regular",
  };

  const EVENTOS_NARRATIVOS = [
    {
      id: "banco", titulo: "Conversa com o técnico", texto: "O técnico quer que você lidere a segunda unidade por alguns jogos.",
      opcoes: [
        { id: "aceitar", label: "Aceitar o papel", detalhe: "+ confiança do técnico", efeitos: { tecnico: 6, reputacao: 1 } },
        { id: "recusar", label: "Pedir para continuar titular", detalhe: "+ reputação · risco com o técnico", efeitos: { tecnico: -5, reputacao: 3 } },
      ],
    },
    {
      id: "lesao", titulo: "Decisão médica", texto: "Você sente um incômodo físico. A comissão sugere alguns jogos de recuperação.",
      opcoes: [
        { id: "recuperar", label: "Priorizar recuperação", detalhe: "+ energia · confiança", efeitos: { energia: 14, tecnico: 3 } },
        { id: "jogar", label: "Jogar mesmo assim", detalhe: "+ reputação · menos energia", efeitos: { reputacao: 4, energia: -12 } },
      ],
    },
    {
      id: "critica", titulo: "Clima no vestiário", texto: "Uma estrela do elenco criticou publicamente sua atuação recente.",
      opcoes: [
        { id: "unir", label: "Resolver em particular", detalhe: "+ confiança do técnico", efeitos: { tecnico: 5, reputacao: 1 } },
        { id: "responder", label: "Responder à imprensa", detalhe: "+ reputação · perde confiança", efeitos: { reputacao: 4, tecnico: -4 } },
      ],
    },
    {
      id: "patrocinio", titulo: "Proposta de patrocínio", texto: "Uma grande marca quer uma semana de compromissos fora da quadra.",
      opcoes: [
        { id: "assinar", label: "Aceitar a campanha", detalhe: "+ reputação · menos energia", efeitos: { reputacao: 6, energia: -8 } },
        { id: "descansar", label: "Focar no descanso", detalhe: "+ energia · confiança", efeitos: { energia: 10, tecnico: 2 } },
      ],
    },
    {
      id: "troca", titulo: "Rumores de troca", texto: "A imprensa noticia que você estaria insatisfeito e buscando uma saída.",
      opcoes: [
        { id: "negar", label: "Negar os rumores", detalhe: "+ confiança do técnico", efeitos: { tecnico: 5, reputacao: 1 } },
        { id: "alimentar", label: "Deixar o rumor crescer", detalhe: "+ mercado · perde confiança", efeitos: { mercado: 16, reputacao: 2, tecnico: -5 } },
      ],
    },
  ];

  function simularBlocoDaTemporada() {
    if (!simulacaoEmAndamento) return;
    const s = simulacaoEmAndamento;
    const total = s.relatorioTemporada.jogos.length;
    const proximoMarco = Object.keys(MARCOS_TEMPORADA)
      .map(Number)
      .find((i) => i > s.indice && i < total);
    const fim = proximoMarco === undefined ? total : proximoMarco;
    s.ultimoBloco = { inicio: s.indice, fim };
    s.indice = fim;
    if (fim < total && !s.semAgencia) gerarEventoNarrativo(s);
    render();
  }

  function gerarEventoNarrativo(s) {
    if (s.eventoNarrativo || jogador.contexto !== "nba") return;
    s.eventosVistos = s.eventosVistos || [];
    const disponiveis = EVENTOS_NARRATIVOS.filter((e) => !s.eventosVistos.includes(e.id));
    if (!disponiveis.length) return;
    const evento = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    s.eventoNarrativo = evento;
    s.eventosVistos.push(evento.id);
  }

  function resolverEventoNarrativo(opcaoId) {
    if (!simulacaoEmAndamento || !simulacaoEmAndamento.eventoNarrativo) return;
    const evento = simulacaoEmAndamento.eventoNarrativo;
    const opcao = evento.opcoes.find((o) => o.id === opcaoId);
    if (!opcao) return;
    const e = opcao.efeitos;
    jogador.reputacao = Math.max(0, Math.min(100, jogador.reputacao + (e.reputacao || 0)));
    jogador.confiancaTecnico = Math.max(0, Math.min(100, jogador.confiancaTecnico + (e.tecnico || 0)));
    jogador.energia = Math.max(0, Math.min(100, jogador.energia + (e.energia || 0)));
    jogador.interesseMercado = Math.max(0, Math.min(100, jogador.interesseMercado + (e.mercado || 0)));
    jogador.ultimoEventoNarrativo = { titulo: evento.titulo, escolha: opcao.label, efeitos: e };
    simulacaoEmAndamento.eventoNarrativo = null;
    render();
  }

  function concluirTemporada(contextoDaTemporada, relatorioTemporada) {
    if (timerApresentacaoTemporada) clearTimeout(timerApresentacaoTemporada);
    const bonusAgencia = simulacaoEmAndamento ? simulacaoEmAndamento.bonusAgencia : 0;
    simulacaoEmAndamento = null;
    // Papel reavaliado a cada temporada, com base no encaixe atual do
    // jogador no elenco — afeta minutos (e portanto médias) e lesão.
    ultimoRelatorioTemporada = relatorioTemporada;
    ultimoRegistro = progredirTemporada(jogador, Math.min(100, relatorioTemporada.desempenhoMedio + bonusAgencia));
    const ec = jogador.estatisticasCarreira;
    const jogosDaTemporada = relatorioTemporada.jogosJogados || 82;
    ec.jogos += jogosDaTemporada;
    ["pontos", "rebotes", "assistencias", "roubos", "tocos"].forEach((chave) => {
      ec[chave] = +(ec[chave] + (relatorioTemporada.medias[chave] || 0) * jogosDaTemporada).toFixed(1);
    });
    temporadasNoTimeAtual++;
    jogador.energia = Math.min(100, jogador.energia + 8); // recuperação natural da offseason
    eventoPendente = null;
    offseason = null;
    ultimosPremiosIndividuais = null;

    let individuais = null;
    if (contextoDaTemporada === "nba") {
      jogador.temporadasNba = (jogador.temporadasNba || 0) + 1;
      if (jogador.time && jogador.time.historicoPlayoffs) {
        const campanha = relatorioTemporada.playoffs
          ? relatorioTemporada.playoffs.campeao ? "Campeão NBA" : `Eliminado: ${relatorioTemporada.playoffs.eliminadoNa}`
          : "Fora dos playoffs";
        jogador.time.historicoPlayoffs.push(`T${jogador.temporadasNba}: ${campanha}`);
      }
      individuais = avaliarPremiosIndividuais(jogador, relatorioTemporada);
      const ganhos = acumularPremios(jogador, individuais, `Temporada ${jogador.temporadasNba}`);
      if (ganhos.length) ultimosPremiosIndividuais = ganhos;
    }
    ultimoObjetivoTemporada = avaliarObjetivoTemporada(relatorioTemporada, individuais);
    const consequenciaPapel = aplicarConsequenciaDePapel(relatorioTemporada);
    if (consequenciaPapel) {
      ultimosPremiosIndividuais = [...(ultimosPremiosIndividuais || []), consequenciaPapel];
    }
    const contratoExpirou = contextoDaTemporada === "nba" ? atualizarContratoJogador() : false;
    paginaAtiva = "temporada";

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
      salvarCarreiraLocal();
      render();
      return;
    }

    if (jogador.contexto === "gleague" && relatorioTemporada.desempenhoMedio >= LIMIAR_CALLUP) {
      eventoPendente = "callup-disponivel";
    } else if (jogador.contexto === "nba" && relatorioTemporada.desempenhoMedio < LIMIAR_SENDDOWN) {
      jogador.contexto = "gleague";
      eventoPendente = "senddown";
    } else if (jogador.contexto === "nba") {
      if (contratoExpirou) iniciarNegociacaoExtensao();
      else iniciarOffseason();
    }

    salvarCarreiraLocal();
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
    salvarCarreiraLocal();
    render();
  }

  function continuarAposEvento() {
    if (jogador.contexto === "nba") {
      iniciarOffseason();
    } else {
      eventoPendente = null;
      offseason = null;
    }
    salvarCarreiraLocal();
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
    if (!offseason.pediuTroca) {
      jogador.confiancaTecnico = limitar(jogador.confiancaTecnico - 8);
      jogador.apoioTorcida = limitar(jogador.apoioTorcida - 7);
      jogador.interesseMercado = limitar(jogador.interesseMercado + 15);
      jogador.pressao = limitar(jogador.pressao + 6, 0, 30);
      offseason.pediuTroca = true;
      registrarConsequencia("MERCADO", "Pediu troca publicamente", { tecnico: -8, torcida: -7 });
    }
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
    const freeAgency = offseason.freeAgency;
    trocarTime(oferta.time, freeAgency ? "Assinou como free agent" : "Troca pedida na offseason");
    eventoPendente = freeAgency ? "free-agency-assinado" : "trade-aceito";
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

  function renderContextoTime() {
    if (!jogador.time || jogador.contexto !== "nba") return "";
    const time = jogador.time;
    const encaixe = window.CB.encaixeJogadorNoTime
      ? window.CB.encaixeJogadorNoTime(jogador, time)
      : { total: 0, necessidade: 0 };
    const historico = (time.historicoPlayoffs || []).slice(-3).reverse();
    return `
      <section class="contexto-time">
        <div><span>ELENCO</span><strong>${time.estrelas.join(" · ")}</strong></div>
        <div><span>TÉCNICO / SISTEMA</span><strong>${time.sistema.nome}</strong></div>
        <div><span>NECESSIDADES</span><strong>${time.necessidades.join(" · ")}</strong></div>
        <div><span>SEU ENCAIXE</span><strong class="${encaixe.total >= 0 ? "positivo" : "negativo"}">${encaixe.total >= 0 ? "+" : ""}${encaixe.total} · necessidade ${encaixe.necessidade >= 0 ? "+" : ""}${encaixe.necessidade}</strong></div>
        <div><span>PRESSÃO DA TEMPORADA</span><strong class="${jogador.pressao >= 15 ? "negativo" : "positivo"}">${jogador.pressao || 0}/30 · ${jogador.pressao >= 15 ? "cobrança alta" : "sob controle"}</strong></div>
        <div><span>DISPUTA POR MINUTOS</span><strong class="${(jogador.impulsoTitular || 0) > (jogador.penalidadeMinutos || 0) ? "positivo" : "negativo"}">${jogador.impulsoTitular ? `impulso titular +${jogador.impulsoTitular}` : jogador.penalidadeMinutos ? "minutos sob observação" : "rotação estável"}</strong></div>
        <div><span>CONTRATO</span><strong>${jogador.contrato ? `${jogador.contrato.anosRestantes} ano(s) · ${infoPapel(jogador.contrato.papelGarantido).label}` : "sem contrato"}</strong></div>
        ${time.rivais && time.rivais.length ? `<div><span>RIVAIS</span><strong>${time.rivais.join(" · ")}</strong></div>` : ""}
        ${historico.length ? `<div><span>PLAYOFFS RECENTES</span><strong>${historico.join(" · ")}</strong></div>` : ""}
      </section>
    `;
  }

  function renderElencosLiga() {
    if (!jogador.time || jogador.contexto !== "nba") return "";
    const nome = timeLigaSelecionado || jogador.time.nome;
    const time = TIMES.find((t) => t.nome === nome) || jogador.time;
    return `
      <section class="elencos-liga">
        <h2>Elencos da liga</h2>
        <div class="seletor-times">${TIMES.map((t) => `<button class="time-seletor${t.nome === time.nome ? " ativo" : ""}" title="${t.nome}" data-time-liga="${t.nome}"><img src="${t.imagem}" alt="${t.nome}" /></button>`).join("")}</div>
        <div class="elenco-cabecalho"><img class="mini-logo" src="${time.imagem}" alt="" /><strong>${time.nome}</strong><span>POS · OVR · IDADE</span></div>
        ${(time.jogadores || []).map((p) => `<div class="elenco-linha"><span>${p.nome}${p.calouro ? " · calouro" : ""}</span><strong>${p.posicao || "—"} · ${Math.round(p.overall)} · ${p.idade}${p.contrato ? ` · ${p.contrato.anosRestantes}a` : ""}</strong></div>`).join("")}
      </section>
    `;
  }

  function renderMercadoLiga() {
    const mundo = ultimoRelatorioTemporada && ultimoRelatorioTemporada.mundoLiga;
    const movimentos = mundo && mundo.movimentacoes ? mundo.movimentacoes.slice(0, 8) : [];
    const livres = (window.CB.AGENTES_LIVRES || []).slice(0, 6);
    if (!movimentos.length && !livres.length) return "";
    const descricao = (m) => m.tipo === "troca"
      ? `${m.nome}: ${m.de} → ${m.para} · por ${m.retorno}`
      : m.tipo === "free-agent"
        ? `${m.nome} assinou com ${m.para} · OVR ${m.overall}`
        : `${m.nome}: ${m.de} → free agency`;
    return `
      <section class="mercado-liga">
        <h2>Offseason da liga</h2>
        ${movimentos.length ? `<div class="mercado-lista">${movimentos.map((m) => `<div class="historico-item"><span>${m.tipo === "troca" ? "TROCA" : "MERCADO"}</span><span>${descricao(m)}</span></div>`).join("")}</div>` : ""}
        ${livres.length ? `<h3>Agentes livres</h3><div class="agentes-livres">${livres.map((p) => `<span>${p.nome} <b>${p.posicao} · ${Math.round(p.overall)}</b></span>`).join("")}</div>` : ""}
      </section>`;
  }

  function renderNavegacaoCarreira() {
    const paginas = [
      ["visao", "Visão geral"],
      ["temporada", "Temporada"],
      ["liga", "Liga"],
      ["elenco", "Elencos"],
    ];
    return `<nav class="nav-carreira" aria-label="Seções da carreira">${paginas
      .map(([id, titulo]) => `<button type="button" class="nav-carreira-item${paginaAtiva === id ? " ativo" : ""}" data-pagina-carreira="${id}">${titulo}</button>`)
      .join("")}<button type="button" class="nav-carreira-item nav-carreira-simular" id="btn-simular-carreira-completa">Simular carreira inteira</button><button type="button" class="nav-carreira-item" id="btn-gerenciar-saves">Carreiras</button></nav>`;
  }

  function renderPaginaCarreira() {
    if (paginaAtiva === "temporada") {
      return `
        <section class="pagina-carreira">
          ${ultimoRelatorioTemporada ? renderResumoTemporada(ultimoRelatorioTemporada) : '<div class="pagina-vazia">A temporada ainda não começou. Defina seu objetivo abaixo e inicie a simulação.</div>'}
          ${renderResultadoObjetivo()}
          ${renderPremiosIndividuais()}
          ${ultimoRegistro ? renderRelatorio(ultimoRegistro) : ""}
          ${renderHistoricoDecisoes()}
        </section>`;
    }
    if (paginaAtiva === "liga") {
      const conteudoLiga = `${renderMercadoLiga()}${renderHistoricoLiga()}`;
      return `<section class="pagina-carreira">${conteudoLiga || '<div class="pagina-vazia">O mercado e o histórico da liga aparecerão ao fim da primeira temporada.</div>'}</section>`;
    }
    if (paginaAtiva === "elenco") {
      return `<section class="pagina-carreira">${renderElencosLiga() || '<div class="pagina-vazia">Os elencos ficam disponíveis quando você estiver na NBA.</div>'}</section>`;
    }
    return `
      <section class="pagina-carreira">
        <div class="trilha" style="margin-bottom:24px;">
          ${ATRIBUTOS.map((attr) => `
            <div class="slot preenchido">
              <div class="slot-label">${NOMES_ATRIBUTOS[attr]}</div>
              <div class="slot-valor">${jogador.atual[attr]}<span style="font-size:0.9rem;color:var(--text-muted);"> / ${jogador.potencial[attr]}</span></div>
            </div>
          `).join("")}
        </div>
        ${renderContextoTime()}
        ${renderRecordesCarreira()}
      </section>`;
  }

  function render() {
    const overallAtual = overallDe(jogador.atual);
    const overallPotencial = overallDe(jogador.potencial);

    if (aposentado) {
      elPro.classList.remove("modo-simulacao");
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
            <button class="acao secundaria" id="btn-gerenciar-saves-final">Carreiras salvas</button>
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
      const btnGerenciarFinal = document.getElementById("btn-gerenciar-saves-final");
      if (btnGerenciarFinal) btnGerenciarFinal.addEventListener("click", abrirGerenciadorSaves);
      return;
    }

    if (simulacaoEmAndamento) {
      elPro.classList.add("modo-simulacao");
      elPro.innerHTML = renderSimulacao();
      const proximo = document.getElementById("btn-proximo-jogo");
      if (proximo) proximo.addEventListener("click", avancarSimulacao);
      const bloco = document.getElementById("btn-simular-bloco");
      if (bloco) bloco.addEventListener("click", simularBlocoDaTemporada);
      bindAgenciaJogoChave();
      document.querySelectorAll("[data-decisao-evento]").forEach((btn) => {
        btn.addEventListener("click", () => resolverEventoNarrativo(btn.dataset.decisaoEvento));
      });
      return;
    }

    elPro.classList.remove("modo-simulacao");

    elPro.innerHTML = `
      <div class="carta-lenda">
        ${renderCabecalhoPro()}
        <div class="stats-strip">
          <div class="stat-pill"><div class="stat-val">${overallAtual}</div><div class="stat-lab">Overall</div></div>
          <div class="stat-pill"><div class="stat-val">${overallPotencial}</div><div class="stat-lab">Potencial</div></div>
          <div class="stat-pill"><div class="stat-val">${jogador.idade}</div><div class="stat-lab">Idade</div></div>
          <div class="stat-pill"><div class="stat-val">${jogador.reputacao}</div><div class="stat-lab">Reputação</div></div>
          <div class="stat-pill"><div class="stat-val">${jogador.confiancaTecnico}</div><div class="stat-lab">Confiança do técnico</div></div>
          <div class="stat-pill"><div class="stat-val">${jogador.apoioTorcida}</div><div class="stat-lab">Apoio da torcida</div></div>
          <div class="stat-pill"><div class="stat-val">${jogador.energia}</div><div class="stat-lab">Energia</div></div>
        </div>

        ${renderNavegacaoCarreira()}
        ${renderPaginaCarreira()}
        ${renderEvento()}
        ${renderOffseason()}
        ${renderAcaoPrincipal()}
      </div>
    `;

    bindEventos();
  }

  function bindEventos() {
    document.querySelectorAll("[data-pagina-carreira]").forEach((btn) => {
      btn.addEventListener("click", () => {
        paginaAtiva = btn.dataset.paginaCarreira;
        render();
      });
    });
    const btnJogar = document.getElementById("btn-jogar-temporada-pro");
    if (btnJogar) btnJogar.addEventListener("click", iniciarTemporada);
    const btnTemporadaEnxuta = document.getElementById("btn-jogar-temporada-enxuta");
    if (btnTemporadaEnxuta) btnTemporadaEnxuta.addEventListener("click", jogarTemporadaEnxuta);
    const btnTemporadaAnimada = document.getElementById("btn-iniciar-temporada-animada");
    if (btnTemporadaAnimada) btnTemporadaAnimada.addEventListener("click", iniciarTemporadaComAnimacao);
    document.querySelectorAll("[data-time-liga]").forEach((btn) => {
      btn.addEventListener("click", () => { timeLigaSelecionado = btn.dataset.timeLiga; render(); });
    });
    document.querySelectorAll("[data-objetivo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        objetivoSelecionado = { id: btn.dataset.objetivo, atributo: objetivoSelecionado.atributo || "arremesso" };
        render();
      });
    });
    document.querySelectorAll("[data-objetivo-atributo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        objetivoSelecionado = { id: "desenvolver", atributo: btn.dataset.objetivoAtributo };
        render();
      });
    });
    const btnCarreiraCompleta = document.getElementById("btn-simular-carreira-completa");
    if (btnCarreiraCompleta) btnCarreiraCompleta.addEventListener("click", simularCarreiraCompleta);
    const btnGerenciarSaves = document.getElementById("btn-gerenciar-saves");
    if (btnGerenciarSaves) btnGerenciarSaves.addEventListener("click", abrirGerenciadorSaves);

    document.querySelectorAll("[data-plano-foco], [data-plano-papel], [data-plano-estilo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.planoFoco) planoSelecionado.foco = btn.dataset.planoFoco;
        if (btn.dataset.planoPapel) planoSelecionado.papel = btn.dataset.planoPapel;
        if (btn.dataset.planoEstilo) planoSelecionado.estilo = btn.dataset.planoEstilo;
        render();
      });
    });

    document.querySelectorAll("[data-plano-simulacao]").forEach((btn) => {
      btn.addEventListener("click", () => {
        planoSelecionado.simulacao = btn.dataset.planoSimulacao;
        render();
      });
    });

    bindAgenciaJogoChave();

    const btnCallup = document.getElementById("btn-tentar-callup");
    if (btnCallup) btnCallup.addEventListener("click", tentarCallup);

    const btnContinuar = document.getElementById("btn-continuar-evento");
    if (btnContinuar) btnContinuar.addEventListener("click", continuarAposEvento);

    const btnFicar = document.getElementById("btn-ficar-time");
    if (btnFicar) btnFicar.addEventListener("click", ficarNoTime);

    const btnAceitarExtensao = document.getElementById("btn-aceitar-extensao");
    if (btnAceitarExtensao) btnAceitarExtensao.addEventListener("click", aceitarExtensao);
    const btnRecusarExtensao = document.getElementById("btn-recusar-extensao");
    if (btnRecusarExtensao) btnRecusarExtensao.addEventListener("click", recusarExtensao);
    const btnAssinarPonte = document.getElementById("btn-assinar-ponte");
    if (btnAssinarPonte) btnAssinarPonte.addEventListener("click", assinarContratoPonte);

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

  function bindAgenciaJogoChave() {
    document.querySelectorAll("[data-agencia-chave]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!simulacaoEmAndamento) return;
        simulacaoEmAndamento.estrategiaChave = btn.dataset.agenciaChave;
        render();
      });
    });
  }

  function renderGestaoTemporada(r) {
    const calendario = (r.calendarioMensal || []).map((m) => `<div class="mes-temporada"><strong>${m.mes}</strong><span>${m.vitorias}-${m.derrotas}</span><small>${m.lesoes ? `${m.lesoes} jogo(s) lesionado` : "sem lesão"}</small><i>${m.tendencia}</i></div>`).join("");
    const time = r.estatisticasTime;
    const comparacao = r.comparacaoPosicao;
    const premios = r.premios && r.premios.corridaPremios;
    const ranking = (titulo, lista) => lista && lista.length ? `<div class="corrida-premio"><h3>${titulo}</h3>${lista.slice(0, 3).map((p, i) => `<div><b>#${i + 1}</b><img class="mini-logo" src="${p.imagem}" alt="" /><span>${p.nome}</span></div>`).join("")}</div>` : "";
    const series = r.chavePlayoffs || (r.playoffs && r.playoffs.chaveCompleta) || [];
    const rodadas = ["1ª rodada", "semifinal", "final de conferência", "finais da NBA"];
    const chave = series.length ? `<section class="chave-playoffs"><h2>Chave completa dos playoffs</h2><div class="chave-grade">${rodadas.map((rodada) => `<div class="chave-coluna"><h3>${rodada}</h3>${series.filter((s) => s.rodada.includes(rodada)).map((s) => `<div class="chave-serie"><span>${s.timeA.nome}</span><b>${s.placar}</b><span>${s.timeB.nome}</span><small>${s.vencedor.nome}</small></div>`).join("") || '<p>—</p>'}</div>`).join("")}</div></section>` : "";
    return `
      <section class="gestao-temporada">
        <h2>Central da temporada</h2>
        ${calendario ? `<div class="calendario-mensal">${calendario}</div>` : ""}
        ${time ? `<div class="metricas-time"><div><span>ATAQUE</span><strong>${time.ataque}</strong><small>${time.rankingAtaque}º da liga</small></div><div><span>DEFESA</span><strong>${time.defesa}</strong><small>${time.rankingDefesa}º da liga</small></div><div><span>APROVEITAMENTO</span><strong>${time.aproveitamento}%</strong><small>${r.classificacao.posicaoConferencia}º na conferência</small></div></div>` : ""}
        ${comparacao ? `<div class="comparacao-posicao"><h3>Comparação entre titulares ${jogador.posicao}</h3><p>Você terminou em <b>${comparacao.rank}º de ${comparacao.total}</b> no impacto da posição.</p><div>${comparacao.lideres.map((p, i) => `<span class="${p.nome === jogador.nome ? "voce" : ""}">#${i + 1} ${p.nome} <b>${p.time}</b></span>`).join("")}</div></div>` : ""}
        ${premios ? `<div class="corrida-premios"><h2>Corrida pelos prêmios</h2>${ranking("MVP", premios.mvp)}${ranking("DPOY", premios.dpoy)}${ranking("ROY", premios.roy)}${ranking("All-Star", premios.allStar)}</div>` : ""}
        ${chave}
      </section>`;
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
            <img class="premio-logo" src="${r.premios.novatoTime.imagem}" alt="${r.premios.novatoTime.nome}" />
            <div><span class="premio-label">Novato do Ano</span><span class="premio-nome">${r.premios.novatoDoAno}</span><span class="premio-sub">${r.premios.novatoTime.nome}</span></div>
          </div>
          <div class="premio-card">
            <img class="premio-logo" src="${r.premios.mvpTime.imagem}" alt="${r.premios.mvpTime.nome}" />
            <div>
              <span class="premio-label">MVP</span>
              <span class="premio-nome">${r.premios.mvpDaLiga}</span>
              <span class="premio-sub">${r.premios.mvpTime.nome}</span>
            </div>
          </div>
          <div class="premio-card premio-card-duplo">
            <div class="premio-mini"><img class="premio-logo" src="${r.premios.dpoyTime.imagem}" alt="" /><div><span class="premio-label">DPOY</span><span class="premio-nome premio-nome-sm">${r.premios.dpoyDaLiga}</span></div></div>
            <div class="premio-mini"><img class="premio-logo" src="${r.premios.sextoHomemTime.imagem}" alt="" /><div><span class="premio-label">Sexto Homem</span><span class="premio-nome premio-nome-sm">${r.premios.sextoHomemDaLiga}</span></div></div>
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
                <span class="mini-nome">${pick.calouro} <small>· ${pick.time.nome}</small></span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
      : "";

    const rivalidades = (r.jogos || []).filter((j) => j.rivalidade);
    const vitoriasRivais = rivalidades.filter((j) => j.venceu).length;
    const ganchoRivalidade = rivalidades.length
      ? ` Nos jogos de rivalidade, a campanha foi ${vitoriasRivais}-${rivalidades.length - vitoriasRivais}.`
      : "";
    const ganchoPressao = jogador.pressao >= 15
      ? " A equipe entrou no ano sob pressão elevada pelo histórico recente de playoffs."
      : "";
    const manchete = (r.playoffs && r.playoffs.campeao
      ? `${jogador.nome} conduz ${jogador.time.nome} ao título da NBA.`
      : r.classificacao && r.classificacao.vagaPlayoff
        ? `${jogador.time.nome} fecha a temporada em ${r.classificacao.posicaoConferencia}º e garante os playoffs.`
        : `${jogador.time ? jogador.time.nome : "O time"} encerra a temporada fora da zona de playoffs.`) + ganchoRivalidade + ganchoPressao;

    return `
      <div class="historico" style="margin-bottom:20px; text-align:left;">
        <h2>Resumo da temporada — ${r.vitorias}-${r.derrotas}</h2>
        <p class="manchete-temporada">${manchete}</p>
        <div class="historico-item"><span>Médias por jogo</span><span>${r.medias.pontos} PPG · ${r.medias.rebotes} RPG · ${r.medias.assistencias} APG</span></div>
        <div class="historico-item"><span>Roubos / Tocos</span><span>${r.medias.roubos} SPG · ${r.medias.tocos} BPG</span></div>
        <div class="historico-item"><span>MVPs de partida</span><span>${r.mvpsDePartida} jogos</span></div>
        ${linhaClassificacao}
        ${linhaPlayoffs}
        ${renderGestaoTemporada(r)}
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

  function renderHistoricoDecisoes() {
    const decisoes = (jogador.historicoDecisoes || []).slice(-5).reverse();
    if (!decisoes.length) return "";
    return `
      <div class="historico" style="margin-bottom:24px; text-align:left;">
        <h2>Impacto das decisões</h2>
        ${decisoes.map((d) => `<div class="historico-item"><span>${d.marco} · ${d.estrategia}</span><span style="color:var(--cyan)">reputação ${d.reputacao >= 0 ? "+" : ""}${d.reputacao} · técnico ${d.tecnico >= 0 ? "+" : ""}${d.tecnico}${d.torcida !== undefined ? ` · torcida ${d.torcida >= 0 ? "+" : ""}${d.torcida}` : ""}</span></div>`).join("")}
      </div>
    `;
  }

  function renderHistoricoLiga() {
    const temporadas = (window.CB.HISTORICO_LIGA || []).slice(-5).reverse();
    if (!temporadas.length) return "";
    return `
      <section class="historico-liga">
        <h2>Histórico da liga</h2>
        ${temporadas.map((t) => `
          <div class="historico-liga-item">
            <span class="historico-liga-ano">T${t.temporada}</span>
            <img class="mini-logo" src="${t.campeaoImagem}" alt="" />
            <div><strong>${t.campeao}</strong><small>MVP ${t.mvp} · DPOY ${t.dpoy} · ROY ${t.roy}</small></div>
            <span class="historico-liga-draft">#1 ${t.draft[0] ? t.draft[0].nome : "—"}</span>
          </div>
        `).join("")}
      </section>
    `;
  }

  function renderRecordesCarreira() {
    const e = jogador.estatisticasCarreira;
    if (!e || !e.jogos) return "";
    return `
      <section class="recordes-carreira">
        <h2>Recordes da carreira</h2>
        <div><span>Jogos</span><strong>${e.jogos}</strong></div><div><span>Pontos</span><strong>${Math.round(e.pontos)}</strong></div>
        <div><span>Rebotes</span><strong>${Math.round(e.rebotes)}</strong></div><div><span>Assistências</span><strong>${Math.round(e.assistencias)}</strong></div>
        <div><span>Roubos</span><strong>${Math.round(e.roubos)}</strong></div><div><span>Tocos</span><strong>${Math.round(e.tocos)}</strong></div>
      </section>
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
    if ((eventoPendente === "trade-aceito" || eventoPendente === "free-agency-assinado") && offseason && offseason.ultimoMovimento) {
      const m = offseason.ultimoMovimento;
      return `
        <div class="trade-resultado">
          <p class="evento-msg ok">${eventoPendente === "free-agency-assinado" ? "Contrato assinado" : "Troca fechada"}</p>
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
    if (eventoPendente === "extensao" && offseason && offseason.extensao) {
      const e = offseason.extensao;
      return `<div class="offseason-box"><h2>Extensão de contrato</h2><p class="meta-linha" style="margin-top:0;text-align:left;">${jogador.time.nome} oferece ${e.anos} anos. Papel projetado: <b style="color:var(--text)">${infoPapel(e.papel).label}</b>. Aceitar fortalece sua relação; recusar leva você à free agency.</p></div>`;
    }

    if (eventoPendente === "free-agency" && offseason) {
      return `<div class="offseason-box"><h2>Free agency</h2><p class="meta-linha" style="margin-top:0;text-align:left;">Você recusou a extensão. Escolha a próxima franquia para sua carreira.</p><div class="lista-universidades">${offseason.ofertas.map((o) => `<button class="uni-opcao" type="button" data-aceitar-troca="${o.time.nome}"><img class="uni-logo" src="${o.time.imagem}" alt="${o.time.nome}" /><span class="uni-info"><span class="uni-tier">${o.time.conferencia} · força ${o.time.forca}</span><span class="uni-nome">${o.time.nome}</span><span class="uni-meta">interesse ${o.score}</span></span></button>`).join("")}</div></div>`;
    }

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
            Fique ou peça troca. Pedir saída aumenta o interesse do mercado, mas afeta técnico e torcida.
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

    if (eventoPendente === "extensao") {
      return `<div class="acoes-stack"><button class="acao" id="btn-aceitar-extensao">Aceitar extensão</button><button class="acao secundaria" id="btn-recusar-extensao">Recusar e testar a free agency</button></div>`;
    }

    if (eventoPendente === "free-agency") {
      return `<div class="acoes-stack"><button class="acao secundaria" id="btn-assinar-ponte">Assinar 1 ano e ficar</button></div>`;
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

    if (eventoPendente === "trade-aceito" || eventoPendente === "trade-forçada-feita" || eventoPendente === "free-agency-assinado") {
      return `
        <div class="acoes-stack">
          <button class="acao" id="btn-ficar-time">Próxima temporada</button>
        </div>
      `;
    }

    if (MODO_TEMPORADA_ENXUTO) {
      return `
        <div class="acoes-stack carreira-enxuta-acao">
          ${renderObjetivosTemporada()}
          <p>Uma temporada inteira será simulada. As decisões estratégicas acontecem na offseason.</p>
          <button class="acao" id="btn-iniciar-temporada-animada">Iniciar temporada ${jogador.temporada}</button>
        </div>
      `;
    }
    return renderPlanoTemporada();
  }

  function renderObjetivosTemporada() {
    const opcoes = [["titular", "Virar titular"], ["playoffs", "Chegar aos playoffs"], ["pontos", "20 PPG"], ["allstar", "All-Star"], ["desenvolver", "Desenvolver atributo"], ["serie", "Vencer série"]];
    const atributos = objetivoSelecionado.id === "desenvolver"
      ? `<div class="objetivo-atributos">${ATRIBUTOS.map((a) => `<button class="plano-opcao${objetivoSelecionado.atributo === a ? " ativo" : ""}" data-objetivo-atributo="${a}">${NOMES_ATRIBUTOS[a]}</button>`).join("")}</div>`
      : "";
    return `<section class="objetivos-temporada"><h3>Objetivo da temporada</h3><div class="objetivo-opcoes">${opcoes.map(([id, label]) => `<button class="plano-opcao${objetivoSelecionado.id === id ? " ativo" : ""}" data-objetivo="${id}">${label}</button>`).join("")}</div>${atributos}</section>`;
  }

  function renderResultadoObjetivo() {
    if (!ultimoObjetivoTemporada) return "";
    const o = ultimoObjetivoTemporada;
    return `<div class="resultado-objetivo ${o.cumpriu ? "cumprido" : "falhou"}"><span>OBJETIVO DA TEMPORADA</span><strong>${o.cumpriu ? "CUMPRIDO" : "NÃO CUMPRIDO"}</strong><p>${o.titulo} · ${o.efeito || ""}</p></div>`;
  }

  function opcaoPlano(grupo, valor, titulo, descricao, selecionado) {
    const atributo = `data-plano-${grupo}`;
    return `
      <button type="button" class="plano-opcao${selecionado ? " ativo" : ""}" ${atributo}="${valor}">
        <span>${titulo}</span><small>${descricao}</small>
      </button>
    `;
  }

  function renderPlanoTemporada() {
    const foco = ATRIBUTOS.map((a) =>
      opcaoPlano("foco", a, NOMES_ATRIBUTOS[a], "+2 no crescimento", planoSelecionado.foco === a)
    ).join("");
    const papel = [
      ["titular", "Titular", "mais minutos e exposição"],
      ["sexto", "Sexto homem", "impacto vindo do banco"],
      ["banco", "Banco", "menor carga e risco"],
    ].map(([v, t, d]) => opcaoPlano("papel", v, t, d, planoSelecionado.papel === v)).join("");
    const estilo = [
      ["agressivo", "Agressivo", "+ pontos, menos criação"],
      ["equilibrado", "Equilibrado", "sem modificador"],
      ["coletivo", "Coletivo", "+ assistências, menos volume"],
    ].map(([v, t, d]) => opcaoPlano("estilo", v, t, d, planoSelecionado.estilo === v)).join("");
    const simulacao = [
      ["manual", "Manual", "você controla cada bloco"],
      ["automatico", "Automática", "blocos seguem até um marco"],
    ].map(([v, t, d]) => opcaoPlano("simulacao", v, t, d, planoSelecionado.simulacao === v)).join("");

    return `
      <section class="plano-temporada">
        <span class="lenda-posicao">Antes de entrar em quadra</span>
        <h2>Plano da temporada</h2>
        <p>Suas escolhas mudam evolução, minutos e estatísticas desta temporada.</p>
        <h3>Foco de treino</h3><div class="plano-grid plano-grid-cinco">${foco}</div>
        <h3>Papel desejado</h3><div class="plano-grid">${papel}</div>
        <h3>Estilo de jogo</h3><div class="plano-grid">${estilo}</div>
        <h3>Simulação dos jogos comuns</h3><div class="plano-grid plano-grid-dois">${simulacao}</div>
        <div class="acoes-stack"><button class="acao" id="btn-jogar-temporada-pro">Iniciar temporada</button></div>
      </section>
    `;
  }

  function renderSimulacao() {
    const s = simulacaoEmAndamento;
    if (s.fase === "playoffs") return renderSimulacaoPlayoffs(s);
    const jogos = s.relatorioTemporada.jogos;
    const jogo = jogos[Math.max(0, s.indice - 1)];
    const vistos = jogos.slice(0, s.indice);
    const vitorias = vistos.filter((j) => j.venceu).length;
    const derrotas = vistos.length - vitorias;
    const progresso = jogos.length ? Math.round((s.indice / jogos.length) * 100) : 100;
    const proximoJogo = jogos[s.indice];
    const marcoAtual = MARCOS_TEMPORADA[s.indice];
    const narrativa = s.eventoNarrativo ? renderEventoNarrativo(s.eventoNarrativo) : "";
    const agencia = !s.semAgencia && !s.eventoNarrativo && marcoAtual && proximoJogo ? renderAgenciaJogoChave(s) : "";
    const logoAdversario = jogo && jogo.adversario.imagem
      ? `<img class="sim-logo" src="${jogo.adversario.imagem}" alt="${jogo.adversario.nome}" />`
      : `<div class="sim-logo sim-logo-texto">G</div>`;
    const linhaJogo = jogo
      ? `<div class="sim-placar ${jogo.venceu ? "venceu" : "perdeu"}">
          <div><span>${jogador.time ? jogador.time.nome : "Seu time"}</span><strong>${jogo.pontosTime}</strong></div>
          <span class="sim-x">×</span>
          <div>${logoAdversario}<span>${jogo.adversario.nome}</span><strong>${jogo.pontosAdversario}</strong></div>
        </div>
        <p class="sim-status ${jogo.venceu ? "vitoria" : "derrota"}">${jogo.venceu ? "VITÓRIA" : "DERROTA"} · ${jogo.rivalidade ? "RIVALIDADE · " : ""}${jogo.fora ? "FORA POR LESÃO" : `${jogo.stats.pontos.toFixed(1)} PTS · ${jogo.stats.rebotes.toFixed(1)} REB · ${jogo.stats.assistencias.toFixed(1)} AST`}</p>`
      : `<p class="sim-status">A bola vai subir...</p>`;
    const impactoDecisao = jogador.ultimoImpactoDecisao && jogo && MARCOS_TEMPORADA[s.indice - 1]
      ? `<p class="sim-impacto">${jogador.ultimoImpactoDecisao.rotulo}: reputação +${jogador.ultimoImpactoDecisao.reputacao} · técnico ${jogador.ultimoImpactoDecisao.tecnico >= 0 ? "+" : ""}${jogador.ultimoImpactoDecisao.tecnico}</p>`
      : "";
    const jogosDoBloco = s.ultimoBloco
      ? jogos.slice(s.ultimoBloco.inicio, s.ultimoBloco.fim)
      : vistos.slice(-6);
    const tituloResultados = s.ultimoBloco
      ? `Bloco simulado · ${jogosDoBloco.length} jogos`
      : "Resultados recentes";
    const resultadosRecentes = jogosDoBloco.slice().reverse().map((j) => `
      <div class="sim-resultado-recente ${j.venceu ? "venceu" : "perdeu"}">
        <b>${j.venceu ? "V" : "D"}</b><span>vs ${j.adversario.nome}${j.fora ? " · fora por lesão" : ""}</span><strong>${j.pontosTime}-${j.pontosAdversario}</strong>
      </div>
    `).join("");
    const chamadaProximo = proximoJogo
      ? `${marcoAtual ? `<span class="sim-marco">${marcoAtual}</span>` : "Próximo no calendário"}: <b>${proximoJogo.adversario.nome}</b>`
      : "Todos os jogos da temporada foram concluídos.";
    const proximaAcao = s.autoPassar
      ? `<p class="sim-auto-status">Simulando jogos da temporada...</p>`
      : s.eventoNarrativo
      ? ""
      : !proximoJogo
      ? `<button class="acao" id="btn-proximo-jogo">Ver resumo da temporada</button>`
      : marcoAtual
        ? s.semAgencia || s.estrategiaChave
          ? `<button class="acao" id="btn-proximo-jogo">Jogar jogo-chave</button>`
          : ""
        : `<button class="acao" id="btn-simular-bloco">Simular ${Object.keys(MARCOS_TEMPORADA).map(Number).find((i) => i > s.indice) - s.indice || jogos.length - s.indice} jogos até o próximo marco</button>`;
    return `
      <div class="carta-lenda simulacao-temporada">
        <span class="lenda-posicao">${nomeContexto(jogador.contexto)} · temporada em andamento</span>
        <h2 class="lenda-nome">${jogador.nome}</h2>
        <div class="sim-layout">
          <section class="sim-painel-principal">
            <div class="sim-campanha"><strong>${vitorias}-${derrotas}</strong><span>campanha parcial · jogo ${s.indice}/${jogos.length}</span></div>
            <div class="sim-progresso"><span style="width:${progresso}%"></span></div>
        ${linhaJogo}
        ${impactoDecisao}
        <p class="sim-proximo">${chamadaProximo}</p>
        ${narrativa}
        ${agencia}
            ${proximaAcao}
          </section>
          <aside class="sim-painel-lateral">
            <h3>Calendário</h3>
            ${vistos.length ? `<div class="sim-resultados"><h3>${tituloResultados}</h3>${resultadosRecentes}</div>` : `<p class="sim-vazio">Os resultados da temporada aparecerão aqui.</p>`}
            ${renderCorridaAoVivo(s.relatorioTemporada)}
          </aside>
        </div>
      </div>
    `;
  }

  function renderEventoNarrativo(evento) {
    return `
      <section class="evento-narrativo">
        <span>ENTRE BLOCOS</span>
        <h3>${evento.titulo}</h3>
        <p>${evento.texto}</p>
        <div class="evento-opcoes">
          ${evento.opcoes.map((o) => `<button class="plano-opcao" data-decisao-evento="${o.id}"><span>${o.label}</span><small>${o.detalhe}</small></button>`).join("")}
        </div>
      </section>
    `;
  }

  function renderCorridaAoVivo(relatorio) {
    const corrida = relatorio.premios && relatorio.premios.corridaPremios;
    if (!corrida) return "";
    const linha = (titulo, lista) => `<div class="sim-corrida"><span>${titulo}</span>${(lista || []).slice(0, 3).map((p, i) => `<small>${i + 1}. ${p.nome}</small>`).join("")}</div>`;
    return `<div class="sim-corridas"><h3>Corridas projetadas</h3>${linha("MVP", corrida.mvp)}${linha("DPOY", corrida.dpoy)}${linha("ROY", corrida.roy)}</div>`;
  }

  function renderAgenciaJogoChave(s) {
    const opcoes = [
      ["protagonista", "Assumir protagonismo", "+ pontos · menos criação"],
      ["coletivo", "Jogar pelo time", "+ assistências · eficiência"],
      ["defensivo", "Missão defensiva", "+ rebotes, roubos e tocos"],
    ];
    return `
      <section class="agencia-chave">
        <h3>Qual será sua abordagem?</h3>
        <p>Todo jogo-chave exige uma decisão. Sua escolha reforça seu desempenho e acrescenta evolução no fim da temporada.</p>
        <div class="plano-grid">
          ${opcoes.map(([v, t, d]) => `<button class="plano-opcao${s.estrategiaChave === v ? " ativo" : ""}" data-agencia-chave="${v}"><span>${t}</span><small>${d}</small></button>`).join("")}
        </div>
      </section>
    `;
  }

  function renderSimulacaoPlayoffs(s) {
    const series = s.relatorioTemporada.playoffs.series || [];
    const concluida = series[s.playoffIndice - 1];
    const proxima = series[s.playoffIndice];
    const feitas = series.slice(0, s.playoffIndice).map((serie) => `
      <div class="sim-serie ${serie.venceu ? "venceu" : "perdeu"}">
        <img class="mini-logo" src="${serie.adversario.imagem}" alt="" />
        <span>${serie.rodada} · ${serie.adversario.nome}</span>
        <strong>${serie.venceu ? "Venceu" : "Eliminado"} ${serie.placar}</strong>
      </div>
    `).join("");
    const destaque = concluida
      ? `<div class="sim-placar ${concluida.venceu ? "venceu" : "perdeu"}">
          <div><span>${jogador.time.nome}</span><strong>${concluida.placar.split("-")[0]}</strong></div>
          <span class="sim-x">×</span>
          <div><img class="sim-logo" src="${concluida.adversario.imagem}" alt="${concluida.adversario.nome}" /><span>${concluida.adversario.nome}</span><strong>${concluida.placar.split("-")[1]}</strong></div>
        </div>
        <p class="sim-status ${concluida.venceu ? "vitoria" : "derrota"}">${concluida.venceu ? "SÉRIE VENCIDA" : "FIM DE SÉRIE"} · ${concluida.rodada}</p>`
      : `<p class="sim-status">A pós-temporada começa agora.</p>`;
    const chamada = proxima
      ? `<span class="sim-marco">${proxima.rodada}</span>: <b>${jogador.time.nome} vs ${proxima.adversario.nome}</b>`
      : "Todos os confrontos de playoff foram concluídos.";
    return `
      <div class="carta-lenda simulacao-temporada">
        <span class="lenda-posicao">NBA · pós-temporada</span>
        <h2 class="lenda-nome">Playoffs</h2>
        <div class="sim-layout">
          <section class="sim-painel-principal">
            <div class="sim-campanha"><strong>${s.playoffIndice}/${series.length}</strong><span>séries concluídas</span></div>
            <div class="sim-progresso"><span style="width:${Math.round((s.playoffIndice / series.length) * 100)}%"></span></div>
            ${destaque}
            <p class="sim-proximo">${chamada}</p>
        ${proxima && !s.semAgencia ? renderAgenciaJogoChave(s) : ""}
        ${s.autoPassar ? `<p class="sim-auto-status">Simulando pós-temporada...</p>` : proxima ? s.semAgencia || s.estrategiaChave ? `<button class="acao" id="btn-proximo-jogo">Jogar confronto de playoff</button>` : "" : `<button class="acao" id="btn-proximo-jogo">Ver resumo da temporada</button>`}
          </section>
          <aside class="sim-painel-lateral">
            <h3>Chave de playoffs</h3>
            ${feitas ? `<div class="sim-resultados"><h3>Caminho nos playoffs</h3>${feitas}</div>` : `<p class="sim-vazio">Sua caminhada aparecerá aqui.</p>`}
          </aside>
        </div>
      </div>
    `;
  }
  inicializarSistemaSaves();
})();
