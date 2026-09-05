// pro.js
// Loop de temporada da carreira profissional: NBA <-> G-League,
// com offseason (ficar / pedir troca / ofertas).
(function () {
  const { NOMES_ATRIBUTOS, ATRIBUTOS, progredirTemporada, TIMES, SALARY_CAP = 150 } = window.CB;
  const { simularTemporadaCompleta, criarTemporadaProgressiva, resolverTemporadaAutomatica, resolverProximoJogoDaTemporada, finalizarTemporadaProgressiva, estatisticasDoJogo, sortearNoiteHistorica, aplicarNoiteHistorica } = window.CB;
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
  const ANO_INICIAL_CARREIRA = 2026;
  // Livro de recordes: cada entrada declara o escopo dos dados que a sustenta.
  // Não tratamos um recorde de uma partida como se fosse total de carreira.
  const RECORDES_NBA = [
    { id:"carreira-pontos", categoria:"Carreira", nome:"Pontos", detentor:"LeBron James", marca:42184, campo:"pontos", escopo:"carreira" },
    { id:"carreira-rebotes", categoria:"Carreira", nome:"Rebotes", detentor:"Wilt Chamberlain", marca:23924, campo:"rebotes", escopo:"carreira" },
    { id:"carreira-assistencias", categoria:"Carreira", nome:"Assistências", detentor:"John Stockton", marca:15806, campo:"assistencias", escopo:"carreira" },
    { id:"carreira-roubos", categoria:"Carreira", nome:"Roubos", detentor:"John Stockton", marca:3265, campo:"roubos", escopo:"carreira" },
    { id:"carreira-tocos", categoria:"Carreira", nome:"Tocos", detentor:"Hakeem Olajuwon", marca:3830, campo:"tocos", escopo:"carreira" },
    { id:"temporada-pontos", categoria:"Temporada regular", nome:"Pontos em uma temporada", detentor:"Wilt Chamberlain", marca:4029, campo:"pontos", escopo:"temporada" },
    { id:"temporada-rebotes", categoria:"Temporada regular", nome:"Rebotes em uma temporada", detentor:"Wilt Chamberlain", marca:2149, campo:"rebotes", escopo:"temporada" },
    { id:"temporada-assistencias", categoria:"Temporada regular", nome:"Assistências em uma temporada", detentor:"John Stockton", marca:1164, campo:"assistencias", escopo:"temporada" },
    { id:"temporada-roubos", categoria:"Temporada regular", nome:"Roubos em uma temporada", detentor:"Alvin Robertson", marca:301, campo:"roubos", escopo:"temporada" },
    { id:"temporada-tocos", categoria:"Temporada regular", nome:"Tocos em uma temporada", detentor:"Mark Eaton", marca:456, campo:"tocos", escopo:"temporada" },
    { id:"temporada-tres", categoria:"Temporada regular", nome:"Bolas de 3 em uma temporada", detentor:"Stephen Curry", marca:402, campo:"tresConvertidas", escopo:"temporada" },
    { id:"jogo-pontos", categoria:"Jogo · temporada regular", nome:"Pontos em um jogo", detentor:"Wilt Chamberlain", marca:100, campo:"pontos", escopo:"jogo" },
    { id:"jogo-rebotes", categoria:"Jogo · temporada regular", nome:"Rebotes em um jogo", detentor:"Wilt Chamberlain", marca:55, campo:"rebotes", escopo:"jogo" },
    { id:"jogo-assistencias", categoria:"Jogo · temporada regular", nome:"Assistências em um jogo", detentor:"Scott Skiles", marca:30, campo:"assistencias", escopo:"jogo" },
    { id:"jogo-roubos", categoria:"Jogo · temporada regular", nome:"Roubos em um jogo", detentor:"Kendall Gill", marca:11, campo:"roubos", escopo:"jogo" },
    { id:"jogo-tocos", categoria:"Jogo · temporada regular", nome:"Tocos em um jogo", detentor:"Elmore Smith", marca:17, campo:"tocos", escopo:"jogo" },
    { id:"jogo-tres", categoria:"Jogo · temporada regular", nome:"Bolas de 3 em um jogo", detentor:"Klay Thompson", marca:14, campo:"tresConvertidas", escopo:"jogo" },
    { id:"jogo-fg", categoria:"Jogo · temporada regular", nome:"Arremessos convertidos em um jogo", detentor:"Wilt Chamberlain", marca:36, campo:"arremessosConvertidos", escopo:"jogo" },
    { id:"jogo-ft", categoria:"Jogo · temporada regular", nome:"Lances livres convertidos em um jogo", detentor:"Wilt Chamberlain", marca:28, campo:"lancesLivresConvertidos", escopo:"jogo" },
    { id:"playoff-pontos", categoria:"Playoffs", nome:"Pontos em um jogo de playoffs", detentor:"Michael Jordan", marca:63, campo:"pontos", escopo:"playoff" },
    { id:"playoff-rebotes", categoria:"Playoffs", nome:"Rebotes em um jogo de playoffs", detentor:"Wilt Chamberlain", marca:41, campo:"rebotes", escopo:"playoff" },
    { id:"playoff-tres", categoria:"Playoffs", nome:"Bolas de 3 em um jogo de playoffs", detentor:"Damian Lillard", marca:12, campo:"tresConvertidas", escopo:"playoff" },
  ];

  function rotuloAnoTemporada(ano = jogador && jogador.anoTemporadaAtual) {
    const inicio = Number(ano) || ANO_INICIAL_CARREIRA;
    return `${inicio}–${String(inicio + 1).slice(-2)}`;
  }

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

  function resolverTemporadaNoMotorUnico(atleta) {
    return atleta.contexto === "nba" ? resolverTemporadaAutomatica(atleta) : simularTemporadaCompleta(atleta);
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
  let centralDuranteSimulacao = false;
  let abaCentralTemporada = "resumo";
  const CHAVE_SAVES = "baska-carreira-slots-v2";
  const CHAVE_SAVE_LEGADO = "baska-carreira-v1";
  const VERSAO_SAVE = 4;
  let slotAtual = null;
  let erroSave = null;
  let planoSelecionado = { foco: "arremesso", papel: "titular", estilo: "equilibrado", simulacao: "manual" };
  let simulacaoEmAndamento = null;
  let convocacaoSelecao = null;
  let torneioSelecao = null;
  // Cerimônias persistem no save para que uma atualização da página não
  // faça o usuário perder um prêmio conquistado no fim da temporada.
  let cerimoniasPremiosPendentes = [];

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
    jogador.idCarreira = jogador.idCarreira || `usuario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    jogador.temporada = 1;
    jogador.anoTemporadaAtual = jogador.anoTemporadaAtual || ANO_INICIAL_CARREIRA;
    jogador.historicoTimes = jogador.historicoTimes || [];
    // Insere primeiro para que a avaliação de papel enxergue os concorrentes
    // reais da mesma posição desde o primeiro dia na NBA.
    sincronizarJogadorNoMundo();
    initCarreiraPro(jogador);
    sincronizarJogadorNoMundo();
    inicializarRivalVivo();
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
    cerimoniasPremiosPendentes = [];
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

  const CHAVES_REFERENCIA_TIME = new Set(["time", "adversario", "campeao", "campeaoLeste", "campeaoOeste", "eliminadoPor", "timeA", "timeB", "vencedor", "mvpTime", "dpoyTime", "sextoHomemTime", "novatoTime"]);

  function serializarSaves(saves) {
    return JSON.stringify(saves, (chave, valor) => {
      if (CHAVES_REFERENCIA_TIME.has(chave) && valor && valor.nome && (valor.jogadores || valor.slug)) return { __timeRef: valor.nome };
      return valor;
    });
  }

  function reidratarReferenciasDeTime(valor) {
    if (!valor || typeof valor !== "object") return valor;
    if (valor.__timeRef) return TIMES.find((time) => time.nome === valor.__timeRef) || null;
    if (Array.isArray(valor)) return valor.map(reidratarReferenciasDeTime);
    Object.keys(valor).forEach((chave) => { valor[chave] = reidratarReferenciasDeTime(valor[chave]); });
    return valor;
  }

  function gravarSaves(saves) {
    try {
      localStorage.setItem(CHAVE_SAVES, serializarSaves(saves));
      erroSave = null;
      return true;
    } catch (_) {
      erroSave = "Não foi possível salvar esta carreira. Libere espaço no navegador ou exporte uma cópia.";
      return false;
    }
  }

  function sincronizarJogadorNoMundo() {
    if (!jogador) return;
    jogador.idCarreira = jogador.idCarreira || `usuario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (window.CB.sincronizarJogadorDaCarreira) window.CB.sincronizarJogadorDaCarreira(jogador);
  }

  function inicializarRivalVivo() {
    if (!jogador || !jogador.rival) return;
    const media = Math.round(ATRIBUTOS.reduce((soma, atributo) => soma + jogador.atual[atributo], 0) / ATRIBUTOS.length);
    if (!jogador.rivalVivo) {
      const destinos = TIMES.filter((time) => !jogador.time || time.nome !== jogador.time.nome).sort((a, b) => a.forca - b.forca);
      const time = destinos[Math.floor(Math.random() * Math.min(12, destinos.length))];
      jogador.rivalVivo = { id:`rival-${jogador.idCarreira}`, nome:jogador.rival, timeNome:time.nome, overall:Math.max(72, Math.min(91, media + Math.floor(Math.random() * 7) - 4)), potencial:Math.max(78, Math.min(96, media + 5)), confrontos:{ vitorias:0, derrotas:0 }, temporadas:0 };
    }
    const rival = jogador.rivalVivo;
    rival.confrontos = rival.confrontos || { vitorias: 0, derrotas: 0 };
    rival.temporadas = rival.temporadas || 0;
    const time = TIMES.find((candidato) => candidato.nome === rival.timeNome);
    if (time && !time.jogadores.some((atleta) => atleta.id === rival.id)) {
      time.jogadores.push({ id:rival.id, nome:rival.nome, overall:rival.overall, potencial:rival.potencial, idade:jogador.idade, posicao:jogador.posicao, minutos:30, rivalPessoal:true, contrato:{ anosRestantes:4, salario:Math.round(rival.overall * .38) } });
      time.jogadores.sort((a, b) => b.overall - a.overall);
      time.elenco = time.jogadores.map((atleta) => atleta.nome);
      time.estrelas = time.jogadores.slice(0, 3).map((atleta) => atleta.nome);
    }
  }

  function registrarConfrontoComRival(jogo) {
    if (!jogo || !jogo.rivalPessoal || !jogador.rivalVivo) return;
    const placar = jogador.rivalVivo.confrontos || (jogador.rivalVivo.confrontos = { vitorias:0, derrotas:0 });
    if (jogo.venceu) placar.vitorias += 1;
    else placar.derrotas += 1;
  }

  function evoluirRivalVivo() {
    const rival = jogador.rivalVivo;
    if (!rival) return;
    rival.temporadas = (rival.temporadas || 0) + 1;
    rival.overall = Math.min(rival.potencial || 96, rival.overall + (rival.temporadas < 5 ? 1 + Math.floor(Math.random() * 2) : Math.random() < .45 ? 1 : 0));
    const atleta = TIMES.flatMap((time) => time.jogadores).find((item) => item.id === rival.id);
    if (atleta) atleta.overall = rival.overall;
  }

  function dadosDaCarreira() {
    sincronizarJogadorNoMundo();
    // Enquanto uma temporada está ativa, o mesmo relatório já está dentro
    // da simulação. Não o duplicamos no save.
    return { versao: VERSAO_SAVE, jogador, ultimoRegistro, ultimoRelatorioTemporada: simulacaoEmAndamento ? null : ultimoRelatorioTemporada, temporadasNoTimeAtual, aposentado, motivoAposentadoria, simulacaoEmAndamento, cerimoniasPremiosPendentes, convocacaoSelecao, torneioSelecao, mundo: TIMES.map((t) => ({ ...t })), agentesLivres: window.CB.AGENTES_LIVRES || [], historicoLiga: window.CB.HISTORICO_LIGA || [] };
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
      versao: VERSAO_SAVE,
      nome: jogador.nome || "Nova carreira",
      temporada: jogador.temporada || 1,
      anoTemporada: rotuloAnoTemporada(),
      time: jogador.time ? jogador.time.nome : "G-League",
      atualizadoEm: Date.now(),
      dados: dadosDaCarreira(),
    };
    const indice = saves.findIndex((save) => save.id === slotAtual);
    if (indice === -1) saves.push(registro);
    else saves[indice] = registro;
    return gravarSaves(saves);
  }

  function migrarSaveLegado() {
    const saves = lerSaves();
    if (saves.length) return saves;
    try {
      const legado = JSON.parse(localStorage.getItem(CHAVE_SAVE_LEGADO) || "null");
      if (!legado || !legado.jogador) return saves;
      saves.push({
        id: `carreira-legado-${Date.now()}`,
        versao: 1,
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
                <span class="save-meta">${save.anoTemporada || `T${save.temporada}`} · ${save.time} · salvo em ${formatarDataSave(save.atualizadoEm)}</span>
              </button>
              <button type="button" class="save-apagar" aria-label="Apagar carreira de ${save.nome}" title="Apagar carreira" data-apagar-save="${save.id}">×</button>
            </article>`).join("") : '<div class="pagina-vazia">Nenhuma carreira salva. Crie sua primeira jornada.</div>'}
        </div>
        <div class="acoes-stack">
          <button class="acao" id="btn-nova-carreira">Criar nova carreira</button>
          ${slotAtual ? '<button class="acao secundaria" id="btn-exportar-carreira">Exportar carreira atual</button>' : ""}
          <label class="acao secundaria importar-save" for="input-importar-carreira">Importar carreira</label>
          <input id="input-importar-carreira" type="file" accept="application/json,.json" hidden />
        </div>
        ${erroSave ? `<p class="aviso-save">${erroSave}</p>` : ""}
      </section>`;
    document.querySelectorAll("[data-carregar-save]").forEach((btn) => btn.addEventListener("click", () => carregarCarreira(btn.dataset.carregarSave)));
    document.querySelectorAll("[data-apagar-save]").forEach((btn) => btn.addEventListener("click", () => apagarCarreira(btn.dataset.apagarSave)));
    const nova = document.getElementById("btn-nova-carreira");
    if (nova) nova.addEventListener("click", criarNovaCarreira);
    const exportar = document.getElementById("btn-exportar-carreira");
    if (exportar) exportar.addEventListener("click", exportarCarreiraAtual);
    const importar = document.getElementById("input-importar-carreira");
    if (importar) importar.addEventListener("change", () => importarCarreira(importar.files && importar.files[0]));
  }

  function exportarCarreiraAtual() {
    if (!slotAtual) return;
    salvarCarreiraLocal();
    const save = lerSaves().find((item) => item.id === slotAtual);
    if (!save) return;
    const arquivo = new Blob([JSON.stringify({ tipo: "baska-carreira", versao: VERSAO_SAVE, save }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `baska-${(save.nome || "carreira").replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}.json`;
    link.click();
    // Dá ao navegador tempo para iniciar o download antes de liberar o Blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function importarCarreira(arquivo) {
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const pacote = JSON.parse(String(leitor.result || ""));
        const save = pacote && pacote.tipo === "baska-carreira" ? pacote.save : pacote;
        if (!save || !save.dados || !save.dados.jogador || (save.versao && save.versao > VERSAO_SAVE)) throw new Error("arquivo inválido");
        const novo = { ...save, id: `carreira-importada-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, versao: VERSAO_SAVE, atualizadoEm: Date.now(), nome: `${save.nome || "Carreira"} (importada)` };
        const saves = lerSaves();
        saves.push(novo);
        if (!gravarSaves(saves)) { renderMenuSaves(); return; }
        erroSave = null;
        renderMenuSaves();
      } catch (_) {
        erroSave = "Não foi possível importar este arquivo de carreira.";
        renderMenuSaves();
      }
    };
    leitor.readAsText(arquivo);
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
    reidratarReferenciasDeTime(dados);
    jogador = dados.jogador;
    jogador.anoTemporadaAtual = jogador.anoTemporadaAtual || ANO_INICIAL_CARREIRA;
    if (jogador.time) jogador.time = TIMES.find((t) => t.nome === jogador.time.nome) || jogador.time;
    ultimoRegistro = dados.ultimoRegistro;
    ultimoRelatorioTemporada = dados.ultimoRelatorioTemporada;
    temporadasNoTimeAtual = dados.temporadasNoTimeAtual || 0;
    aposentado = !!dados.aposentado;
    motivoAposentadoria = dados.motivoAposentadoria || null;
    simulacaoEmAndamento = dados.simulacaoEmAndamento || null;
    cerimoniasPremiosPendentes = Array.isArray(dados.cerimoniasPremiosPendentes) ? dados.cerimoniasPremiosPendentes : [];
    convocacaoSelecao = dados.convocacaoSelecao || null;
    torneioSelecao = dados.torneioSelecao || null;
    // Uma animação automática não deve deixar uma carreira restaurada presa
    // em uma tela sem ação. Ao recarregar, ela passa a aguardar o comando.
    if (simulacaoEmAndamento && simulacaoEmAndamento.autoPassar) simulacaoEmAndamento.autoPassar = false;
    // Saves antigos podem não ter o atleta no roster. Reinsira-o antes de
    // recalcular o papel, para que a disputa por minutos não use uma força
    // abstrata do time.
    sincronizarJogadorNoMundo();
    initCarreiraPro(jogador);
    sincronizarJogadorNoMundo();
    inicializarRivalVivo();
  }

  function carregarCarreira(id) {
    const salvo = lerSaves().find((save) => save.id === id);
    if (!salvo || !salvo.dados || !salvo.dados.jogador) return;
    if (salvo.versao && salvo.versao > VERSAO_SAVE) {
      erroSave = "Esta carreira foi salva por uma versão mais nova do jogo.";
      renderMenuSaves();
      return;
    }
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
    cerimoniasPremiosPendentes = [];
    convocacaoSelecao = null;
    torneioSelecao = null;
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
        const anos = idade >= 32 ? 2 : idade <= 25 ? 4 : 3;
        const salario = Math.round(Math.max(4, overall * (.34 + Math.min(18, jogador.reputacao || 50) / 260)) * 10) / 10;
        const espaco = Number.isFinite(t.espacoCap) ? t.espacoCap : SALARY_CAP - (t.folhaSalarial || 0);
        // Times acima do teto podem oferecer apenas se o interesse for alto;
        // a oferta traz o trade-off claramente para o jogador.
        if (espaco < salario) score -= Math.min(22, (salario - espaco) * .7);
        return { time: t, score: Math.round(score), anos, salario, espacoCap: +espaco.toFixed(1) };
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
      extensao: { anos, papel: sugerirPapel(jogador), salario: Math.round(Math.max(5, overallDe(jogador.atual) * .4) * 10) / 10, espacoCap: jogador.time.espacoCap },
      ultimoMovimento: null,
    };
    eventoPendente = "extensao";
  }

  function aceitarExtensao() {
    if (!offseason || !offseason.extensao) return;
    jogador.contrato = { anosRestantes: offseason.extensao.anos, papelGarantido: offseason.extensao.papel, salario: offseason.extensao.salario };
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
    jogador.contrato = { anosRestantes: 1, papelGarantido: sugerirPapel(jogador), salario: Math.round(Math.max(4, overallDe(jogador.atual) * .35) * 10) / 10 };
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
    sincronizarJogadorNoMundo();
    const contextoDaTemporada = jogador.contexto;
    if (contextoDaTemporada === "nba") iniciarAcompanhamentoRecordesDaTemporada();
    const relatorioTemporada = jogador.contexto === "nba" ? criarTemporadaProgressiva(jogador) : simularTemporadaCompleta(jogador);
    relatorioTemporada.anoTemporada = rotuloAnoTemporada();
    const jogoAJogo = planoSelecionado.simulacao === "jogo-a-jogo";
    centralDuranteSimulacao = false;
    simulacaoEmAndamento = {
      contextoDaTemporada,
      relatorioTemporada,
      indice: 0,
      ultimoBloco: null,
      jogoAJogo,
      corridaAoVivo: criarCorridaAoVivo(relatorioTemporada, contextoDaTemporada),
      // Neste modo o ritmo é definido pelo calendário. Não há interrupções
      // extras entre partidas: o usuário apenas acompanha e avança o jogo.
      semAgencia: jogoAJogo,
    };
    prepararProximoJogo(simulacaoEmAndamento);
    salvarCarreiraLocal();
    render();
  }

  function identidadeAdversario(adversario) {
    const estrela = (adversario.estrelas || adversario.elenco || [])[0] || "a principal estrela";
    if ((adversario.forca || 75) >= 87) return `Contender · pare ${estrela}`;
    if ((adversario.forca || 75) <= 77) return `Jogo que o time espera vencer · ${estrela} lidera o rival`;
    return `Confronto equilibrado · atenção em ${estrela}`;
  }

  function criarMissaoJogo(jogo, indice) {
    if (jogo.rivalPessoal && jogador.rivalVivo) {
      return { tipo: "vitoria", alvo: 1, titulo: `Vença ${jogador.rivalVivo.nome}`, descricao: "O confronto pessoal vira manchete. Silencie o rival em quadra.", recompensa: "+4 reputação · +3 torcida" };
    }
    if (jogo.rivalidade) return { tipo: "vitoria", alvo: 1, titulo: "Vença a rivalidade", descricao: "A torcida cobra esta vitória.", recompensa: "+2 reputação · +1 torcida" };
    const ciclo = indice % 3;
    if (ciclo === 0) {
      const alvo = Math.max(14, Math.round(((jogador.atual.arremesso + jogador.atual.criacao) / 2) * .23));
      return { tipo: "pontos", alvo, titulo: `${alvo} pontos ou mais`, descricao: "Assuma o volume ofensivo.", recompensa: "+2 reputação" };
    }
    if (ciclo === 1) {
      const alvo = Math.max(5, Math.round((jogador.atual.criacao + jogador.atual.qiBasquete) * .055));
      return { tipo: "assistencias", alvo, titulo: `${alvo} assistências ou mais`, descricao: "Faça o ataque fluir.", recompensa: "+2 confiança do técnico" };
    }
    const alvo = Math.max(2, Math.round((jogador.atual.defesa + jogador.atual.atletismo) * .018));
    return { tipo: "defesa", alvo, titulo: `${alvo} ações defensivas`, descricao: "Some roubos e tocos contra o rival.", recompensa: "+1 reputação · +1 confiança" };
  }

  function criarDesafioCurto(s) {
    const inicio = s.indice;
    const fim = Math.min(s.relatorioTemporada.jogos.length, inicio + 5);
    const focoOfensivo = (inicio / 5) % 2 < 1;
    return focoOfensivo
      ? { inicio, fim, tipo: "pontos", alvo: 16, titulo: "Impacto ofensivo", descricao: "Mantenha média de 16 PPG nos próximos 5 jogos.", recompensa: "+3 reputação · +2 confiança" }
      : { inicio, fim, tipo: "vitorias", alvo: Math.min(3, fim - inicio), titulo: "Sequência vencedora", descricao: "Vença 3 dos próximos 5 jogos.", recompensa: "+2 reputação · +3 confiança" };
  }

  function prepararProximoJogo(s) {
    if (!s || !s.jogoAJogo || s.indice >= s.relatorioTemporada.jogos.length) return;
    const proximo = s.relatorioTemporada.jogos[s.indice];
    if (!s.missaoAtual) s.missaoAtual = criarMissaoJogo(proximo, s.indice);
    if (!s.desafioCurto) s.desafioCurto = criarDesafioCurto(s);
    if (proximo.rivalPessoal && !s.cenasRivalVistas?.[s.indice]) s.cenaRival = proximo;
  }

  function aplicarPreparacaoDeJogo(s, jogo) {
    if (!s.preparacaoSelecionada || jogo.preparacaoAplicada || !jogo.stats) return;
    const preparo = s.preparacaoSelecionada;
    const antes = { ...jogo.stats };
    if (preparo === "treino") {
      jogo.stats.pontos *= 1.08;
      jogador.energia = limitar(jogador.energia - 3);
    } else if (preparo === "filme") {
      jogo.stats.assistencias *= 1.12;
      jogo.stats.roubos *= 1.12;
      jogador.energia = limitar(jogador.energia - 1);
    } else if (preparo === "descanso") {
      jogador.energia = limitar(jogador.energia + 5);
    }
    Object.keys(jogo.stats).forEach((chave) => {
      jogo.stats[chave] = +jogo.stats[chave].toFixed(1);
      if (s.relatorioTemporada.medias[chave] !== undefined) {
        s.relatorioTemporada.medias[chave] = +(s.relatorioTemporada.medias[chave] + (jogo.stats[chave] - antes[chave]) / 82).toFixed(1);
      }
    });
    jogo.preparacaoAplicada = preparo;
  }

  function avaliarMissaoJogo(s, jogo) {
    const missao = s.missaoAtual;
    if (!missao) return null;
    const stats = jogo.stats || {};
    const valor = missao.tipo === "pontos" ? stats.pontos : missao.tipo === "assistencias" ? stats.assistencias : missao.tipo === "defesa" ? (stats.roubos || 0) + (stats.tocos || 0) : jogo.venceu ? 1 : 0;
    const cumpriu = valor >= missao.alvo;
    if (cumpriu) {
      jogador.reputacao = limitar(jogador.reputacao + (missao.tipo === "assistencias" ? 1 : 2));
      jogador.confiancaTecnico = limitar(jogador.confiancaTecnico + (missao.tipo === "pontos" ? 1 : 2));
    }
    const resultado = { ...missao, cumpriu, valor: +(+valor).toFixed(1) };
    jogo.missao = resultado;
    s.ultimaMissao = resultado;
    return resultado;
  }

  function avaliarDesafioCurto(s) {
    const desafio = s.desafioCurto;
    if (!desafio || s.indice < desafio.fim) return;
    const jogos = s.relatorioTemporada.jogos.slice(desafio.inicio, desafio.fim);
    const valor = desafio.tipo === "vitorias"
      ? jogos.filter((j) => j.venceu).length
      : desafio.tipo === "defesa"
        ? jogos.reduce((soma, jogo) => soma + ((jogo.stats && (jogo.stats.roubos + jogo.stats.tocos)) || 0), 0)
      : jogos.reduce((soma, jogo) => soma + ((jogo.stats && jogo.stats.pontos) || 0), 0) / Math.max(1, jogos.length);
    const cumpriu = valor >= desafio.alvo;
    if (cumpriu) {
      jogador.reputacao = limitar(jogador.reputacao + (desafio.tipo === "pontos" ? 3 : 2));
      jogador.confiancaTecnico = limitar(jogador.confiancaTecnico + (desafio.tipo === "vitorias" ? 3 : 2));
    }
    s.ultimoDesafio = { ...desafio, cumpriu, valor: +valor.toFixed(1) };
    s.desafioCurto = null;
  }

  function avaliarNotaDaPartida(jogo) {
    if (!jogo.stats) return { letra: "—", texto: "Fora por lesão", pontos: 0 };
    const stats = jogo.stats;
    const pontos = Math.round(38 + (jogo.venceu ? 18 : 0) + Math.min(22, stats.pontos * .8) + Math.min(9, stats.assistencias * .75) + Math.min(8, (stats.roubos + stats.tocos) * 2) + (jogo.missao && jogo.missao.cumpriu ? 5 : 0));
    const letra = pontos >= 85 ? "A" : pontos >= 73 ? "B" : pontos >= 61 ? "C" : pontos >= 48 ? "D" : "F";
    return { letra, pontos, texto: letra === "A" ? "Dominou o jogo" : letra === "B" ? "Atuação muito sólida" : letra === "C" ? "Cumpriu seu papel" : letra === "D" ? "Abaixo do esperado" : "Noite difícil" };
  }

  function aplicarConsequenciasDaForma(jogo) {
    if (!jogo || !jogo.stats) return null;
    const impacto = jogo.avaliacaoJogo ? jogo.avaliacaoJogo.pontos : 0;
    jogador.historicoForma = [...(jogador.historicoForma || []), impacto].slice(-5);
    const ultimosTres = jogador.historicoForma.slice(-3);
    if (ultimosTres.length === 3 && ultimosTres.every((nota) => nota < 56)) {
      jogador.penalidadeMinutos = limitar((jogador.penalidadeMinutos || 0) + 1, 0, 4);
      jogador.confiancaTecnico = limitar(jogador.confiancaTecnico - 4);
      if (jogador.penalidadeMinutos >= 2 && jogador.papel === "titular") jogador.papel = "sexto";
      sincronizarJogadorNoMundo();
      const texto = jogador.papel === "sexto" ? "Três atuações fracas custaram a titularidade; agora você lidera a segunda unidade." : "Três atuações fracas reduziram sua margem de minutos.";
      registrarConsequencia("FORMA", texto, { tecnico: -4 });
      jogador.ultimaConsequenciaForma = texto;
      return texto;
    }
    if (jogador.papel === "sexto" && ultimosTres.length === 3 && ultimosTres.every((nota) => nota >= 74)) {
      jogador.impulsoTitular = limitar((jogador.impulsoTitular || 0) + 4, 0, 14);
      jogador.confiancaTecnico = limitar(jogador.confiancaTecnico + 4);
      if (sugerirPapel(jogador) === "titular") jogador.papel = "titular";
      sincronizarJogadorNoMundo();
      const texto = jogador.papel === "titular" ? "Seu impacto como sexto homem garantiu a vaga de titular." : "Seu impacto como sexto homem abriu uma disputa real pela titularidade.";
      registrarConsequencia("FORMA", texto, { tecnico: 4, reputacao: 2 });
      jogador.ultimaConsequenciaForma = texto;
      return texto;
    }
    return null;
  }

  function criarMancheteDaPartida(jogo) {
    if (!jogo) return "";
    if (jogo.noiteHistorica) return `NOITE HISTÓRICA · ${jogo.noiteHistorica.titulo}`;
    if (jogo.rivalPessoal && jogador.rivalVivo) return jogo.venceu ? `${jogador.nome} vence o duelo contra ${jogador.rivalVivo.nome}` : `${jogador.rivalVivo.nome} leva o primeiro capítulo da rivalidade`;
    if (jogo.agravouLesao) return `${jogador.nome} agrava lesão após retorno antecipado`;
    if (jogo.fora) return `${jogador.nome} desfalca o time durante recuperação médica`;
    if (jogo.rivalidade) return jogo.venceu ? `${jogador.nome} decide rivalidade e incendeia a torcida` : `Rival leva a melhor e aumenta a pressão sobre ${jogador.nome}`;
    if (jogo.avaliacaoJogo && jogo.avaliacaoJogo.letra === "A") return `${jogador.nome} domina a noite e ganha força na rotação`;
    if (jogo.avaliacaoJogo && ["D", "F"].includes(jogo.avaliacaoJogo.letra)) return `Noite difícil reacende debate sobre os minutos de ${jogador.nome}`;
    return jogo.venceu ? `${jogador.time.nome} vence; ${jogador.nome} mantém a sequência` : `${jogador.time.nome} tropeça e busca resposta no próximo jogo`;
  }

  function momentoDaCampanha(jogos, pressao) {
    if (!jogos.length) return pressao >= 16 ? "Expectativa alta desde a estreia" : "A temporada começa agora";
    const ultimoResultado = jogos[jogos.length - 1].venceu;
    let sequencia = 0;
    for (let i = jogos.length - 1; i >= 0 && jogos[i].venceu === ultimoResultado; i--) sequencia++;
    const texto = `${sequencia} ${ultimoResultado ? sequencia === 1 ? "vitória seguida" : "vitórias seguidas" : sequencia === 1 ? "derrota seguida" : "derrotas seguidas"}`;
    return pressao >= 16 ? `${texto} · pressão alta` : texto;
  }

  function criarCorridaAoVivo(relatorio, contexto) {
    if (contexto !== "nba" || !jogador.time) return null;
    const equipes = [...TIMES].sort((a, b) => b.forca - a.forca).slice(0, 14);
    const candidato = (time, indice, categoria) => ({
      id: `${categoria}-${time.slug || indice}`,
      nome: (time.estrelas || time.elenco || ["Estrela da liga"])[0],
      time: time.nome,
      imagem: time.imagem,
      forca: time.forca,
      semente: indice + 1,
    });
    const mvp = equipes.map((time, indice) => candidato(time, indice, "mvp"));
    const dpoy = equipes.map((time, indice) => candidato(time, indice + 20, "dpoy"));
    const calourosDoDraft = (relatorio.draft || []).slice(0, 12).map((pick, indice) => ({
      id: `roy-${pick.id || indice}`,
      nome: pick.calouro,
      time: pick.time.nome,
      imagem: pick.time.imagem,
      forca: pick.time.forca,
      semente: indice + 40,
      overall: pick.overall,
    }));
    const calouros = calourosDoDraft.length ? calourosDoDraft : TIMES
      .map((time, indice) => {
        const jovem = (time.jogadores || []).filter((p) => p.idade <= 22).sort((a, b) => b.potencial - a.potencial)[0];
        return jovem ? { id: `roy-atual-${jovem.id}`, nome: jovem.nome, time: time.nome, imagem: time.imagem, forca: time.forca, semente: indice + 40, overall: jovem.overall } : null;
      })
      .filter(Boolean)
      .slice(0, 12);
    const voce = { id: "voce", nome: jogador.nome, time: jogador.time.nome, imagem: jogador.time.imagem, forca: jogador.time.forca, semente: 99, voce: true };
    mvp.push(voce);
    dpoy.push(voce);
    if ((jogador.temporadasNba || 0) === 0) calouros.push(voce);
    return { mvp, dpoy, roy: calouros };
  }

  function dadosParciaisDoJogador(s) {
    const jogos = s.relatorioTemporada.jogos.slice(0, s.indice).filter((j) => j.stats);
    const total = Math.max(1, jogos.length);
    const soma = (chave) => jogos.reduce((acumulado, jogo) => acumulado + (jogo.stats[chave] || 0), 0) / total;
    const campanha = s.relatorioTemporada.jogos.slice(0, s.indice);
    return {
      pontos: soma("pontos"), rebotes: soma("rebotes"), assistencias: soma("assistencias"), roubos: soma("roubos"), tocos: soma("tocos"),
      aproveitamento: campanha.length ? campanha.filter((j) => j.venceu).length / campanha.length : .5,
    };
  }

  function rankingPremioAoVivo(candidatos, categoria, s) {
    if (!candidatos || !candidatos.length) return [];
    const corridaReal = s.relatorioTemporada && s.relatorioTemporada.corridaPremios;
    if (corridaReal && corridaReal[categoria]) {
      return corridaReal[categoria].map((candidato) => ({ ...candidato, voce: candidato.nome === jogador.nome, pontos: candidato.impacto }));
    }
    const parcial = dadosParciaisDoJogador(s);
    const jogos = s.indice;
    return candidatos.map((candidato) => {
      let pontos;
      if (candidato.voce) {
        const impacto = categoria === "mvp"
          ? parcial.pontos + parcial.rebotes * 1.2 + parcial.assistencias * 1.5 + (parcial.roubos + parcial.tocos) * 3
          : categoria === "dpoy"
            ? (jogador.atual.defesa || 70) * .42 + parcial.rebotes * .65 + (parcial.roubos + parcial.tocos) * 10
            : parcial.pontos + parcial.rebotes + parcial.assistencias * 1.4;
        pontos = impacto * (categoria === "roy" ? 1.5 : 1.15) + parcial.aproveitamento * 26;
      } else {
        // Oscilação determinística: a corrida muda de jogo para jogo sem
        // consultar o ranking/vencedor final escondido no relatório.
        const forma = Math.sin((jogos + 1) * .71 + candidato.semente * 1.91) * 9 + Math.cos((jogos + 2) * .19 + candidato.semente) * 4;
        const campanha = Math.sin((jogos + 1) * .17 + candidato.semente) * 5;
        const base = categoria === "roy" ? (candidato.overall || 70) * 1.05 : candidato.forca * (categoria === "dpoy" ? .95 : 1.1);
        pontos = base + forma + campanha;
      }
      return { ...candidato, pontos: +pontos.toFixed(1) };
    }).sort((a, b) => b.pontos - a.pontos).slice(0, 5);
  }

  function jogarTemporadaEnxuta() {
    ultimoObjetivoTemporada = null;
    jogador.planoTemporada = { foco: null, papel: jogador.papel || "titular", estilo: "equilibrado" };
    jogador.objetivoTemporada = { ...objetivoSelecionado };
    prepararContextoDaTemporada();
    jogador.papel = sugerirPapel(jogador);
    sincronizarJogadorNoMundo();
    const contextoDaTemporada = jogador.contexto;
    if (contextoDaTemporada === "nba") iniciarAcompanhamentoRecordesDaTemporada();
    const relatorioTemporada = simularTemporadaCompleta(jogador);
    concluirTemporada(contextoDaTemporada, relatorioTemporada);
  }

  function iniciarTemporadaComAnimacao() {
    ultimoObjetivoTemporada = null;
    jogador.planoTemporada = { foco: null, papel: jogador.papel || "titular", estilo: "equilibrado" };
    jogador.objetivoTemporada = { ...objetivoSelecionado };
    prepararContextoDaTemporada();
    jogador.papel = sugerirPapel(jogador);
    sincronizarJogadorNoMundo();
    const contextoDaTemporada = jogador.contexto;
    if (contextoDaTemporada === "nba") iniciarAcompanhamentoRecordesDaTemporada();
    const relatorioTemporada = jogador.contexto === "nba" ? criarTemporadaProgressiva(jogador) : simularTemporadaCompleta(jogador);
    relatorioTemporada.anoTemporada = rotuloAnoTemporada();
    const jogoAJogo = planoSelecionado.simulacao === "jogo-a-jogo";
    const automatico = planoSelecionado.simulacao === "automatico";
    centralDuranteSimulacao = false;
    simulacaoEmAndamento = {
      contextoDaTemporada,
      relatorioTemporada,
      indice: 0,
      ultimoBloco: null,
      semAgencia: true,
      jogoAJogo,
      autoPassar: automatico,
      corridaAoVivo: criarCorridaAoVivo(relatorioTemporada, contextoDaTemporada),
    };
    prepararProximoJogo(simulacaoEmAndamento);
    salvarCarreiraLocal();
    render();
    if (automatico) agendarProximoResultado();
  }

  function agendarProximoResultado() {
    if (timerApresentacaoTemporada) clearTimeout(timerApresentacaoTemporada);
    if (!simulacaoEmAndamento || !simulacaoEmAndamento.autoPassar) return;
    timerApresentacaoTemporada = setTimeout(() => {
      avancarSimulacao();
      agendarProximoResultado();
    }, simulacaoEmAndamento.fase === "playoffs" ? 900 : 280);
  }

  function pausarSimulacaoAutomatica() {
    if (!simulacaoEmAndamento) return;
    simulacaoEmAndamento.autoPassar = false;
    if (timerApresentacaoTemporada) clearTimeout(timerApresentacaoTemporada);
    timerApresentacaoTemporada = null;
    salvarCarreiraLocal();
    render();
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
      if (contexto === "nba") iniciarAcompanhamentoRecordesDaTemporada();
      const relatorio = resolverTemporadaNoMotorUnico(jogador);
      relatorio.anoTemporada = rotuloAnoTemporada();
      // A simulação completa pula a tela partida a partida; registra aqui os
      // capítulos contra o rival para manter o retrospecto coerente.
      if (contexto === "nba") (relatorio.jogos || []).forEach(registrarConfrontoComRival);
      ultimoRelatorioTemporada = relatorio;
      ultimoRegistro = progredirTemporada(jogador, relatorio.desempenhoMedio);
      ultimoRegistro.anoTemporada = relatorio.anoTemporada;
      // A simulação até a aposentadoria precisa alimentar os mesmos totais
      // usados na tela de carreira normal; antes ela pulava esse acúmulo.
      acumularEstatisticasCarreira(relatorio, contexto === "nba");
      if (contexto === "nba") verificarRecordesNBA(relatorio);
      jogador.energia = Math.min(100, jogador.energia + 8);
      jogador.anoTemporadaAtual = (Number(jogador.anoTemporadaAtual) || ANO_INICIAL_CARREIRA) + 1;
      temporadasNoTimeAtual++;
      evoluirRivalVivo();

      if (contexto === "nba") {
        jogador.temporadasNba = (jogador.temporadasNba || 0) + 1;
        const individuais = avaliarPremiosIndividuais(jogador, relatorio);
        acumularPremios(jogador, individuais, `Temporada ${jogador.temporadasNba}`);
        aplicarConsequenciaDePapel(relatorio);
        movimentarJogadorNaSimulacaoCompleta(relatorio);
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

  function movimentarJogadorNaSimulacaoCompleta(relatorio) {
    if (!jogador.time || jogador.contexto !== "nba") return;
    const contratoCurto = !jogador.contrato || jogador.contrato.anosRestantes <= 1;
    const desempenhoFraco = relatorio.desempenhoMedio < 57 || (jogador.penalidadeMinutos || 0) >= 2;
    const chanceMercado = contratoCurto ? .38 : desempenhoFraco ? .24 : (jogador.interesseMercado || 0) >= 45 ? .22 : .08;
    if (Math.random() >= chanceMercado) return;
    const ofertas = calcularOfertasDeTroca();
    if (!ofertas.length) return;
    // Estrelas escolhem contexto competitivo; veteranos tendem a segurança.
    const oferta = [...ofertas].sort((a, b) => {
      const valorA = a.score + (jogador.idade >= 31 ? (a.anos || 0) * 4 : a.time.forca * .35);
      const valorB = b.score + (jogador.idade >= 31 ? (b.anos || 0) * 4 : b.time.forca * .35);
      return valorB - valorA;
    })[0];
    const antigo = jogador.time.nome;
    trocarTime(oferta.time, contratoCurto ? "Assinou na free agency durante a simulação" : "Foi trocado após mudança de contexto");
    jogador.contrato = { anosRestantes: oferta.anos || 2, salario: oferta.salario || Math.round(overallDe(jogador.atual) * .4), papelGarantido: sugerirPapel(jogador) };
    jogador.interesseMercado = Math.max(0, (jogador.interesseMercado || 0) - 18);
    registrarConsequencia("CARREIRA", `${antigo} → ${oferta.time.nome} durante a simulação de carreira`, { tecnico: -2, torcida: -2 });
    sincronizarJogadorNoMundo();
  }

  function registrarBoxScorePlayoff(serie, resultado, indice) {
    if (!serie) return null;
    serie.jogos = serie.jogos || [];
    if (serie.jogos[indice]) return serie.jogos[indice];
    const overall = ATRIBUTOS.reduce((soma, atributo) => soma + jogador.atual[atributo], 0) / ATRIBUTOS.length;
    const desempenho = Math.max(70, Math.min(100, 78 + Math.random() * 20 + (overall - 82) * 0.45));
    const noiteHistorica = sortearNoiteHistorica && aplicarNoiteHistorica && sortearNoiteHistorica(
      jogador,
      desempenho,
      Boolean(simulacaoEmAndamento.noiteHistoricaPlayoffRealizada)
    );
    if (noiteHistorica) simulacaoEmAndamento.noiteHistoricaPlayoffRealizada = true;
    const stats = estatisticasDoJogo(jogador, desempenho);
    if (noiteHistorica) aplicarNoiteHistorica(stats, noiteHistorica);
    Object.keys(stats).forEach((chave) => { stats[chave] = +stats[chave].toFixed(1); });
    const partida = {
      resultado,
      numero: indice + 1,
      adversario: serie.adversario,
      stats,
      noiteHistorica,
      playoff: true,
    };
    serie.jogos.push(partida);
    const recordes = verificarRecordesNBA({ jogos: [partida] }, ["playoff"]);
    if (recordes.length) {
      cerimoniasPremiosPendentes.push(...recordes.map((recorde) => ({
        titulo: `RECORDE NBA · PLAYOFFS · ${recorde.nome.toUpperCase()}`,
        descricao: `${jogador.nome} igualou ou superou a marca de ${recorde.detentor}: ${Math.round(recorde.valor).toLocaleString("pt-BR")}.`,
        imagem: "img/premios/mvp-da-temporada.png",
      })));
      simulacaoEmAndamento.autoPassar = false;
    }
    return partida;
  }

  function avancarSimulacao() {
    if (!simulacaoEmAndamento) return;
    if (simulacaoEmAndamento.momentoClutch) return;
    if (simulacaoEmAndamento.eventoNarrativo) return;
    if (simulacaoEmAndamento.fase === "playoffs") {
      const series = simulacaoEmAndamento.relatorioTemporada.playoffs.series || [];
      if (simulacaoEmAndamento.playoffIndice >= series.length) {
        concluirTemporada(simulacaoEmAndamento.contextoDaTemporada, simulacaoEmAndamento.relatorioTemporada);
        return;
      }
      if (simulacaoEmAndamento.jogoAJogo) {
        const serieAtual = series[simulacaoEmAndamento.playoffIndice];
        if (!simulacaoEmAndamento.playoffJogos) {
          simulacaoEmAndamento.playoffJogos = montarJogosDaSerie(serieAtual);
          simulacaoEmAndamento.playoffJogoIndice = 0;
        }
        if (simulacaoEmAndamento.playoffJogoIndice < simulacaoEmAndamento.playoffJogos.length) {
          registrarBoxScorePlayoff(serieAtual, simulacaoEmAndamento.playoffJogos[simulacaoEmAndamento.playoffJogoIndice], simulacaoEmAndamento.playoffJogoIndice);
          simulacaoEmAndamento.playoffJogoIndice++;
          salvarCarreiraLocal();
          render();
          return;
        }
        simulacaoEmAndamento.playoffIndice++;
        simulacaoEmAndamento.playoffJogos = null;
        simulacaoEmAndamento.playoffJogoIndice = 0;
        salvarCarreiraLocal();
        render();
        return;
      }
      const serie = series[simulacaoEmAndamento.playoffIndice];
      montarJogosDaSerie(serie).forEach((resultado, indice) => registrarBoxScorePlayoff(serie, resultado, indice));
      simulacaoEmAndamento.playoffIndice++;
      render();
      return;
    }
    const total = simulacaoEmAndamento.relatorioTemporada.jogos.length;
    if (simulacaoEmAndamento.indice >= total) {
      if (simulacaoEmAndamento.relatorioTemporada.progressiva && !simulacaoEmAndamento.relatorioTemporada.finalizada) {
        finalizarTemporadaProgressiva(jogador, simulacaoEmAndamento.relatorioTemporada);
        salvarCarreiraLocal();
      }
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
    let jogoAtual = simulacaoEmAndamento.relatorioTemporada.jogos[simulacaoEmAndamento.indice];
    if (!simulacaoEmAndamento.momentoClutch && jogoAtual && (jogoAtual.rivalidade || jogoAtual.pressao >= 14 || simulacaoEmAndamento.indice > 66) && Math.random() < .15) {
      const placarAdversario = 100 + Math.floor(Math.random() * 4);
      simulacaoEmAndamento.momentoClutch = { adversario: jogoAtual.adversario, segundos: 12 + Math.floor(Math.random() * 18), placarSeu: placarAdversario - (1 + Math.floor(Math.random() * 3)), placarAdversario };
      simulacaoEmAndamento.autoPassar = false;
      salvarCarreiraLocal(); render(); return;
    }
    if (simulacaoEmAndamento.relatorioTemporada.progressiva) {
      jogoAtual = resolverProximoJogoDaTemporada(
        jogador,
        simulacaoEmAndamento.relatorioTemporada,
        simulacaoEmAndamento.decisaoJogo || null
      );
    }
    if (simulacaoEmAndamento.jogoAJogo) {
      if (!simulacaoEmAndamento.relatorioTemporada.progressiva) aplicarPreparacaoDeJogo(simulacaoEmAndamento, jogoAtual);
      avaliarMissaoJogo(simulacaoEmAndamento, jogoAtual);
      jogoAtual.avaliacaoJogo = avaliarNotaDaPartida(jogoAtual);
      aplicarConsequenciasDaForma(jogoAtual);
      jogoAtual.manchete = criarMancheteDaPartida(jogoAtual);
      if (jogoAtual.clutchResultado) jogoAtual.narrativaClutch = narrarMomentoClutch(jogoAtual.clutchResultado, jogoAtual);
      simulacaoEmAndamento.missaoAtual = null;
      simulacaoEmAndamento.preparacaoSelecionada = null;
      simulacaoEmAndamento.decisaoJogo = null;
    }
    registrarConfrontoComRival(jogoAtual);
    // Recordes de jogo e de temporada são conferidos imediatamente depois do
    // box score. Assim a Central de Recordes acompanha a campanha em curso,
    // sem esperar o encerramento da temporada.
    if (jogoAtual && jogoAtual.stats && simulacaoEmAndamento.contextoDaTemporada === "nba") {
      const jogosAteAgora = simulacaoEmAndamento.relatorioTemporada.jogos
        .slice(0, simulacaoEmAndamento.indice + 1)
        .filter((partida) => partida && partida.stats);
      const recordesDaPartida = verificarRecordesNBA({ jogos: jogosAteAgora }, ["jogo", "temporada"]);
      if (recordesDaPartida.length) {
        cerimoniasPremiosPendentes.push(...recordesDaPartida.map((r) => ({
          titulo: `RECORDE NBA · ${r.nome.toUpperCase()}`,
          descricao: `${jogador.nome} igualou ou superou a marca de ${r.detentor}: ${Math.round(r.valor).toLocaleString("pt-BR")}.`,
          imagem: "img/premios/mvp-da-temporada.png",
        })));
        simulacaoEmAndamento.autoPassar = false;
      }
    }
    simulacaoEmAndamento.indice++;
    simulacaoEmAndamento.ultimoBloco = null;
    if (simulacaoEmAndamento.jogoAJogo) {
      avaliarDesafioCurto(simulacaoEmAndamento);
      prepararProximoJogo(simulacaoEmAndamento);
    }
    salvarCarreiraLocal();
    render();
    if (simulacaoEmAndamento.autoPassar && jogador.planoTemporada.simulacao === "automatico" && simulacaoEmAndamento.indice < total) {
      setTimeout(simularBlocoDaTemporada, 550);
    }
  }

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
    const fim = Math.min(total, s.indice + 10);
    s.ultimoBloco = { inicio: s.indice, fim };
    if (s.relatorioTemporada.progressiva) {
      while (s.indice < fim) {
        resolverProximoJogoDaTemporada(jogador, s.relatorioTemporada, null);
        s.indice++;
      }
    } else {
      s.indice = fim;
    }
    if (fim < total && !s.semAgencia) gerarEventoNarrativo(s);
    salvarCarreiraLocal();
    render();
  }

  function gerarEventoNarrativo(s) {
    if (s.eventoNarrativo || jogador.contexto !== "nba") return;
    s.eventosVistos = s.eventosVistos || [];
    const disponiveis = EVENTOS_NARRATIVOS.filter((e) => !s.eventosVistos.includes(e.id));
    if (!disponiveis.length) return;
    const ultimo = s.relatorioTemporada.jogos[s.indice - 1];
    const preferido = jogador.interesseMercado >= 35 ? "troca"
      : jogador.historicoForma && jogador.historicoForma.length >= 3 && jogador.historicoForma.slice(-3).every((nota) => nota < 56) ? "banco"
      : ultimo && ultimo.rivalidade && !ultimo.venceu ? "critica"
      : jogador.energia < 38 ? "lesao"
      : "patrocinio";
    const evento = disponiveis.find((e) => e.id === preferido) || disponiveis[Math.floor(Math.random() * disponiveis.length)];
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
    if (evento.id === "lesao") {
      jogador.lesaoAtiva = opcaoId === "recuperar"
        ? { jogosRestantes: 3, riscoRetorno: false, descricao: "recuperação recomendada" }
        : { jogosRestantes: 0, riscoRetorno: true, descricao: "retorno antecipado" };
      registrarConsequencia("SAÚDE", opcaoId === "recuperar" ? "Aceitou a recuperação médica e ficará fora por 3 jogos." : "Voltou antes da hora: risco real de agravamento nas próximas partidas.", { tecnico: e.tecnico || 0, reputacao: e.reputacao || 0 });
    }
    if (evento.id === "troca" && opcaoId === "alimentar") {
      jogador.apoioTorcida = limitar(jogador.apoioTorcida - 5);
      jogador.relacaoImprensa = limitar(jogador.relacaoImprensa + 8);
      registrarConsequencia("IMPRENSA", "Alimentou rumores de saída: mercado reagiu, torcida perdeu confiança.", { torcida: -5, reputacao: e.reputacao || 0 });
    }
    jogador.ultimoEventoNarrativo = { titulo: evento.titulo, escolha: opcao.label, efeitos: e };
    simulacaoEmAndamento.eventoNarrativo = null;
    salvarCarreiraLocal();
    render();
  }

  function concluirTemporada(contextoDaTemporada, relatorioTemporada) {
    if (timerApresentacaoTemporada) clearTimeout(timerApresentacaoTemporada);
    simulacaoEmAndamento = null;
    centralDuranteSimulacao = false;
    // Papel reavaliado a cada temporada, com base no encaixe atual do
    // jogador no elenco — afeta minutos (e portanto médias) e lesão.
    ultimoRelatorioTemporada = relatorioTemporada;
    ultimoRegistro = progredirTemporada(jogador, relatorioTemporada.desempenhoMedio);
    ultimoRegistro.anoTemporada = relatorioTemporada.anoTemporada || rotuloAnoTemporada();
    acumularEstatisticasCarreira(relatorioTemporada, contextoDaTemporada === "nba");
    const recordesNovos = contextoDaTemporada === "nba" ? verificarRecordesNBA(relatorioTemporada) : [];
    if (recordesNovos.length) cerimoniasPremiosPendentes.push(...recordesNovos.map((r) => ({ titulo:`RECORDE NBA · ${r.nome.toUpperCase()}`, descricao:`${jogador.nome} superou ${r.marca.toLocaleString("pt-BR")} de ${r.detentor}. Nova marca: ${Math.round(r.valor).toLocaleString("pt-BR")}.`, imagem:"img/premios/mvp-da-temporada.png" })));
    temporadasNoTimeAtual++;
    evoluirRivalVivo();
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
      if (ganhos.length) {
        ultimosPremiosIndividuais = ganhos;
        cerimoniasPremiosPendentes.push(...criarCerimoniasDePremios(ganhos));
      }
    }
    ultimoObjetivoTemporada = avaliarObjetivoTemporada(relatorioTemporada, individuais);
    const consequenciaPapel = aplicarConsequenciaDePapel(relatorioTemporada);
    if (consequenciaPapel) {
      ultimosPremiosIndividuais = [...(ultimosPremiosIndividuais || []), consequenciaPapel];
    }
    const contratoExpirou = contextoDaTemporada === "nba" ? atualizarContratoJogador() : false;
    jogador.anoTemporadaAtual = (Number(jogador.anoTemporadaAtual) || ANO_INICIAL_CARREIRA) + 1;
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

    const convocacao = contextoDaTemporada === "nba" ? criarConvocacaoDaSelecao(relatorioTemporada, contratoExpirou) : null;
    if (convocacao) {
      convocacaoSelecao = convocacao;
      eventoPendente = "convocacao-selecao";
    } else if (jogador.contexto === "gleague" && relatorioTemporada.desempenhoMedio >= LIMIAR_CALLUP) {
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

  function criarConvocacaoDaSelecao(relatorio, contratoExpirou) {
    const anoDoTorneio = Number(jogador.anoTemporadaAtual) || ANO_INICIAL_CARREIRA;
    const torneio = anoDoTorneio % 4 === 0 ? "Jogos Olímpicos" : anoDoTorneio % 4 === 3 ? "Copa do Mundo FIBA" : null;
    const historico = jogador.historicoSelecao || [];
    const jaFoiChamado = historico.some((registro) => registro.ano === anoDoTorneio);
    const impacto = ((relatorio.medias && relatorio.medias.pontos) || 0) + overallDe(jogador.atual) * .16 + jogador.reputacao * .12;
    if (!torneio || jaFoiChamado || impacto < 23 || Math.random() > Math.min(.92, .32 + impacto / 55)) return null;
    return { ano: anoDoTorneio, torneio, pais: jogador.nacionalidade || "Seleção Internacional", bandeira: jogador.bandeira || "🌍", contratoExpirou: !!contratoExpirou };
  }

  function responderConvocacao(aceitar) {
    if (!convocacaoSelecao) return;
    jogador.historicoSelecao = jogador.historicoSelecao || [];
    jogador.historicoSelecao.push({ ...convocacaoSelecao, status: aceitar ? "aceitou" : "recusou" });
    if (aceitar) {
      jogador.reputacao = limitar(jogador.reputacao + 5);
      jogador.apoioTorcida = limitar(jogador.apoioTorcida + 4);
      jogador.energia = limitar(jogador.energia - 4);
      registrarConsequencia("SELEÇÃO", `Aceitou defender ${convocacaoSelecao.pais} no ${convocacaoSelecao.torneio}.`, { reputacao: 5, torcida: 4, energia: -4 });
    } else {
      jogador.relacaoImprensa = limitar(jogador.relacaoImprensa - 3);
      registrarConsequencia("SELEÇÃO", `Recusou a convocação de ${convocacaoSelecao.pais}.`, { imprensa: -3 });
    }
    const renovar = convocacaoSelecao.contratoExpirou;
    if (aceitar) {
      torneioSelecao = criarTorneioDaSelecao({ ...convocacaoSelecao, contratoExpirou: renovar });
      convocacaoSelecao = null;
      eventoPendente = "selecao-em-andamento";
      salvarCarreiraLocal();
      render();
      return;
    }
    convocacaoSelecao = null;
    if (renovar) iniciarNegociacaoExtensao();
    else iniciarOffseason();
    salvarCarreiraLocal();
    render();
  }

  function criarTorneioDaSelecao(convocacao) {
    const selecoes = [
      { codigo: "US", pais: "Estados Unidos", bandeira: "🇺🇸", forca: 92 },
      { codigo: "CA", pais: "Canadá", bandeira: "🇨🇦", forca: 87 },
      { codigo: "FR", pais: "França", bandeira: "🇫🇷", forca: 86 },
      { codigo: "ES", pais: "Espanha", bandeira: "🇪🇸", forca: 83 },
      { codigo: "RS", pais: "Sérvia", bandeira: "🇷🇸", forca: 88 },
      { codigo: "AU", pais: "Austrália", bandeira: "🇦🇺", forca: 82 },
      { codigo: "DE", pais: "Alemanha", bandeira: "🇩🇪", forca: 84 },
      { codigo: "AR", pais: "Argentina", bandeira: "🇦🇷", forca: 79 },
      { codigo: "BR", pais: "Brasil", bandeira: "🇧🇷", forca: 78 },
    ].filter((selecao) => selecao.pais !== convocacao.pais).map((selecao) => ({ ...selecao, elenco: criarElencoSelecao(selecao) }));
    selecoes.forEach((selecao) => { selecao.forca = selecao.elenco.reduce((soma, atleta) => soma + atleta.overall, 0) / selecao.elenco.length; });
    const adversarios = selecoes.sort(() => Math.random() - .5).slice(0, 5);
    const selecaoDoJogador = { pais: convocacao.pais, bandeira: convocacao.bandeira, elenco: criarElencoSelecao(convocacao, true) };
    return {
      ...convocacao,
      adversarios,
      selecaoDoJogador,
      jogos: adversarios.slice(0, 3).map((adversario, indice) => ({ fase: `Grupo · rodada ${indice + 1}`, adversario })),
      indice: 0,
      vitorias: 0,
      derrotas: 0,
      encerrado: false,
      medalha: null,
    };
  }

  function criarElencoSelecao(selecao, incluirJogador = false) {
    const posicoes = ["PG", "SG", "SF", "PF", "C", "PG", "SG", "SF", "PF", "C", "SF", "PF"];
    const base = selecao.forca || 80;
    const elenco = posicoes.map((posicao, indice) => ({ nome: `${selecao.pais} ${indice + 1}`, posicao, overall: Math.round(base - 5 + Math.random() * 10) }));
    if (incluirJogador) elenco[0] = { nome: jogador.nome, posicao: jogador.posicao, overall: overallDe(jogador.atual), usuario: true };
    return elenco;
  }

  function avancarTorneioSelecao() {
    if (!torneioSelecao || torneioSelecao.encerrado) return;
    const jogo = torneioSelecao.jogos[torneioSelecao.indice];
    if (!jogo) return;
    const forcaJogador = overallDe(jogador.atual) + (jogador.reputacao || 0) * .08 + Math.random() * 13;
    const venceu = forcaJogador >= jogo.adversario.forca + Math.random() * 13;
    const pontosBrasil = Math.round(72 + forcaJogador * .42 + Math.random() * 13);
    const pontosAdversario = Math.max(60, pontosBrasil + (venceu ? -Math.round(3 + Math.random() * 12) : Math.round(3 + Math.random() * 12)));
    jogo.venceu = venceu;
    jogo.placar = venceu ? `${pontosBrasil}–${pontosAdversario}` : `${pontosBrasil}–${pontosAdversario}`;
    jogo.estatisticas = { pontos: Math.round(8 + overallDe(jogador.atual) * .17 + Math.random() * 9), rebotes: Math.round(2 + Math.random() * 7), assistencias: Math.round(2 + Math.random() * 6) };
    if (venceu) torneioSelecao.vitorias++; else torneioSelecao.derrotas++;
    jogador.estatisticasSelecao = jogador.estatisticasSelecao || { jogos: 0, vitorias: 0, derrotas: 0, pontos: 0, rebotes: 0, assistencias: 0, ouro: 0, prata: 0, bronze: 0 };
    const e = jogador.estatisticasSelecao;
    e.jogos++; e.pontos += jogo.estatisticas.pontos; e.rebotes += jogo.estatisticas.rebotes; e.assistencias += jogo.estatisticas.assistencias;
    if (venceu) e.vitorias++; else e.derrotas++;
    torneioSelecao.indice++;

    if (torneioSelecao.indice === 3) {
      if (torneioSelecao.vitorias >= 2) torneioSelecao.jogos.push({ fase: "Semifinal", adversario: torneioSelecao.adversarios[3] });
      else finalizarTorneioSelecao(null);
    } else if (jogo.fase === "Semifinal") {
      torneioSelecao.jogos.push({ fase: venceu ? "Final" : "Disputa de bronze", adversario: torneioSelecao.adversarios[4] });
    } else if (jogo.fase === "Final") {
      finalizarTorneioSelecao(venceu ? "ouro" : "prata");
    } else if (jogo.fase === "Disputa de bronze") {
      finalizarTorneioSelecao(venceu ? "bronze" : null);
    }
    salvarCarreiraLocal();
    render();
  }

  function finalizarTorneioSelecao(medalha) {
    torneioSelecao.encerrado = true;
    torneioSelecao.medalha = medalha;
    if (medalha) jogador.estatisticasSelecao[medalha]++;
    jogador.historicoSelecao[jogador.historicoSelecao.length - 1].resultado = medalha || "sem medalha";
  }

  function encerrarCampanhaSelecao() {
    const renovar = torneioSelecao && torneioSelecao.contratoExpirou;
    torneioSelecao = null;
    if (renovar) iniciarNegociacaoExtensao(); else iniciarOffseason();
    salvarCarreiraLocal();
    render();
  }

  function criarCerimoniasDePremios(ganhos) {
    const premios = {
      "Anel de campeão": { titulo: "CAMPEÃO NBA", descricao: "Você conquistou o título da NBA.", imagem: "img/premios/campeao-nba.png" },
      "MVP das Finais": { titulo: "MVP DAS FINAIS", descricao: "Você foi o nome mais valioso da decisão.", imagem: "img/premios/mvp-das-finais.png" },
      MVP: { titulo: "MVP DA TEMPORADA", descricao: "A liga reconheceu você como seu jogador mais valioso.", imagem: "img/premios/mvp-da-temporada.png" },
      DPOY: { titulo: "DEFENSOR DO ANO", descricao: "Sua defesa foi a mais impactante da liga.", imagem: "img/premios/dpoy.png" },
      "Novato do Ano": { titulo: "NOVATO DO ANO", descricao: "Sua estreia foi a melhor entre todos os rookies.", imagem: "img/premios/rookie-do-ano.png" },
      "All-Star": { titulo: "ALL-STAR", descricao: "Você foi selecionado para o Jogo das Estrelas.", imagem: "img/premios/all-star.png" },
    };
    return ganhos.map((ganho) => premios[ganho]).filter(Boolean);
  }

  function acumularEstatisticasCarreira(relatorio, contabilizarNBA) {
    const ec = jogador.estatisticasCarreira;
    const destinos = [ec];
    if (contabilizarNBA) {
      jogador.estatisticasNba = jogador.estatisticasNba || { ...ec, jogos: 0 };
      destinos.push(jogador.estatisticasNba);
    }
    const jogos = relatorio.jogosJogados || 82;
    destinos.forEach((destino) => {
      destino.jogos += jogos;
      ["pontos", "rebotes", "assistencias", "roubos", "tocos", "arremessosConvertidos", "arremessosTentados", "tresConvertidas", "tresTentadas", "lancesLivresConvertidos", "lancesLivresTentados", "turnovers", "minutos"].forEach((chave) => {
        destino[chave] = +(destino[chave] + (relatorio.medias[chave] || 0) * jogos).toFixed(1);
      });
    });
    (relatorio.jogos || []).filter((partida) => partida.stats).forEach((partida) => {
      const valores = [partida.stats.pontos, partida.stats.rebotes, partida.stats.assistencias, partida.stats.roubos, partida.stats.tocos];
      const duplos = valores.filter((valor) => valor >= 10).length;
      destinos.forEach((destino) => {
        if (duplos >= 2) destino.doubleDoubles++;
        if (duplos >= 3) destino.tripleDoubles++;
      });
    });
  }

  function valorDoRecorde(recorde, relatorio) {
    if (recorde.escopo === "carreira") return (jogador.estatisticasNba || jogador.estatisticasCarreira)[recorde.campo] || 0;
    const jogos = (relatorio && relatorio.jogos) || [];
    if (recorde.escopo === "temporada") return jogos.reduce((soma, partida) => soma + ((partida.stats && partida.stats[recorde.campo]) || 0), 0);
    if (recorde.escopo === "jogo") return jogos.reduce((maior, partida) => Math.max(maior, (partida.stats && partida.stats[recorde.campo]) || 0), 0);
    if (recorde.escopo === "playoff") return jogos.reduce((maior, partida) => Math.max(maior, (partida.stats && partida.stats[recorde.campo]) || 0), 0);
    return 0;
  }

  function verificarRecordesNBA(relatorio, escopos) {
    jogador.recordesQuebrados = jogador.recordesQuebrados || [];
    jogador.melhoresMarcasNBA = jogador.melhoresMarcasNBA || {};
    jogador.recordesTemporadaAtualNBA = jogador.recordesTemporadaAtualNBA || {};
    const novos = [];
    RECORDES_NBA.forEach((recorde) => {
      if (escopos && !escopos.includes(recorde.escopo)) return;
      const valor = valorDoRecorde(recorde, relatorio);
      if (valor === null) return;
      if (recorde.escopo === "temporada") jogador.recordesTemporadaAtualNBA[recorde.id] = valor;
      jogador.melhoresMarcasNBA[recorde.id] = Math.max(jogador.melhoresMarcasNBA[recorde.id] || 0, valor);
      if (valor >= recorde.marca && !jogador.recordesQuebrados.includes(recorde.id)) {
        jogador.recordesQuebrados.push(recorde.id);
        novos.push({ ...recorde, valor });
      }
    });
    return novos;
  }

  function iniciarAcompanhamentoRecordesDaTemporada() {
    jogador.recordesTemporadaAtualNBA = {};
    jogador.anoRecordesNba = rotuloAnoTemporada();
  }

  function renderGaleriaRecordesNBA() {
    const melhores = jogador.melhoresMarcasNBA || {};
    const grupos = [...new Set(RECORDES_NBA.map((r) => r.categoria))];
    return `<details class="galeria-recordes"><summary>Livro de recordes da NBA</summary><p class="nota-recordes">Compare sua melhor marca com os recordes oficiais, incluindo partidas de playoffs.</p><div>${grupos.map((categoria) => `<section><h3>${categoria}</h3>${RECORDES_NBA.filter((r) => r.categoria === categoria).map((r) => { const atual=Math.round(melhores[r.id] || 0); const bateu=jogador.recordesQuebrados && jogador.recordesQuebrados.includes(r.id); return `<article class="${bateu ? "quebrado" : ""}"><b>${r.nome}</b><span>${r.detentor} · ${r.marca.toLocaleString("pt-BR")}</span><strong>Sua melhor marca: ${atual.toLocaleString("pt-BR")} ${bateu ? "· RECORDE QUEBRADO" : `· faltam ${Math.max(0,r.marca-atual).toLocaleString("pt-BR")}`}</strong></article>`; }).join("")}</section>`).join("")}</div></details>`;
  }

  function renderCentralRecordesNBA() {
    const melhores = jogador.melhoresMarcasNBA || {};
    const nestaTemporada = jogador.recordesTemporadaAtualNBA || {};
    const quebrados = jogador.recordesQuebrados || [];
    const ativos = RECORDES_NBA.filter((recorde) => !recorde.emBreve);
    const conquistados = ativos.filter((recorde) => quebrados.includes(recorde.id)).length;
    const grupos = [...new Set(RECORDES_NBA.map((recorde) => recorde.categoria))];
    const card = (recorde) => {
      const melhorMarca = Math.round(melhores[recorde.id] || 0);
      const marcaDaTemporada = Math.round(nestaTemporada[recorde.id] || 0);
      // A vitrine sempre preserva a melhor temporada da carreira. O recorte
      // anual serve apenas como acompanhamento e nunca substitui essa marca.
      const atual = melhorMarca;
      const bateu = quebrados.includes(recorde.id);
      const bateuNestaCampanha = bateu && (recorde.escopo !== "temporada" || marcaDaTemporada >= recorde.marca);
      const percentual = Math.min(100, Math.round((atual / recorde.marca) * 100));
      return `
        <article class="central-recorde${bateuNestaCampanha ? " quebrado" : ""}">
          <span class="central-recorde-status">${bateuNestaCampanha ? "RECORDE QUEBRADO" : bateu && recorde.escopo === "temporada" ? "RECORDE HISTÓRICO" : `${percentual}% DA MARCA`}</span>
          <b>${recorde.nome}</b><small>${recorde.detentor} · ${recorde.marca.toLocaleString("pt-BR")}</small>
          <div class="central-recorde-barra" aria-label="${percentual}% do recorde"><i style="width:${percentual}%"></i></div>
          <strong>${atual.toLocaleString("pt-BR")} <em>${bateuNestaCampanha ? "nova marca" : `faltam ${Math.max(0, recorde.marca - atual).toLocaleString("pt-BR")}`}</em></strong>
          ${recorde.escopo === "temporada" ? `<small class="central-recorde-melhor">nesta temporada: ${marcaDaTemporada.toLocaleString("pt-BR")}</small>` : ""}
        </article>`;
    };
    return `
      <section class="central-recordes">
        <header><div><span>LIVRO OFICIAL · ${jogador.anoRecordesNba || rotuloAnoTemporada()}</span><h2>Central de recordes NBA</h2><p>A marca principal preserva sempre a melhor temporada. O número secundário acompanha a campanha atual sem acumular anos.</p></div><strong>${conquistados}<small>/${ativos.length} conquistados</small></strong></header>
        <div class="central-recordes-grupos">${grupos.map((categoria) => `<section><h3>${categoria}</h3><div>${RECORDES_NBA.filter((recorde) => recorde.categoria === categoria).map(card).join("")}</div></section>`).join("")}</div>
      </section>`;
  }

  function exibirCerimoniaPendente() {
    const premio = cerimoniasPremiosPendentes[0];
    if (!premio) return;
    elPro.insertAdjacentHTML("beforeend", `
      <div class="overlay-premio" role="dialog" aria-modal="true" aria-labelledby="titulo-cerimonia-premio">
        <section class="cerimonia-premio">
          <span class="cerimonia-legenda">TEMPO DE CELEBRAR</span>
          <img src="${premio.imagem}" alt="Troféu: ${premio.titulo}" class="cerimonia-trofeu">
          <h2 id="titulo-cerimonia-premio">${premio.titulo}</h2>
          <p>${premio.descricao}</p>
          <small>${cerimoniasPremiosPendentes.length > 1 ? `${cerimoniasPremiosPendentes.length} conquistas para revelar` : "Temporada registrada na sua carreira"}</small>
          <button type="button" class="acao" id="btn-continuar-cerimonia">${cerimoniasPremiosPendentes.length > 1 ? "Ver próxima conquista" : "Continuar"}</button>
        </section>
      </div>`);
    const continuar = document.getElementById("btn-continuar-cerimonia");
    if (continuar) continuar.addEventListener("click", () => {
      cerimoniasPremiosPendentes.shift();
      salvarCarreiraLocal();
      render();
    });
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
      jogador.relacaoImprensa = limitar(jogador.relacaoImprensa + 12);
      jogador.pressao = limitar(jogador.pressao + 6, 0, 30);
      offseason.pediuTroca = true;
      registrarConsequencia("MERCADO", "Pediu troca publicamente; imprensa amplificou a saída e o mercado reagiu.", { tecnico: -8, torcida: -7 });
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
    if (freeAgency) jogador.contrato = { anosRestantes: oferta.anos || 2, papelGarantido: sugerirPapel(jogador), salario: oferta.salario || jogador.contrato.salario };
    sincronizarJogadorNoMundo();
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
        <span class="lenda-posicao">${nomeContexto(jogador.contexto)} — ${rotuloAnoTemporada()} · ${jogador.idade} anos</span>
        <h2 class="lenda-nome">${jogador.nome}</h2>
        <p class="meta-linha">${jogador.bandeira || "🌍"} ${jogador.nacionalidade || "Internacional"} · #${jogador.numeroCamisa ?? 0} · ${jogador.posicao} · ${jogador.altura}cm · ${jogador.peso}kg</p>
      `;
    }

    return `
      <div class="uni-carreira-topo">
        <img class="uni-logo-grande" src="${time.imagem}" alt="${time.nome}" />
        <div class="uni-carreira-info">
          <span class="lenda-posicao">${nomeContexto(jogador.contexto)} · ${time.conferencia || ""} — ${rotuloAnoTemporada()} · ${jogador.idade} anos</span>
          <h2 class="lenda-nome">${jogador.nome}</h2>
          <p class="meta-linha uni-carreira-meta">${time.nome} · ${jogador.bandeira || "🌍"} ${jogador.nacionalidade || "Internacional"} · #${jogador.numeroCamisa ?? 0} · ${jogador.posicao} · ${jogador.altura}cm · ${jogador.peso}kg</p>
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
        <div><span>IMPRENSA / MERCADO</span><strong class="${(jogador.interesseMercado || 0) >= 40 ? "negativo" : "positivo"}">imprensa ${jogador.relacaoImprensa || 50}/100 · mercado ${jogador.interesseMercado || 0}/100</strong></div>
        ${jogador.lesaoAtiva ? `<div><span>STATUS MÉDICO</span><strong class="negativo">${jogador.lesaoAtiva.jogosRestantes ? `${jogador.lesaoAtiva.jogosRestantes} jogo(s) de recuperação` : "retorno antecipado sob risco"}</strong></div>` : ""}
        <div><span>CONTRATO</span><strong>${jogador.contrato ? `${jogador.contrato.anosRestantes} ano(s) · $${jogador.contrato.salario || "—"}M · ${infoPapel(jogador.contrato.papelGarantido).label}` : "sem contrato"}</strong></div>
        <div><span>CAP DO TIME</span><strong class="${time.espacoCap >= 0 ? "positivo" : "negativo"}">folha $${time.folhaSalarial || 0}M · ${time.espacoCap >= 0 ? `$${time.espacoCap}M livres` : `$${Math.abs(time.espacoCap)}M acima`}</strong></div>
        ${jogador.rivalVivo ? `<div><span>RIVAL PESSOAL</span><strong>${jogador.rivalVivo.nome} · ${jogador.rivalVivo.timeNome} · OVR ${jogador.rivalVivo.overall} · você ${jogador.rivalVivo.confrontos.vitorias}-${jogador.rivalVivo.confrontos.derrotas}</strong></div>` : ""}
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
        <div class="elenco-cabecalho"><img class="mini-logo" src="${time.imagem}" alt="" /><strong>${time.nome}</strong><span>POS · OVR · MIN · IDADE</span></div>
        ${(time.jogadores || []).map((p) => `<div class="elenco-linha${p.usuario ? " usuario" : ""}"><span>${p.nome}${p.usuario ? " · você" : p.calouro ? " · calouro" : ""}</span><strong>${p.posicao || "—"} · ${Math.round(p.overall)} · ${Math.round(p.minutos || 0)} min · ${p.idade}${p.contrato ? ` · ${p.contrato.anosRestantes}a` : ""}</strong></div>`).join("")}
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
      ["recordes", "Recordes"],
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
    if (paginaAtiva === "recordes") {
      return `<section class="pagina-carreira">${jogador.contexto === "nba" ? renderCentralRecordesNBA() : '<div class="pagina-vazia">A Central de Recordes será liberada quando você chegar à NBA.</div>'}</section>`;
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

  function renderCentralDuranteSimulacao() {
    const r = simulacaoEmAndamento.relatorioTemporada;
    const abas = [["resumo", "Resumo"], ["agenda", "Agenda"], ["rotacao", "Rotação"], ["metas", "Metas"], ["noticias", "Notícias"], ...(jogador.rivalVivo ? [["rival", "Rival"]] : [])];
    const navega = `<nav class="nav-central" aria-label="Central da temporada">${abas.map(([id, nome]) => `<button type="button" class="nav-central-item${abaCentralTemporada === id ? " ativo" : ""}" data-aba-central="${id}">${nome}</button>`).join("")}</nav>`;
    const proximos = r.jogos.slice(simulacaoEmAndamento.indice, simulacaoEmAndamento.indice + 5);
    const ledger = r.ledger;
    const registro = (time) => ledger && ledger.equipes[time.nome];
    const forma = (time) => { const linha = registro(time); return linha ? `${linha.vitorias}-${linha.derrotas} · ${linha.forma.join("") || "—"}` : "—"; };
    const concorrentes = (jogador.time.jogadores || []).filter((p) => !p.usuario && (p.posicao === jogador.posicao || (p.posicao === "G" && ["PG", "SG"].includes(jogador.posicao)) || (p.posicao === "F" && ["SF", "PF"].includes(jogador.posicao)))).sort((a,b) => b.overall-a.overall);
    const alertas = [
      jogador.penalidadeMinutos >= 2 && "Rotação em risco: outra sequência ruim pode reduzir seu papel.",
      jogador.papel === "sexto" && jogador.impulsoTitular >= 6 && "Promoção próxima: seu impacto como sexto homem está pressionando pela titularidade.",
      jogador.lesaoAtiva && (jogador.lesaoAtiva.jogosRestantes ? `${jogador.lesaoAtiva.jogosRestantes} jogo(s) de recuperação médica restantes.` : "Retorno antecipado: risco médico ativo."),
      jogador.pressao >= 15 && "Pressão alta: torcida e imprensa esperam resposta imediata.",
      jogador.contrato && jogador.contrato.anosRestantes <= 1 && "Contrato em ano decisivo: desempenho influencia a próxima oferta.",
    ].filter(Boolean);
    const noticias = r.jogos.filter((j) => j.resolvido).slice(-8).reverse().map((j) => j.manchete || (j.rivalidade ? `${j.venceu ? "Vitória" : "Derrota"} em rivalidade contra ${j.adversario.nome}` : `${jogador.time.nome} ${j.venceu ? "vence" : "perde para"} ${j.adversario.nome}`));
    const rival = jogador.rivalVivo;
    const jogosRival = rival ? r.jogos.filter((j) => j.resolvido && j.rivalPessoal) : [];
    const pontosRival = rival ? +(13 + (rival.overall - 70) * .52 + Math.min(5, (rival.temporadas || 0) * .35)).toFixed(1) : 0;
    const rivalNoticias = rival ? [
      `${rival.nome} mantém ${pontosRival} PPG e OVR ${rival.overall} por ${rival.timeNome}.`,
      jogosRival.length ? `${jogador.nome} está ${rival.confrontos.vitorias}-${rival.confrontos.derrotas} no duelo direto nesta carreira.` : `A imprensa espera o primeiro capítulo entre ${jogador.nome} e ${rival.nome}.`,
      rival.overall >= 88 ? `${rival.nome} entrou no radar do All-Star; cada encontro terá ainda mais pressão.` : `${rival.nome} trabalha para subir de patamar e transformar a rivalidade em disputa nacional.`,
    ] : [];
    const conteudo = abaCentralTemporada === "agenda"
      ? `<section class="central-pagina"><h2>Próximos 5 adversários</h2><div class="lista-central">${proximos.map((j, i) => `<div class="linha-central"><b>${i + 1}</b><span>${j.mes} · ${j.rivalidade ? "RIVALIDADE · " : ""}${j.adversario.nome}</span><small>${forma(j.adversario)} · ameaça: ${(j.adversario.estrelas || ["estrela rival"])[0]}</small></div>`).join("") || "<p>Calendário concluído.</p>"}</div></section>`
      : abaCentralTemporada === "rotacao"
        ? `<section class="central-pagina"><h2>Disputa na posição ${jogador.posicao}</h2><div class="lista-central"><div class="linha-central voce"><b>VOCÊ</b><span>${jogador.nome}</span><small>${jogador.papel} · ${jogador.time.jogadores.find((p) => p.usuario)?.minutos || 0} min · confiança ${jogador.confiancaTecnico}</small></div>${concorrentes.map((p, i) => `<div class="linha-central"><b>#${i + 1}</b><span>${p.nome}</span><small>${p.posicao} · OVR ${Math.round(p.overall)} · ${p.minutos} min</small></div>`).join("")}</div></section>`
        : abaCentralTemporada === "metas"
          ? `<section class="central-pagina"><h2>Meta dos próximos 5 jogos</h2><p>Escolha uma direção; a meta passa a ser acompanhada na próxima sequência.</p><div class="metas-curtas">${[["vitorias", "Vencer 3 de 5", "Campanha e confiança"], ["pontos", "16 PPG", "Volume ofensivo"], ["defesa", "8 ações defensivas", "Defesa e rotação"]].map(([id,t,d]) => `<button class="plano-opcao${simulacaoEmAndamento.desafioCurto && simulacaoEmAndamento.desafioCurto.tipo === id ? " ativo" : ""}" data-meta-curta="${id}"><b>${t}</b><small>${d}</small></button>`).join("")}</div></section>`
          : abaCentralTemporada === "noticias"
            ? `<section class="central-pagina"><h2>Notícias da liga</h2><div class="lista-central">${noticias.map((n, i) => `<div class="linha-central"><b>${i + 1}</b><span>${n}</span></div>`).join("") || "<p>As manchetes começam após a primeira partida.</p>"}</div></section>`
            : abaCentralTemporada === "rival" && rival
              ? `<section class="central-pagina rival-central"><h2>Você × ${rival.nome}</h2><div class="rival-comparacao"><article><span>VOCÊ</span><b>${r.medias.pontos || 0}</b><small>PPG · OVR ${Math.round(overallDe(jogador.atual))}</small></article><strong>${rival.confrontos.vitorias}-${rival.confrontos.derrotas}</strong><article><span>${rival.nome}</span><b>${pontosRival}</b><small>PPG · OVR ${rival.overall}</small></article></div><p>${rival.timeNome} · potencial ${rival.potencial} · ${jogosRival.length} encontro(s) nesta temporada.</p><div class="lista-central">${rivalNoticias.map((n, i) => `<div class="linha-central"><b>NBA</b><span>${n}</span><small>boletim da rivalidade #${i + 1}</small></div>`).join("")}</div></section>`
            : `<section class="central-pagina"><h2>Status da temporada</h2>${renderGestaoTemporada(r)}${alertas.length ? `<div class="alertas-central"><h3>Alertas</h3>${alertas.map((a) => `<p>${a}</p>`).join("")}</div>` : ""}</section>`;
    return `<div class="carta-lenda central-em-andamento">
      ${renderCabecalhoPro()}
      <p class="manchete-temporada">${r.anoTemporada || rotuloAnoTemporada()} · temporada em andamento · ${r.vitorias}-${r.derrotas} · ${r.jogosJogados || 0}/82 jogos disputados.</p>
      ${navega}${conteudo}
      <div class="acoes-stack"><button class="acao" id="btn-voltar-simulacao">Voltar ao próximo jogo</button></div>
    </div>`;
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
      const estatisticas = jogador.estatisticasCarreira || {};
      const jogosCarreira = Math.max(1, estatisticas.jogos || 0);
      const mediasCarreira = [["PTS", estatisticas.pontos], ["REB", estatisticas.rebotes], ["AST", estatisticas.assistencias], ["STL", estatisticas.roubos], ["BLK", estatisticas.tocos]]
        .map(([nome, total]) => [nome, total ? (total / jogosCarreira).toFixed(1) : "0.0", Math.round(total || 0)]);
      const titulos = [
        ["NBA", "Campeão NBA", p.aneis || 0, "img/premios/campeao-nba.png"],
        ["ROY", "Novato do Ano", p.roy || 0, "img/premios/rookie-do-ano.png"],
        ["MVP", "MVP da Temporada", p.mvp || 0, "img/premios/mvp-da-temporada.png"],
        ["FMVP", "MVP das Finais", p.finaisMvp || 0, "img/premios/mvp-das-finais.png"],
        ["DPOY", "Defensor do Ano", p.dpoy || 0, "img/premios/dpoy.png"],
        ["ASG", "All-Star", p.allStar || 0, "img/premios/all-star.png"]
      ];

      elPro.innerHTML = `
        <div class="carta-lenda tela-final${r.veredito.id === "fenomeno" ? " carta-fenomeno" : ""}">
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

          <section class="estatisticas-finais"><h3>Números da carreira</h3><div>${mediasCarreira.map(([nome, media, total]) => `<article><b>${media}</b><span>${nome}</span><small>${total} total</small></article>`).join("")}</div></section>
          ${jogador.rivalVivo ? `<section class="estatisticas-finais"><h3>Você × ${jogador.rivalVivo.nome}</h3><div><article><b>${jogador.rivalVivo.confrontos?.vitorias || 0}–${jogador.rivalVivo.confrontos?.derrotas || 0}</b><span>RETROSPECTO DIRETO</span><small>${jogador.rivalVivo.timeNome} · rival OVR ${jogador.rivalVivo.overall}</small></article></div></section>` : ""}
          <section class="vitrine-titulos"><h3>Vitrine de títulos</h3><div>${titulos.map(([sigla, nome, qtd, imagem]) => `<article class="trofeu${qtd ? " conquistado" : ""}">${imagem ? `<img class="trofeu-imagem" src="${imagem}" alt="${nome}">` : `<span class="trofeu-icone" role="img" aria-label="${nome}">🛡️</span>`}<div><b>${sigla}</b><span>${nome}</span></div><strong>${qtd}</strong></article>`).join("")}</div></section>
          <details class="carreira-detalhes"><summary>Ver recordes, prêmios e trajetória</summary>
          ${renderGaleriaRecordesNBA()}

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

          </details>
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
      exibirCerimoniaPendente();
      return;
    }

    // A forma de acompanhar a carreira é uma escolha de entrada, não mais
    // uma configuração perdida dentro do painel da temporada.
    if (!jogador.modoJogo) {
      elPro.classList.remove("modo-simulacao");
      elPro.innerHTML = renderEscolhaModoJogo();
      document.querySelectorAll("[data-modo-jogo-inicial]").forEach((btn) => {
        btn.addEventListener("click", () => selecionarModoJogo(btn.dataset.modoJogoInicial));
      });
      return;
    }

    if (simulacaoEmAndamento) {
      elPro.classList.add("modo-simulacao");
      elPro.innerHTML = `${erroSave ? `<p class="aviso-save">${erroSave}</p>` : ""}${centralDuranteSimulacao ? renderCentralDuranteSimulacao() : renderSimulacao()}`;
      const voltarSimulacao = document.getElementById("btn-voltar-simulacao");
      if (voltarSimulacao) voltarSimulacao.addEventListener("click", () => { centralDuranteSimulacao = false; render(); });
      document.querySelectorAll("[data-aba-central]").forEach((btn) => btn.addEventListener("click", () => { abaCentralTemporada = btn.dataset.abaCentral; render(); }));
      document.querySelectorAll("[data-meta-curta]").forEach((btn) => btn.addEventListener("click", () => {
        const inicio = simulacaoEmAndamento.indice;
        const fim = Math.min(simulacaoEmAndamento.relatorioTemporada.jogos.length, inicio + 5);
        const tipo = btn.dataset.metaCurta;
        simulacaoEmAndamento.desafioCurto = tipo === "defesa"
          ? { inicio, fim, tipo, alvo: 8, titulo: "Proteja a quadra", descricao: "Some roubos e tocos nos próximos 5 jogos.", recompensa: "+2 confiança · +2 reputação" }
          : tipo === "pontos"
            ? { inicio, fim, tipo, alvo: 16, titulo: "Impacto ofensivo", descricao: "Mantenha 16 PPG nos próximos 5 jogos.", recompensa: "+3 reputação · +2 confiança" }
            : { inicio, fim, tipo, alvo: Math.min(3, fim - inicio), titulo: "Sequência vencedora", descricao: "Vença 3 dos próximos 5 jogos.", recompensa: "+2 reputação · +3 confiança" };
        salvarCarreiraLocal(); render();
      }));
      const abrirCentral = document.getElementById("btn-ver-central-temporada");
      if (abrirCentral) abrirCentral.addEventListener("click", () => { pausarSimulacaoAutomatica(); centralDuranteSimulacao = true; render(); });
      const pausar = document.getElementById("btn-pausar-simulacao");
      if (pausar) pausar.addEventListener("click", pausarSimulacaoAutomatica);
      const proximo = document.getElementById("btn-proximo-jogo");
      if (proximo) proximo.addEventListener("click", avancarSimulacao);
      const continuarCenaRival = document.getElementById("btn-continuar-cena-rival");
      if (continuarCenaRival) continuarCenaRival.addEventListener("click", () => {
        const s = simulacaoEmAndamento;
        s.cenasRivalVistas = { ...(s.cenasRivalVistas || {}), [s.indice]: true };
        s.cenaRival = null;
        salvarCarreiraLocal(); render();
      });
      const bloco = document.getElementById("btn-simular-bloco");
      if (bloco) bloco.addEventListener("click", simularBlocoDaTemporada);
      document.querySelectorAll("[data-preparacao-jogo]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!simulacaoEmAndamento || !simulacaoEmAndamento.jogoAJogo) return;
          simulacaoEmAndamento.preparacaoSelecionada = btn.dataset.preparacaoJogo;
          simulacaoEmAndamento.decisaoJogo = { ...(simulacaoEmAndamento.decisaoJogo || {}), preparacao: btn.dataset.preparacaoJogo };
          salvarCarreiraLocal();
          render();
        });
      });
      document.querySelectorAll("[data-decisao-jogo]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!simulacaoEmAndamento || !simulacaoEmAndamento.jogoAJogo) return;
          const campo = btn.dataset.decisaoJogo;
          simulacaoEmAndamento.decisaoJogo = { ...(simulacaoEmAndamento.decisaoJogo || {}), [campo]: btn.dataset.valorDecisao };
          salvarCarreiraLocal();
          render();
        });
      });
      document.querySelectorAll("[data-decisao-evento]").forEach((btn) => {
        btn.addEventListener("click", () => resolverEventoNarrativo(btn.dataset.decisaoEvento));
      });
      document.querySelectorAll("[data-clutch]").forEach((btn) => btn.addEventListener("click", () => {
        simulacaoEmAndamento.decisaoJogo = { ...(simulacaoEmAndamento.decisaoJogo || {}), clutch: btn.dataset.clutch, clutchInfo: simulacaoEmAndamento.momentoClutch };
        simulacaoEmAndamento.momentoClutch = null;
        avancarSimulacao();
      }));
      exibirCerimoniaPendente();
      return;
    }

    elPro.classList.remove("modo-simulacao");

    elPro.innerHTML = `
      <div class="carta-lenda">
        ${renderCabecalhoPro()}
        ${erroSave ? `<p class="aviso-save">${erroSave}</p>` : ""}
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
    exibirCerimoniaPendente();
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
    const btnAlterarModo = document.getElementById("btn-alterar-modo-jogo");
    if (btnAlterarModo) btnAlterarModo.addEventListener("click", () => {
      jogador.modoJogo = null;
      salvarCarreiraLocal();
      render();
    });
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


    const btnCallup = document.getElementById("btn-tentar-callup");
    if (btnCallup) btnCallup.addEventListener("click", tentarCallup);

    const btnContinuar = document.getElementById("btn-continuar-evento");
    if (btnContinuar) btnContinuar.addEventListener("click", continuarAposEvento);
    const btnAceitarSelecao = document.getElementById("btn-aceitar-selecao");
    if (btnAceitarSelecao) btnAceitarSelecao.addEventListener("click", () => responderConvocacao(true));
    const btnRecusarSelecao = document.getElementById("btn-recusar-selecao");
    if (btnRecusarSelecao) btnRecusarSelecao.addEventListener("click", () => responderConvocacao(false));
    const btnProximoJogoSelecao = document.getElementById("btn-proximo-jogo-selecao");
    if (btnProximoJogoSelecao) btnProximoJogoSelecao.addEventListener("click", avancarTorneioSelecao);
    const btnEncerrarSelecao = document.getElementById("btn-encerrar-campanha-selecao");
    if (btnEncerrarSelecao) btnEncerrarSelecao.addEventListener("click", encerrarCampanhaSelecao);

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
        <h2>Temporada ${registro.anoTemporada || `T${registro.temporada}`} — desempenho ${registro.desempenho}/100</h2>
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
    if (eventoPendente === "selecao-em-andamento" && torneioSelecao) {
      const t = torneioSelecao;
      const proximo = t.jogos[t.indice];
      const medalhas = { ouro: "🥇 OURO", prata: "🥈 PRATA", bronze: "🥉 BRONZE" };
      return `<section class="campanha-selecao">
        <span>${t.bandeira} ${t.pais.toUpperCase()} · ${t.torneio.toUpperCase()} ${t.ano}</span>
        <h2>${t.encerrado ? (medalhas[t.medalha] || "CAMPANHA ENCERRADA") : "Campanha internacional"}</h2>
        <p>${t.vitorias}V–${t.derrotas}D · ${proximo ? `${proximo.fase}: ${t.bandeira} ${t.pais} × ${proximo.adversario.bandeira} ${proximo.adversario.pais}` : "Todos os jogos foram concluídos."}</p>
        <div class="elenco-selecao"><small>ELENCO DE ${t.pais.toUpperCase()}</small>${t.selecaoDoJogador.elenco.map((atleta) => `<span class="${atleta.usuario ? "usuario" : ""}">${atleta.usuario ? "★ " : ""}${atleta.nome} · ${atleta.posicao} · ${atleta.overall}</span>`).join("")}</div>
        <div class="jogos-selecao">${t.jogos.map((jogo, indice) => `<div class="jogo-selecao ${jogo.venceu === true ? "venceu" : jogo.venceu === false ? "perdeu" : "pendente"}"><small>${jogo.fase}</small><b>${t.bandeira} ${t.pais} <i>×</i> ${jogo.adversario.bandeira} ${jogo.adversario.pais}</b><strong>${jogo.placar || (indice === t.indice ? "PRÓXIMO" : "—")}</strong>${jogo.estatisticas ? `<em>Você: ${jogo.estatisticas.pontos} PTS · ${jogo.estatisticas.rebotes} REB · ${jogo.estatisticas.assistencias} AST</em>` : ""}</div>`).join("")}</div>
      </section>`;
    }
    if (eventoPendente === "convocacao-selecao" && convocacaoSelecao) {
      const c = convocacaoSelecao;
      return `<section class="convocacao-selecao"><span>${c.bandeira} CONVOCAÇÃO OFICIAL</span><h2>${c.pais}</h2><p>Você foi chamado para os <b>${c.torneio} ${c.ano}</b>.</p><small>Defenda seu país na offseason — os jogos internacionais serão a próxima etapa da carreira.</small></section>`;
    }
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
      return `<div class="offseason-box"><h2>Extensão de contrato</h2><p class="meta-linha" style="margin-top:0;text-align:left;">${jogador.time.nome} oferece <b style="color:var(--text)">${e.anos} anos · $${e.salario}M/ano</b>. Papel projetado: <b style="color:var(--text)">${infoPapel(e.papel).label}</b>. Cap disponível: $${e.espacoCap}M.</p></div>`;
    }

    if (eventoPendente === "free-agency" && offseason) {
      return `<div class="offseason-box"><h2>Free agency</h2><p class="meta-linha" style="margin-top:0;text-align:left;">Compare interesse, anos, salário e espaço no cap antes de assinar.</p><div class="lista-universidades">${offseason.ofertas.map((o) => `<button class="uni-opcao" type="button" data-aceitar-troca="${o.time.nome}"><img class="uni-logo" src="${o.time.imagem}" alt="${o.time.nome}" /><span class="uni-info"><span class="uni-tier">${o.time.conferencia} · força ${o.time.forca}</span><span class="uni-nome">${o.time.nome}</span><span class="uni-meta">${o.anos || 2} anos · $${o.salario || "—"}M · cap $${o.espacoCap ?? "—"}M · interesse ${o.score}</span></span></button>`).join("")}</div></div>`;
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

  function selecionarModoJogo(modo) {
    if (!jogador || !["temporada", "jogo-a-jogo"].includes(modo)) return;
    jogador.modoJogo = modo;
    planoSelecionado.simulacao = modo === "jogo-a-jogo" ? "jogo-a-jogo" : "automatico";
    salvarCarreiraLocal();
    render();
  }

  function renderEscolhaModoJogo() {
    return `
      <section class="carta-lenda escolha-modo-jogo">
        <span class="lenda-posicao">Antes de começar</span>
        <h1 class="lenda-nome">Como você quer viver sua carreira?</h1>
        <p class="meta-linha">Essa escolha define o ritmo da sua jornada. Você poderá alterá-la antes de uma nova temporada.</p>
        <div class="modo-jogo-opcoes">
          <button type="button" class="modo-jogo-opcao" data-modo-jogo-inicial="temporada">
            <span>01</span><strong>Temporada por temporada</strong><small>Veja os resultados da temporada avançarem e tome decisões na offseason.</small>
          </button>
          <button type="button" class="modo-jogo-opcao destaque" data-modo-jogo-inicial="jogo-a-jogo">
            <span>02</span><strong>Jogo a jogo</strong><small>Encare missão, preparação, nota pós-jogo, metas e playoffs partida por partida.</small>
          </button>
        </div>
      </section>`;
  }

  function renderAcaoPrincipal() {
    if (eventoPendente === "selecao-em-andamento" && torneioSelecao) {
      return `<div class="acoes-stack">${torneioSelecao.encerrado ? `<button class="acao" id="btn-encerrar-campanha-selecao">Seguir para a offseason</button>` : `<button class="acao" id="btn-proximo-jogo-selecao">Simular próximo jogo da seleção</button>`}</div>`;
    }
    if (eventoPendente === "convocacao-selecao" && convocacaoSelecao) {
      return `<div class="acoes-stack"><button class="acao" id="btn-aceitar-selecao">Aceitar convocação</button><button class="acao secundaria" id="btn-recusar-selecao">Recusar e descansar</button></div>`;
    }
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
      const modo = jogador.modoJogo === "jogo-a-jogo" ? "Jogo a jogo" : "Temporada por temporada";
      return `
        <div class="acoes-stack carreira-enxuta-acao">
          ${renderObjetivosTemporada()}
          <p>Modo escolhido: <b>${modo}</b>. <button type="button" class="link-acao" id="btn-alterar-modo-jogo">Alterar modo</button></p>
          <button class="acao" id="btn-iniciar-temporada-animada">Iniciar temporada ${rotuloAnoTemporada()}</button>
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

  function renderRitmoTemporada() {
    const simulacao = [
      ["jogo-a-jogo", "Jogo a jogo", "avance uma partida por vez"],
      ["manual", "Por blocos", "você controla cada trecho"],
      ["automatico", "Automática", "resultados seguem até um marco"],
    ].map(([v, t, d]) => opcaoPlano("simulacao", v, t, d, planoSelecionado.simulacao === v)).join("");
    return `<section class="ritmo-temporada"><h3>Ritmo da temporada</h3><div class="plano-grid">${simulacao}</div></section>`;
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
    return `
      <section class="plano-temporada">
        <span class="lenda-posicao">Antes de entrar em quadra</span>
        <h2>Plano da temporada</h2>
        <p>Suas escolhas mudam evolução, minutos e estatísticas desta temporada.</p>
        <h3>Foco de treino</h3><div class="plano-grid plano-grid-cinco">${foco}</div>
        <h3>Papel desejado</h3><div class="plano-grid">${papel}</div>
        <h3>Estilo de jogo</h3><div class="plano-grid">${estilo}</div>
        ${renderRitmoTemporada()}
        <div class="acoes-stack"><button class="acao" id="btn-jogar-temporada-pro">Iniciar temporada</button></div>
      </section>
    `;
  }

  function renderSimulacao() {
    const s = simulacaoEmAndamento;
    if (s.cenaRival && jogador.rivalVivo) {
      const rival = jogador.rivalVivo;
      const confronto = rival.confrontos || { vitorias: 0, derrotas: 0 };
      const timeRival = s.cenaRival.adversario || TIMES.find((time) => time.nome === rival.timeNome);
      const fundoTime = (time, lado) => time ? `<div class="rival-time-fundo rival-time-${lado}" style="--neon:${corDoTime(time).a};--neon-secundario:${corDoTime(time).b}"><img src="${time.imagem}" alt=""><strong>${time.nome}</strong></div>` : "";
      return `<div class="overlay-rival">
        <div class="rival-times-fundo" aria-hidden="true">${fundoTime(jogador.time, "seu")}${fundoTime(timeRival, "adversario")}</div>
        <section class="cena-rival">
        <span>NOITE DE RIVALIDADE · ARENA LOTADA</span><h2>${jogador.nome} <i>×</i> ${rival.nome}</h2>
        <p>Dois caminhos que começaram antes do draft se cruzam sob as luzes. A imprensa chamou de teste. A torcida chamou de acerto de contas.</p>
        <div class="rival-placar"><b>VOCÊ<br><small>${confronto.vitorias} vitórias</small></b><em>VERSUS</em><b>${rival.nome}<br><small>${confronto.derrotas} vitórias</small></b></div>
        <p class="rival-fala">“O jogo vai dizer quem realmente estava pronto para este palco.”</p>
        <button class="acao" id="btn-continuar-cena-rival">Entrar em quadra</button>
      </section></div>`;
    }
    if (s.momentoClutch) {
      const c = s.momentoClutch;
      const seuPlacar = c.placarSeu;
      return `<div class="overlay-clutch"><section class="momento-clutch">
        <span class="clutch-kicker">MOMENTO CLUTCH · ÚLTIMA POSSE</span>
        <div class="clutch-placar"><div><img src="${jogador.time.imagem}" alt="${jogador.time.nome}"><b>${jogador.time.nome}</b><strong>${seuPlacar}</strong></div><em>×</em><div><img src="${c.adversario.imagem}" alt="${c.adversario.nome}"><b>${c.adversario.nome}</b><strong>${c.placarAdversario}</strong></div></div>
        <div class="clutch-relogio"><span>4º PERÍODO</span><b>00:${String(c.segundos).padStart(2,"0")}</b><span>SUA POSSE</span></div>
        <div class="clutch-quadra"><div class="clutch-jogador" style="--cor-a:${corDoTime(jogador.time).a};--cor-b:${corDoTime(jogador.time).b}"><i></i><div class="clutch-camisa">#${jogador.numeroCamisa ?? 0}</div><small>${jogador.nome}</small></div><div class="clutch-aro">⌒</div></div>
        <p>Você tem a bola. A leitura desta posse pode decidir a noite.</p><div class="clutch-opcoes"><button data-clutch="isolar"><b>ISOLAÇÃO</b><small>Criação + arremesso</small></button><button data-clutch="pick"><b>PICK & ROLL</b><small>Criação + QI</small></button><button data-clutch="infiltrar"><b>ATACAR O ARO</b><small>Atletismo</small></button><button data-clutch="passe"><b>PASSE EXTRA</b><small>QI + química</small></button></div></section></div>`;
    }
    if (s.fase === "playoffs") return renderSimulacaoPlayoffs(s);
    const jogos = s.relatorioTemporada.jogos;
    const jogo = s.indice > 0 ? jogos[s.indice - 1] : null;
    const vistos = jogos.slice(0, s.indice);
    const vitorias = vistos.filter((j) => j.venceu).length;
    const derrotas = vistos.length - vitorias;
    const classificacaoParcial = s.relatorioTemporada.classificacao;
    const momento = momentoDaCampanha(vistos, jogador.pressao || 0);
    const progresso = jogos.length ? Math.round((s.indice / jogos.length) * 100) : 100;
    const proximoJogo = jogos[s.indice];
    const narrativa = s.eventoNarrativo ? renderEventoNarrativo(s.eventoNarrativo) : "";
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
      ? `Próximo no calendário: <b>${proximoJogo.adversario.nome}</b>`
      : "Todos os jogos da temporada foram concluídos.";
    const posJogo = s.jogoAJogo && jogo ? renderPosJogo(jogo, s) : "";
    const preJogo = s.jogoAJogo && proximoJogo ? renderPreJogo(proximoJogo, s) : "";
    const proximaAcao = s.autoPassar
      ? `<p class="sim-auto-status">Simulando jogos da temporada...</p><button type="button" class="acao secundaria" id="btn-pausar-simulacao">Pausar simulação</button>`
      : s.eventoNarrativo
      ? ""
      : !proximoJogo
      ? `<button class="acao" id="btn-proximo-jogo">Ver resumo da temporada</button>`
      : s.jogoAJogo
        ? `<button class="acao" id="btn-proximo-jogo">Jogar contra ${proximoJogo.adversario.nome}</button>`
      : `<button class="acao" id="btn-simular-bloco">Simular até 10 jogos</button>`;
    return `
      <div class="carta-lenda simulacao-temporada">
        <span class="lenda-posicao">${nomeContexto(jogador.contexto)} · ${s.relatorioTemporada.anoTemporada || rotuloAnoTemporada()} · temporada em andamento</span>
        <h2 class="lenda-nome">${jogador.nome}</h2>
        <div class="sim-layout">
          <section class="sim-painel-principal">
            <div class="sim-campanha"><strong>${vitorias}-${derrotas}</strong><span>jogo ${s.indice}/${jogos.length}${classificacaoParcial ? ` · #${classificacaoParcial.posicaoConferencia} ${classificacaoParcial.conferencia}` : ""}</span></div>
            <div class="sim-progresso"><span style="width:${progresso}%"></span></div>
            ${s.jogoAJogo ? `<p class="sim-momento">${momento}</p>` : ""}
        ${linhaJogo}
        ${jogo && jogo.manchete ? `<p class="manchete-temporada">${jogo.manchete}</p>` : ""}${jogo && jogo.narrativaClutch ? `<p class="narrativa-clutch ${jogo.clutchResultado.sucesso ? "acerto" : "erro"}">${jogo.narrativaClutch}</p>` : ""}
        ${posJogo}
        <p class="sim-proximo">${chamadaProximo}</p>
        ${preJogo}
        ${narrativa}
            ${proximaAcao}
            <button type="button" class="acao secundaria" id="btn-ver-central-temporada">Ver central da temporada</button>
          </section>
          <aside class="sim-painel-lateral">
            <h3>Calendário</h3>
            ${s.jogoAJogo ? renderAgendaJogoAJogo(jogos, s.indice) : vistos.length ? `<div class="sim-resultados"><h3>${tituloResultados}</h3>${resultadosRecentes}</div>` : `<p class="sim-vazio">Os resultados da temporada aparecerão aqui.</p>`}
            ${renderCorridaAoVivo(s)}
          </aside>
        </div>
      </div>
    `;
  }

  function corDoTime(time) {
    const cores = { "los-angeles-lakers":["#552583","#fdb927"], "boston-celtics":["#007a33","#ffffff"], "miami-heat":["#98002e","#f9a01b"], "golden-state-warriors":["#1d428a","#ffc72c"], "chicago-bulls":["#ce1141","#000000"], "new-york-knicks":["#006bb6","#f58426"], "oklahoma-city-thunder":["#007ac1","#ef3b24"], "san-antonio-spurs":["#c4ced4","#000000"], "phoenix-suns":["#1d1160","#e56020"], "milwaukee-bucks":["#00471b","#eee1c6"] };
    Object.assign(cores, {
      "atlanta-hawks": ["#e03a3e", "#c1d32f"], "brooklyn-nets": ["#ffffff", "#707781"],
      "charlotte-hornets": ["#00788c", "#1d1160"], "cleveland-cavaliers": ["#860038", "#fdbb30"],
      "dallas-mavericks": ["#00538c", "#b8c4ca"], "denver-nuggets": ["#0e2240", "#fec524"],
      "detroit-pistons": ["#c8102e", "#1d42ba"], "houston-rockets": ["#ce1141", "#c4ced4"],
      "indiana-pacers": ["#002d62", "#fdbb30"], "los-angeles-clippers": ["#c8102e", "#1d428a"],
      "memphis-grizzlies": ["#5d76a9", "#f5b112"], "minnesota-timberwolves": ["#236192", "#78be20"],
      "new-orleans-pelicans": ["#0c2340", "#c8102e"], "orlando-magic": ["#0077c0", "#c4ced4"],
      "philadelphia-76ers": ["#006bb6", "#ed174c"], "portland-trail-blazers": ["#e03a3e", "#ffffff"],
      "sacramento-kings": ["#5a2d81", "#63727a"], "toronto-raptors": ["#ce1141", "#b4975a"],
      "utah-jazz": ["#753bbd", "#69b3e7"], "washington-wizards": ["#002b5c", "#e31837"]
    });
    const cor = cores[time && time.slug] || ["#1d428a", "#c8102e"];
    return { a: cor[0], b: cor[1] };
  }

  function narrarMomentoClutch(resultado, jogo) {
    const acertos = ["A bola cai limpa no aro e a arena explode.","Você lê a troca defensiva e pune o espaço.","O defensor recua um passo; foi tudo que você precisava.","A posse vira uma aula de sangue-frio.","No silêncio da arena, você encontra o arremesso perfeito.","O pick abre a defesa e você decide sem hesitar.","Você absorve o contato e converte sob a cesta.","A ajuda chega tarde demais para impedir a cesta.","Sua leitura desmonta a última linha defensiva.","A bola sai da mão com confiança de veterano.","Você transforma pressão em dois pontos decisivos.","A marcação dobra, mas o passe extra acha o homem livre.","O relógio aperta; sua execução permanece calma.","Um crossover cria a separação necessária e a rede balança.","Você vence o corpo a corpo e finaliza com autoridade.","A defesa apostou errado — e você cobrou na hora.","A posse inteira foi desenhada para você; a conclusão também.","A torcida adversária fica em silêncio diante da conversão.","Você usa o corpo, protege a bola e coloca no vidro.","A assistência encontra o canto no último instante.","A bola beija a tabela antes de cair: clutch.","Você acelera, quebra a primeira linha e resolve.","Frieza total: a decisão certa no segundo certo.","A jogada coletiva encontra a brecha que ninguém viu.","Você chama a responsabilidade e entrega o resultado."];
    const erros = ["O arremesso sai curto sob contestação pesada.","A defesa fecha o garrafão e força uma finalização difícil.","O passe extra é desviado no último instante.","Você perde o equilíbrio ao absorver o contato.","A troca defensiva lê o pick-and-roll e elimina a linha de passe.","O defensor recupera a tempo e altera a trajetória.","A bola gira no aro, mas decide não cair.","A dobra chega cedo e você fica sem ângulo.","A infiltração encontra um toco no ponto mais alto.","O cronômetro vence a jogada antes da soltura.","A leitura era boa, mas a execução não acompanha.","Você força a separação e a bola escapa da mão.","O arremesso do canto bate no ferro e sai.","A defesa antecipa o passe e mata a última posse.","Você tenta cavar a falta, mas não recebe o apito.","A pressão pesa e a bola fica na parte frontal do aro.","A ajuda defensiva fecha a porta no momento decisivo.","O crossover não cria espaço suficiente para o tiro.","A bola fica presa na tabela e o rebote é deles.","O defensor usa o corpo e impede a finalização limpa.","O passe encontra mãos adversárias em vez do companheiro.","A tentativa de três não encontra a rede.","Você chega ao aro, mas a bandeja gira para fora.","A defesa escolhe bem a cobertura e obriga o erro.","A última posse termina sem a resposta que o time precisava."];
    const lista = resultado.sucesso ? acertos : erros;
    const tensao = jogador.energia < 35 ? " Cansaço visível no fim." : jogador.confiancaTecnico < 40 ? " O técnico observa cada detalhe." : jogador.apoioTorcida > 70 ? " A torcida reconhece a coragem." : "";
    return `${lista[Math.floor(Math.random() * lista.length)]}${tensao}`;
  }

  function renderAgendaJogoAJogo(jogos, indice) {
    const inicio = Math.max(0, indice - 2);
    const fim = Math.min(jogos.length, indice + 5);
    const partidas = jogos.slice(inicio, fim).map((partida, deslocamento) => {
      const posicao = inicio + deslocamento;
      const concluida = posicao < indice;
      const atual = posicao === indice;
      const status = concluida ? (partida.venceu ? "V" : "D") : atual ? "PRÓX." : "";
      const placar = concluida ? `${partida.pontosTime}-${partida.pontosAdversario}` : "—";
      return `<div class="sim-agenda-jogo${concluida ? " concluido" : ""}${atual ? " atual" : ""}">
        <b>${posicao + 1}</b><span>${partida.mes} · ${partida.rivalidade ? "Rivalidade · " : ""}vs ${partida.adversario.nome}</span><em>${status}</em><strong>${placar}</strong>
      </div>`;
    }).join("");
    return `<div class="sim-agenda"><h3>${indice ? "Últimos e próximos jogos" : "Próximos jogos"}</h3>${partidas}</div>`;
  }

  function renderPreJogo(jogo, s) {
    const missao = s.missaoAtual;
    const desafio = s.desafioCurto;
    const preparos = [
      ["treino", "Treino extra", "+ pontos · -3 energia"],
      ["filme", "Filme tático", "+ criação e defesa · -1 energia"],
      ["descanso", "Descansar", "+5 energia"],
    ];
    const decisao = s.decisaoJogo || {};
    const escolhas = [
      ["abordagem", "Abordagem", [["agressivo", "Atacar", "+ pontos · menos criação"], ["coletivo", "Criar", "+ eficiência e AST"], ["defensivo", "Defender", "+ ações defensivas"]]],
      ["minutos", "Minutos", [["carga", "Carga alta", "+ impacto · -5 energia"], ["normal", "Rotação normal", "sem ajuste"], ["controle", "Controlar carga", "- volume · +2 energia"]]],
      ["matchup", "Matchup", [["estrela", "Marcar a estrela", "+ roubos · pressão"], ["padrao", "Sistema do time", "equilíbrio"], ["proteger-aro", "Proteger o aro", "+ rebotes e tocos"]]],
    ];
    return `<section class="pre-jogo">
      <div class="pre-jogo-topo"><span>PRÉ-JOGO · PARTIDA ${s.indice + 1}</span><strong>${identidadeAdversario(jogo.adversario)}</strong></div>
      ${missao ? `<div class="missao-jogo"><span>MISSÃO DA PARTIDA</span><b>${missao.titulo}</b><small>${missao.descricao} ${missao.recompensa}</small></div>` : ""}
      ${desafio ? `<div class="desafio-curto"><span>META DE 5 JOGOS</span><b>${desafio.titulo}</b><small>${desafio.descricao} · ${desafio.recompensa}</small></div>` : ""}
      <div class="preparacao-jogo"><span>Preparação opcional</span><div>${preparos.map(([id, nome, detalhe]) => `<button class="plano-opcao${decisao.preparacao === id ? " ativo" : ""}" data-preparacao-jogo="${id}"><b>${nome}</b><small>${detalhe}</small></button>`).join("")}</div></div>
      <div class="decisoes-partida">${escolhas.map(([campo, titulo, opcoes]) => `<div class="preparacao-jogo"><span>${titulo}</span><div>${opcoes.map(([valor, nome, detalhe]) => `<button class="plano-opcao${(decisao[campo] || (campo === "abordagem" ? "equilibrado" : campo === "minutos" ? "normal" : "padrao")) === valor ? " ativo" : ""}" data-decisao-jogo="${campo}" data-valor-decisao="${valor}"><b>${nome}</b><small>${detalhe}</small></button>`).join("")}</div></div>`).join("")}</div>
    </section>`;
  }

  function renderPosJogo(jogo, s) {
    const nota = jogo.avaliacaoJogo;
    const missao = jogo.missao || s.ultimaMissao;
    const desafio = s.ultimoDesafio && s.ultimoDesafio.fim === s.indice ? s.ultimoDesafio : null;
    if (!nota) return "";
    return `<section class="pos-jogo">
      <div class="nota-jogo nota-${nota.letra.toLowerCase()}"><b>${nota.letra}</b><span>NOTA</span></div>
      <div><strong>${nota.texto}</strong><small>${jogo.preparacaoAplicada ? `Preparação: ${jogo.preparacaoAplicada} · ` : ""}${nota.pontos}/100</small></div>
      ${missao ? `<p class="resultado-missao ${missao.cumpriu ? "cumprida" : "falhou"}">${missao.cumpriu ? "MISSÃO CUMPRIDA" : "MISSÃO NÃO CUMPRIDA"} · ${missao.valor}/${missao.alvo}</p>` : ""}
      ${desafio ? `<p class="resultado-desafio ${desafio.cumpriu ? "cumprida" : "falhou"}">${desafio.cumpriu ? "META DE 5 JOGOS CUMPRIDA" : "META DE 5 JOGOS ENCERRADA"} · ${desafio.valor.toFixed(1)}/${desafio.alvo}</p>` : ""}
    </section>`;
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

  function renderCorridaAoVivo(s) {
    if (!s.corridaAoVivo) return "";
    const ledger = s.relatorioTemporada.ledger;
    const proximo = s.relatorioTemporada.jogos[s.indice];
    const linhaTime = ledger && jogador.time ? ledger.equipes[jogador.time.nome] : null;
    const linhaRival = ledger && proximo ? ledger.equipes[proximo.adversario.nome] : null;
    const resumo = (linha) => linha ? `${linha.vitorias}-${linha.derrotas} · forma ${linha.forma.join("") || "—"} · ${linha.jogos ? (linha.pontosPro / linha.jogos).toFixed(1) : "—"} PPG` : "—";
    const linha = (titulo, categoria) => {
      const lista = rankingPremioAoVivo(s.corridaAoVivo[categoria], categoria, s);
      return `<div class="sim-corrida"><span>${titulo}</span>${lista.slice(0, 3).map((p, i) => `<small class="${p.voce ? "voce" : ""}">${i + 1}. ${p.nome}${p.voce ? " · você" : ""}</small>`).join("")}</div>`;
    };
    return `<div class="sim-corridas"><h3>Corrida ao vivo · jogo ${s.indice}/82</h3><p>Dados acumulados da temporada; os prêmios só são definidos ao fim dela.</p><div class="ledger-ao-vivo"><small><b>${jogador.time.nome}</b> · ${resumo(linhaTime)}</small>${proximo ? `<small><b>${proximo.adversario.nome}</b> · ${resumo(linhaRival)}</small>` : ""}</div>${linha("MVP", "mvp")}${linha("DPOY", "dpoy")}${linha("ROY", "roy")}</div>`;
  }

  function montarJogosDaSerie(serie) {
    const [vitorias, derrotas] = String(serie.placar || "4-0").split("-").map(Number);
    const resultadoFinal = serie.venceu ? "V" : "D";
    const restantes = [
      ...Array(Math.max(0, vitorias - (resultadoFinal === "V" ? 1 : 0))).fill("V"),
      ...Array(Math.max(0, derrotas - (resultadoFinal === "D" ? 1 : 0))).fill("D"),
    ];
    // Alterna os resultados intermediários para que a série seja legível e
    // preserve a vitória que realmente encerra a série no último jogo.
    const jogos = [];
    while (restantes.length) {
      const preferido = jogos.length && jogos[jogos.length - 1] === "V" ? "D" : "V";
      const indice = restantes.indexOf(preferido);
      jogos.push(restantes.splice(indice === -1 ? 0 : indice, 1)[0]);
    }
    jogos.push(resultadoFinal);
    return jogos;
  }

  function renderSimulacaoPlayoffs(s) {
    const series = s.relatorioTemporada.playoffs.series || [];
    const concluida = series[s.playoffIndice - 1];
    const proxima = series[s.playoffIndice];
    const serieDoRival = Boolean(proxima && jogador.rivalVivo && proxima.adversario.nome === jogador.rivalVivo.timeNome);
    const jogosDaSerie = s.playoffJogos || (proxima && s.jogoAJogo ? montarJogosDaSerie(proxima) : []);
    const jogosVistos = jogosDaSerie.slice(0, s.playoffJogoIndice || 0);
    const placarParcial = `${jogosVistos.filter((resultado) => resultado === "V").length}-${jogosVistos.filter((resultado) => resultado === "D").length}`;
    const ultimaPartida = proxima && proxima.jogos ? proxima.jogos.at(-1) : null;
    const boxScore = ultimaPartida && ultimaPartida.stats
      ? `<div class="sim-box-playoff${ultimaPartida.noiteHistorica ? " historico" : ""}"><span>${ultimaPartida.noiteHistorica ? "NOITE HISTÓRICA" : `BOX SCORE · JOGO ${ultimaPartida.numero}`}</span><strong>${Math.round(ultimaPartida.stats.pontos)} PTS · ${Math.round(ultimaPartida.stats.rebotes)} REB · ${Math.round(ultimaPartida.stats.assistencias)} AST</strong><small>${Math.round(ultimaPartida.stats.roubos)} STL · ${Math.round(ultimaPartida.stats.tocos)} BLK · ${Math.round(ultimaPartida.stats.tresConvertidas)} 3PT</small></div>`
      : "";
    const feitas = series.slice(0, s.playoffIndice).map((serie) => `
      <div class="sim-serie ${serie.venceu ? "venceu" : "perdeu"}">
        <img class="mini-logo" src="${serie.adversario.imagem}" alt="" />
        <span>${serie.rodada} · ${serie.adversario.nome}</span>
        <strong>${serie.venceu ? "Venceu" : "Eliminado"} ${serie.placar}</strong>
      </div>
    `).join("");
    const destaque = s.jogoAJogo && proxima
      ? `<div class="sim-placar ${jogosVistos.at(-1) === "V" ? "venceu" : jogosVistos.at(-1) === "D" ? "perdeu" : ""}">
          <div><span>${jogador.time.nome}</span><strong>${placarParcial.split("-")[0]}</strong></div>
          <span class="sim-x">×</span>
          <div><img class="sim-logo" src="${proxima.adversario.imagem}" alt="${proxima.adversario.nome}" /><span>${proxima.adversario.nome}</span><strong>${placarParcial.split("-")[1]}</strong></div>
        </div>
        <p class="sim-status">${jogosVistos.length ? `Jogo ${jogosVistos.length}: ${jogosVistos.at(-1) === "V" ? "VITÓRIA" : "DERROTA"}` : "A série começa agora."} · melhor de 7</p>`
      : concluida
      ? `<div class="sim-placar ${concluida.venceu ? "venceu" : "perdeu"}">
          <div><span>${jogador.time.nome}</span><strong>${concluida.placar.split("-")[0]}</strong></div>
          <span class="sim-x">×</span>
          <div><img class="sim-logo" src="${concluida.adversario.imagem}" alt="${concluida.adversario.nome}" /><span>${concluida.adversario.nome}</span><strong>${concluida.placar.split("-")[1]}</strong></div>
        </div>
        <p class="sim-status ${concluida.venceu ? "vitoria" : "derrota"}">${concluida.venceu ? "SÉRIE VENCIDA" : "FIM DE SÉRIE"} · ${concluida.rodada}</p>`
      : `<p class="sim-status">A pós-temporada começa agora.</p>`;
    const chamada = proxima
      ? s.jogoAJogo
        ? `<span class="sim-marco">${proxima.rodada}</span>: <b>${jogador.time.nome} vs ${proxima.adversario.nome}</b> · ${jogosVistos.length >= jogosDaSerie.length ? "série encerrada" : `próximo: jogo ${(s.playoffJogoIndice || 0) + 1}`}`
        : `<span class="sim-marco">${proxima.rodada}</span>: <b>${jogador.time.nome} vs ${proxima.adversario.nome}</b>`
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
            ${serieDoRival ? `<p class="narrativa-clutch">CAPÍTULO DE PLAYOFFS · ${jogador.rivalVivo.nome} está do outro lado. A rivalidade chega à pós-temporada.</p>` : ""}
            ${boxScore}
            <p class="sim-proximo">${chamada}</p>
        ${s.autoPassar ? `<p class="sim-auto-status">Simulando pós-temporada...</p><button type="button" class="acao secundaria" id="btn-pausar-simulacao">Pausar simulação</button>` : proxima ? `<button class="acao" id="btn-proximo-jogo">${s.jogoAJogo ? (jogosVistos.length >= jogosDaSerie.length ? "Avançar na chave" : `Jogar jogo ${(s.playoffJogoIndice || 0) + 1}`) : "Avançar confronto de playoff"}</button>` : `<button class="acao" id="btn-proximo-jogo">Ver resumo da temporada</button>`}
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
