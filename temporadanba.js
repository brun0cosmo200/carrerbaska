// temporadaNba.js
// Simula temporada NBA com calendário do jogador, tabelas por conferência,
// bracket 1–8 realista, finais interconferência, prêmios e draft anual.
(function (global) {

const dados =
  typeof module !== "undefined" && module.exports
    ? require("./data.js")
    : global.CB;

const progressaoMod =
  typeof module !== "undefined" && module.exports
    ? require("./progressao.js")
    : global.CB;

const timesData =
  typeof module !== "undefined" && module.exports
    ? require("./times.js")
    : global.CB;

const { ATRIBUTOS } = dados;
const { simularDesempenho } = progressaoMod;
const { TIMES } = timesData;

const JOGOS_POR_TEMPORADA = 82;
const LIMIAR_MVP_PARTIDA = 90;
const VAGAS_POR_CONFERENCIA = 8;
const MESES_TEMPORADA = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr"];
let proximaClasseDraft = 1;

function mediaForcaLiga() {
  return TIMES.reduce((s, t) => s + t.forca, 0) / TIMES.length;
}

function overallDe(atributos) {
  return ATRIBUTOS.reduce((soma, a) => soma + atributos[a], 0) / ATRIBUTOS.length;
}

function estatisticasDoJogo(jogador, desempenhoJogo) {
  const a = jogador.atual;
  const f = desempenhoJogo / 100;
  const minutos =
    (global.CB && global.CB.multiplicadorMinutos
      ? global.CB.multiplicadorMinutos(jogador)
      : 1);
  const estilo = jogador.planoTemporada && jogador.planoTemporada.estilo;
  const uso = estilo === "agressivo" ? 1.13 : estilo === "coletivo" ? 0.86 : 1;
  const criacao = estilo === "coletivo" ? 1.20 : estilo === "agressivo" ? 0.9 : 1;
  return {
    pontos: ((a.arremesso * 0.5 + a.criacao * 0.3 + a.atletismo * 0.2) / 100) * 35 * f * minutos * uso,
    rebotes: ((a.defesa * 0.5 + a.atletismo * 0.5) / 100) * 14 * f * minutos,
    assistencias: ((a.qiBasquete * 0.6 + a.criacao * 0.4) / 100) * 12 * f * minutos * criacao,
    roubos: ((a.defesa * 0.7 + a.qiBasquete * 0.3) / 100) * 2.5 * f * minutos,
    tocos: ((a.defesa * 0.6 + a.atletismo * 0.4) / 100) * 2.5 * f * minutos,
  };
}

function winPctEsperado(forca) {
  const media = mediaForcaLiga();
  return Math.max(0.22, Math.min(0.78, 0.5 + (forca - media) / 45));
}

function chanceVitoria(forcaA, forcaB) {
  const diff = forcaA - forcaB;
  return Math.max(0.22, Math.min(0.78, 0.5 + diff / 40 + (Math.random() - 0.5) * 0.06));
}

// ~70% dos jogos contra a própria conferência (próximo do calendário NBA).
function escolherAdversario(timeJogador) {
  const mesma = TIMES.filter((t) => t.nome !== timeJogador.nome && t.conferencia === timeJogador.conferencia);
  const outra = TIMES.filter((t) => t.conferencia !== timeJogador.conferencia);
  const pool = Math.random() < 0.7 ? mesma : outra;
  return pool[Math.floor(Math.random() * pool.length)];
}

function forcaEfetivaJogador(jogador) {
  const overall = overallDe(jogador.atual);
  const overallNorm =
    global.CB && global.CB.normalizarOverallParaForca
      ? global.CB.normalizarOverallParaForca(overall)
      : overall;
  return jogador.time.forca + (overallNorm - jogador.time.forca) * 0.18;
}

// Compat: usado em outros módulos / G-League.
function probabilidadeVitoria(jogador) {
  if (jogador.contexto === "nba" && jogador.time) {
    return Math.max(0.22, Math.min(0.78, 0.5 + (forcaEfetivaJogador(jogador) - mediaForcaLiga()) / 45));
  }
  const overallAtual = overallDe(jogador.atual);
  return Math.max(0.2, Math.min(0.8, 0.5 + (overallAtual - 55) / 100));
}

function novoRegistro(time) {
  return { time, vitorias: 0, derrotas: 0, jogos: 0 };
}

function registrarResultado(regs, vencedorNome, perdedorNome) {
  regs[vencedorNome].vitorias++;
  regs[vencedorNome].jogos++;
  regs[perdedorNome].derrotas++;
  regs[perdedorNome].jogos++;
}

// Simula os 82 jogos do jogador contra adversários reais e completa
// o restante da liga — o W-L do jogador bate com a linha da tabela.
function simularCalendarioETabela(jogador) {
  const regs = {};
  TIMES.forEach((t) => {
    regs[t.nome] = novoRegistro(t);
  });

  const lesao =
    global.CB && global.CB.sortearLesao ? global.CB.sortearLesao(jogador) : null;
  const jogosPerdidos = lesao ? lesao.jogosPerdidos : 0;
  const jogosJogados = JOGOS_POR_TEMPORADA - jogosPerdidos;

  let mvpsDePartida = 0;
  const jogos = [];
  let somaDesempenho = 0;
  const somaEstatisticas = { pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0 };
  let pontosTimeTemporada = 0;
  let pontosContraTemporada = 0;
  const forcaJog = forcaEfetivaJogador(jogador);

  for (let i = 0; i < jogosJogados; i++) {
    const adversario = escolherAdversario(jogador.time);
    const rivalidade = (jogador.time.rivais || []).includes(adversario.nome);
    const pressaoJogo = Math.min(30, (jogador.pressao || 0) + (rivalidade ? 12 : 0));
    const efeitoPressao = pressaoJogo > 15
      ? (Math.random() < 0.52 ? -Math.round(pressaoJogo * 0.28) : Math.round(pressaoJogo * 0.17))
      : Math.round(pressaoJogo * 0.1);
    const desempenhoJogo = Math.max(35, Math.min(100, simularDesempenho(jogador) + efeitoPressao));
    somaDesempenho += desempenhoJogo;
    if (desempenhoJogo >= LIMIAR_MVP_PARTIDA) mvpsDePartida++;

    const stats = estatisticasDoJogo(jogador, desempenhoJogo);
    somaEstatisticas.pontos += stats.pontos;
    somaEstatisticas.rebotes += stats.rebotes;
    somaEstatisticas.assistencias += stats.assistencias;
    somaEstatisticas.roubos += stats.roubos;
    somaEstatisticas.tocos += stats.tocos;

    // Lesão grave reduz um pouco a chance de vitória do time
    const penLesao = lesao && lesao.tipo === "grave" ? 0.04 : lesao ? 0.02 : 0;
    const venceu = Math.random() < Math.max(0.18, chanceVitoria(forcaJog, adversario.forca) - penLesao);
    if (venceu) registrarResultado(regs, jogador.time.nome, adversario.nome);
    else registrarResultado(regs, adversario.nome, jogador.time.nome);
    const pontosTime = Math.round(96 + forcaJog * 0.32 + Math.random() * 18);
    const pontosAdversario = Math.max(78, pontosTime + (venceu ? -(3 + Math.floor(Math.random() * 13)) : 3 + Math.floor(Math.random() * 13)));
    pontosTimeTemporada += pontosTime;
    pontosContraTemporada += pontosAdversario;
    jogos.push({ adversario, venceu, pontosTime, pontosAdversario, stats, rivalidade, pressao: pressaoJogo, mes: MESES_TEMPORADA[Math.min(MESES_TEMPORADA.length - 1, Math.floor(i / 12))] });
  }

  // Jogos sem o jogador: time joga mais fraco
  for (let i = 0; i < jogosPerdidos; i++) {
    const adversario = escolherAdversario(jogador.time);
    const forcaSem = jogador.time.forca - 4;
    const venceu = Math.random() < chanceVitoria(forcaSem, adversario.forca);
    if (venceu) registrarResultado(regs, jogador.time.nome, adversario.nome);
    else registrarResultado(regs, adversario.nome, jogador.time.nome);
    const pontosTime = Math.round(94 + forcaSem * 0.32 + Math.random() * 18);
    const pontosAdversario = Math.max(78, pontosTime + (venceu ? -(3 + Math.floor(Math.random() * 13)) : 3 + Math.floor(Math.random() * 13)));
    pontosTimeTemporada += pontosTime;
    pontosContraTemporada += pontosAdversario;
    jogos.push({ adversario, venceu, pontosTime, pontosAdversario, stats: null, fora: true, rivalidade: (jogador.time.rivais || []).includes(adversario.nome), pressao: jogador.pressao || 0, mes: MESES_TEMPORADA[Math.min(MESES_TEMPORADA.length - 1, Math.floor((jogosJogados + i) / 12))] });
  }

  // Completa os 82 jogos dos outros times com jogos sintéticos.
  TIMES.forEach((t) => {
    if (t.nome === jogador.time.nome) return;
    const faltam = JOGOS_POR_TEMPORADA - regs[t.nome].jogos;
    const base = winPctEsperado(t.forca);
    for (let i = 0; i < faltam; i++) {
      const ruido = (Math.random() - 0.5) * 0.12;
      if (Math.random() < Math.max(0.18, Math.min(0.82, base + ruido))) {
        regs[t.nome].vitorias++;
      } else {
        regs[t.nome].derrotas++;
      }
      regs[t.nome].jogos++;
    }
  });

  const tabela = TIMES.map((t) => {
    const r = regs[t.nome];
    const jogadorNoTime = t.nome === jogador.time.nome;
    const ataque = jogadorNoTime ? pontosTimeTemporada / JOGOS_POR_TEMPORADA : 101 + (t.forca - 75) * 0.95 + Math.random() * 5;
    const defesa = jogadorNoTime ? pontosContraTemporada / JOGOS_POR_TEMPORADA : 118 - (t.forca - 75) * 0.72 + Math.random() * 5;
    return {
      time: t,
      vitorias: r.vitorias,
      derrotas: r.derrotas,
      winPct: r.vitorias / JOGOS_POR_TEMPORADA,
      ataque: +ataque.toFixed(1),
      defesa: +defesa.toFixed(1),
    };
  });

  tabela.sort((a, b) => b.winPct - a.winPct || b.vitorias - a.vitorias);
  tabela.forEach((linha, i) => {
    linha.posicao = i + 1;
  });
  [...tabela].sort((a, b) => b.ataque - a.ataque).forEach((linha, i) => { linha.rankingAtaque = i + 1; });
  [...tabela].sort((a, b) => a.defesa - b.defesa).forEach((linha, i) => { linha.rankingDefesa = i + 1; });

  ["Leste", "Oeste"].forEach((conf) => {
    const grupo = tabela
      .filter((l) => l.time.conferencia === conf)
      .sort((a, b) => b.winPct - a.winPct || b.vitorias - a.vitorias);
    grupo.forEach((linha, i) => {
      linha.posicaoConferencia = i + 1;
      linha.vagaPlayoff = i < VAGAS_POR_CONFERENCIA;
    });
  });

  const vitorias = regs[jogador.time.nome].vitorias;
  const derrotas = regs[jogador.time.nome].derrotas;
  const denom = Math.max(1, jogosJogados);
  const desempenhoMedio = Math.round(somaDesempenho / denom);
  const medias = {
    pontos: +(somaEstatisticas.pontos / denom).toFixed(1),
    rebotes: +(somaEstatisticas.rebotes / denom).toFixed(1),
    assistencias: +(somaEstatisticas.assistencias / denom).toFixed(1),
    roubos: +(somaEstatisticas.roubos / denom).toFixed(1),
    tocos: +(somaEstatisticas.tocos / denom).toFixed(1),
  };

  return {
    tabela,
    vitorias,
    derrotas,
    medias,
    mvpsDePartida,
    desempenhoMedio,
    lesao,
    jogosJogados,
    jogos,
  };
}

function seedsPlayoff(tabela, conferencia) {
  return tabela
    .filter((l) => l.time.conferencia === conferencia && l.vagaPlayoff)
    .sort((a, b) => a.posicaoConferencia - b.posicaoConferencia)
    .map((l) => ({ time: l.time, seed: l.posicaoConferencia, conferencia }));
}

// Emparelhamento clássico: 1×8, 4×5, 2×7, 3×6 — vencedores se cruzam.
function paresPrimeiraRodada(seeds) {
  return [
    [seeds[0], seeds[7]],
    [seeds[3], seeds[4]],
    [seeds[1], seeds[6]],
    [seeds[2], seeds[5]],
  ];
}

function jogarSerie(a, b) {
  const venceuA = Math.random() < chanceVitoria(a.time.forca, b.time.forca);
  return venceuA ? a : b;
}

function rastrearEliminacao(jogador, a, b, vencedor, rodada, caminho) {
  if (caminho || !jogador || !jogador.time) return caminho;
  const envolve =
    a.time.nome === jogador.time.nome || b.time.nome === jogador.time.nome;
  if (!envolve) return caminho;
  if (vencedor.time.nome === jogador.time.nome) return caminho;
  return {
    campeao: false,
    eliminadoNa: rodada,
    eliminadoPor: vencedor.time,
    conferencia: jogador.time.conferencia,
  };
}

// Guarda o caminho do jogador nos playoffs para a UI revelar uma série por
// vez, sem precisar re-simular a chave depois que a temporada terminou.
function registrarSerieJogador(jogador, a, b, vencedor, rodada, series) {
  if (!jogador || !jogador.time) return;
  const jogadorEA = a.time.nome === jogador.time.nome;
  const jogadorEB = b.time.nome === jogador.time.nome;
  if (!jogadorEA && !jogadorEB) return;
  const venceu = vencedor.time.nome === jogador.time.nome;
  const derrotasNaSerie = 1 + Math.floor(Math.random() * 3);
  series.push({
    rodada,
    adversario: jogadorEA ? b.time : a.time,
    venceu,
    placar: venceu ? `4-${derrotasNaSerie}` : `${derrotasNaSerie}-4`,
  });
}

function registrarSerieChave(a, b, vencedor, rodada, conferencia, chave) {
  const derrotasVencedor = 1 + Math.floor(Math.random() * 3);
  const vencedorEA = vencedor.time.nome === a.time.nome;
  chave.push({
    rodada,
    conferencia,
    timeA: a.time,
    timeB: b.time,
    vencedor: vencedor.time,
    placar: vencedorEA ? `4-${derrotasVencedor}` : `${derrotasVencedor}-4`,
  });
}

function simularChaveConferencia(seeds, nomeConf, jogador) {
  const RODADAS = [
    `1ª rodada (${nomeConf})`,
    `semifinal de conferência (${nomeConf})`,
    `final de conferência (${nomeConf})`,
  ];

  let caminho = null;
  const seriesJogador = [];
  const chaveCompleta = [];
  let chave = paresPrimeiraRodada(seeds).map(([a, b]) => {
    const vencedor = jogarSerie(a, b);
    caminho = rastrearEliminacao(jogador, a, b, vencedor, RODADAS[0], caminho);
    registrarSerieJogador(jogador, a, b, vencedor, RODADAS[0], seriesJogador);
    registrarSerieChave(a, b, vencedor, RODADAS[0], nomeConf, chaveCompleta);
    return vencedor;
  });

  // Semis: Winner(1v8) vs Winner(4v5), Winner(2v7) vs Winner(3v6)
  const semis = [
    [chave[0], chave[1]],
    [chave[2], chave[3]],
  ];
  chave = semis.map(([a, b]) => {
    const vencedor = jogarSerie(a, b);
    caminho = rastrearEliminacao(jogador, a, b, vencedor, RODADAS[1], caminho);
    registrarSerieJogador(jogador, a, b, vencedor, RODADAS[1], seriesJogador);
    registrarSerieChave(a, b, vencedor, RODADAS[1], nomeConf, chaveCompleta);
    return vencedor;
  });

  const campeaoConf = jogarSerie(chave[0], chave[1]);
  caminho = rastrearEliminacao(jogador, chave[0], chave[1], campeaoConf, RODADAS[2], caminho);
  registrarSerieJogador(jogador, chave[0], chave[1], campeaoConf, RODADAS[2], seriesJogador);
  registrarSerieChave(chave[0], chave[1], campeaoConf, RODADAS[2], nomeConf, chaveCompleta);

  return { campeao: campeaoConf, caminho, seriesJogador, chaveCompleta };
}

function simularPlayoffsLiga(tabela, jogador) {
  const seedsLeste = seedsPlayoff(tabela, "Leste");
  const seedsOeste = seedsPlayoff(tabela, "Oeste");

  const leste = simularChaveConferencia(seedsLeste, "Leste", jogador);
  const oeste = simularChaveConferencia(seedsOeste, "Oeste", jogador);

  let caminhoJogador = leste.caminho || oeste.caminho;
  const seriesJogador = [...leste.seriesJogador, ...oeste.seriesJogador];

  const campeao = jogarSerie(leste.campeao, oeste.campeao);
  caminhoJogador = rastrearEliminacao(
    jogador,
    leste.campeao,
    oeste.campeao,
    campeao,
    "finais da NBA",
    caminhoJogador
  );
  registrarSerieJogador(jogador, leste.campeao, oeste.campeao, campeao, "finais da NBA", seriesJogador);
  const chaveCompleta = [...leste.chaveCompleta, ...oeste.chaveCompleta];
  registrarSerieChave(leste.campeao, oeste.campeao, campeao, "finais da NBA", "NBA", chaveCompleta);

  if (jogador && jogador.time && campeao.time.nome === jogador.time.nome) {
    caminhoJogador = {
      campeao: true,
      eliminadoNa: null,
      eliminadoPor: null,
      conferencia: jogador.time.conferencia,
    };
  }

  return {
    campeao: campeao.time,
    campeaoLeste: leste.campeao.time,
    campeaoOeste: oeste.campeao.time,
    caminhoJogador,
    seriesJogador,
    chaveCompleta,
  };
}

function calcularPremiosTemporada(jogador, medias, tabela, resultadoPlayoffs, draft) {
  const impactoJogador =
    medias.pontos + medias.rebotes * 1.2 + medias.assistencias * 1.5 + (medias.roubos + medias.tocos) * 3;

  const candidatos = tabela.slice(0, 12).map((linha) => {
    const estrela = linha.time.elenco[0];
    const impactoBase = (linha.time.forca / 90) * 40 + linha.winPct * 12 + (Math.random() - 0.5) * 12;
    return { nome: estrela, time: linha.time, impacto: impactoBase };
  });

  if (jogador.contexto === "nba" && jogador.time) {
    candidatos.push({
      nome: jogador.nome,
      time: jogador.time,
      impacto: impactoJogador + (Math.random() - 0.5) * 4,
    });
  }

  candidatos.sort((a, b) => b.impacto - a.impacto);
  const mvp = candidatos[0];

  // Cada prêmio tem uma única classificação. Antes, o painel da liga
  // escolhia um DPOY e a carreira sorteava outro separadamente, permitindo
  // que duas pessoas "ganhassem" o mesmo prêmio na mesma temporada.
  const candidatosDpoy = tabela.slice(0, 18).map((linha) => {
    const estrela = linha.time.elenco[0];
    return {
      nome: estrela,
      time: linha.time,
      impacto: linha.time.forca * 0.62 + linha.winPct * 18 + (Math.random() - 0.5) * 7,
    };
  });
  if (jogador.contexto === "nba" && jogador.time) {
    const impactoDefensivoJogador =
      (jogador.atual.defesa || 70) * 0.7 +
      (medias.roubos || 0) * 12 +
      (medias.tocos || 0) * 14 +
      (medias.rebotes || 0) * 0.7;
    candidatosDpoy.push({
      nome: jogador.nome,
      time: jogador.time,
      impacto: impactoDefensivoJogador + (Math.random() - 0.5) * 3,
    });
  }
  candidatosDpoy.sort((a, b) => b.impacto - a.impacto);
  const dpoy = candidatosDpoy[0];

  const candidatosSextoHomem = tabela.slice(6, 20).map((linha, i) => ({
    nome: linha.time.elenco[5] || linha.time.elenco[0],
    time: linha.time,
    impacto: linha.time.forca * 0.45 + (20 - i) * 0.9 + Math.random() * 6,
  }));
  if (jogador.contexto === "nba" && jogador.time && jogador.papel === "sexto") {
    candidatosSextoHomem.push({
      nome: jogador.nome,
      time: jogador.time,
      impacto: impactoJogador + Math.random() * 3,
    });
  }
  candidatosSextoHomem.sort((a, b) => b.impacto - a.impacto);
  const sextoHomem = candidatosSextoHomem[0];

  const candidatosRoy = (draft || []).slice(0, 12).map((pick) => ({
    nome: pick.calouro,
    time: pick.time,
    impacto: (13 - pick.posicao) * 2 + Math.random() * 18 + pick.time.forca * 0.12,
  }));
  if (jogador.contexto === "nba" && jogador.time && (jogador.temporadasNba || 0) === 0) {
    candidatosRoy.push({
      nome: jogador.nome,
      time: jogador.time,
      impacto: impactoJogador + Math.random() * 8,
    });
  }
  candidatosRoy.sort((a, b) => b.impacto - a.impacto);
  const roy = candidatosRoy[0];
  const { campeao, campeaoLeste, campeaoOeste } = resultadoPlayoffs;

  return {
    mvpDaLiga: mvp.nome,
    mvpTime: mvp.time,
    dpoyDaLiga: dpoy.nome,
    dpoyTime: dpoy.time,
    sextoHomemDaLiga: sextoHomem.nome,
    sextoHomemTime: sextoHomem.time,
    novatoDoAno: roy ? roy.nome : "—",
    novatoTime: roy ? roy.time : null,
    campeao,
    campeaoNome: campeao.nome,
    campeaoLeste,
    campeaoOeste,
    // Ranking completo (nome + impacto) pra quem for avaliar prêmios
    // individuais (All-Star/All-NBA) contra o campo de candidatos real,
    // em vez de threshold fixo sem concorrência.
    candidatosOrdenados: candidatos.map((c) => ({ nome: c.nome, impacto: c.impacto })),
    candidatosDpoyOrdenados: candidatosDpoy.map((c) => ({ nome: c.nome, impacto: c.impacto })),
    corridaPremios: {
      mvp: candidatos.slice(0, 5).map((c) => ({ nome: c.nome, time: c.time.nome, imagem: c.time.imagem })),
      dpoy: candidatosDpoy.slice(0, 5).map((c) => ({ nome: c.nome, time: c.time.nome, imagem: c.time.imagem })),
      roy: candidatosRoy.slice(0, 5).map((c) => ({ nome: c.nome, time: c.time.nome, imagem: c.time.imagem })),
      allStar: candidatos.slice(0, 10).map((c) => ({ nome: c.nome, time: c.time.nome, imagem: c.time.imagem })),
    },
  };
}

function gerarDraftAnual(tabela) {
  const playoff = tabela.filter((l) => l.vagaPlayoff);
  const loteria = [...tabela.filter((l) => !l.vagaPlayoff)].sort((a, b) => b.posicao - a.posicao);

  const pool = loteria.map((l, i) => ({
    linha: l,
    peso: (i + 1) * (i + 1) * 3 + Math.random() * 28,
  }));

  const ordemLoteria = [];
  const restante = [...pool];
  while (restante.length) {
    const total = restante.reduce((s, x) => s + x.peso, 0);
    let sorteio = Math.random() * total;
    let idx = 0;
    for (; idx < restante.length; idx++) {
      sorteio -= restante[idx].peso;
      if (sorteio <= 0) break;
    }
    idx = Math.min(idx, restante.length - 1);
    ordemLoteria.push(restante[idx].linha);
    restante.splice(idx, 1);
  }

  const ordemPlayoff = [...playoff].sort((a, b) => b.posicao - a.posicao);
  const ordem = [...ordemLoteria, ...ordemPlayoff];
  const classe = proximaClasseDraft++;
  const primeiros = ["Darius", "Malik", "Eli", "Jalen", "Noah", "Andre", "Kai", "Trey", "Isaac", "Jordan", "Cameron", "Devin", "Marcus", "Tyler", "Jayden"];
  const ultimos = ["Cole", "Rivers", "Carter", "Price", "Bennett", "Lewis", "Morrison", "Vaughn", "Brooks", "Miles", "Fields", "Hayes", "Reed", "Grant", "King"];
  const ordemCompleta = [...ordem, ...ordem]; // duas rodadas, 60 calouros
  return ordemCompleta.map((linha, i) => ({
    posicao: i + 1,
    time: linha.time,
    vitorias: linha.vitorias,
    derrotas: linha.derrotas,
    id: `draft-${classe}-${i + 1}`,
    calouro: `${primeiros[(i + classe) % primeiros.length]} ${ultimos[(i * 3 + classe) % ultimos.length]} · ${classe}-${i + 1}`,
    posicaoJogador: ["PG", "SG", "SF", "PF", "C"][i % 5],
    overall: Math.max(62, 78 - Math.floor(i / 5) + Math.floor(Math.random() * 5)),
    potencial: Math.max(70, 88 - Math.floor(i / 6) + Math.floor(Math.random() * 7)),
  }));
}

function atualizarForcasAposTemporada(tabela, draft) {
  tabela.forEach((linha) => {
    const t = linha.time;
    const regressao = (t.forcaBase - t.forca) * 0.28;
    const forma = (linha.winPct - 0.5) * 3.5;
    const ruido = (Math.random() - 0.5) * 3.2;
    t.forca = Math.round(Math.max(70, Math.min(92, t.forca + regressao - forma * 0.4 + ruido)));
  });

  draft.slice(0, 5).forEach((pick, i) => {
    pick.time.forca = Math.round(Math.min(92, pick.time.forca + (2.8 - i * 0.4)));
  });
}

function gerarOrdemDraftLoteria(times = TIMES) {
  const porForca = [...times].sort((a, b) => a.forca - b.forca);
  const pool = porForca.map((t, i) => ({
    time: t,
    peso: (porForca.length - i) * (porForca.length - i) + Math.random() * 40,
  }));

  const ordem = [];
  const restante = [...pool];
  while (restante.length) {
    const total = restante.reduce((s, x) => s + x.peso, 0);
    let sorteio = Math.random() * total;
    let idx = 0;
    for (; idx < restante.length; idx++) {
      sorteio -= restante[idx].peso;
      if (sorteio <= 0) break;
    }
    idx = Math.min(idx, restante.length - 1);
    ordem.push(restante[idx].time);
    restante.splice(idx, 1);
  }
  return ordem;
}

function resumoConferencia(tabela, conferencia) {
  return tabela
    .filter((l) => l.time.conferencia === conferencia)
    .sort((a, b) => a.posicaoConferencia - b.posicaoConferencia)
    .slice(0, 8)
    .map((l) => ({
      posicao: l.posicaoConferencia,
      nome: l.time.nome,
      imagem: l.time.imagem,
      vitorias: l.vitorias,
      derrotas: l.derrotas,
      playoff: l.vagaPlayoff,
    }));
}

function resumirCalendarioMensal(jogos) {
  return MESES_TEMPORADA.map((mes) => {
    const jogosMes = jogos.filter((j) => j.mes === mes);
    const vitorias = jogosMes.filter((j) => j.venceu).length;
    const lesoes = jogosMes.filter((j) => j.fora).length;
    const tendencia = jogosMes.slice(-5).map((j) => j.venceu ? "V" : "D").join("") || "—";
    return { mes, jogos: jogosMes.length, vitorias, derrotas: jogosMes.length - vitorias, lesoes, tendencia };
  }).filter((mes) => mes.jogos);
}

function compararComTitularesDaPosicao(jogador, medias) {
  const impactoJogador = medias.pontos + medias.rebotes * 1.15 + medias.assistencias * 1.45 + (medias.roubos + medias.tocos) * 2.2;
  const referencia = TIMES.map((time) => {
    const titular = (time.jogadores || []).find((p) => p.posicao === jogador.posicao) || (time.jogadores || [])[0];
    const overall = titular ? titular.overall : time.forca;
    return { nome: titular ? titular.nome : time.elenco[0], time: time.nome, impacto: overall * 0.64 + time.forca * 0.22 };
  });
  referencia.push({ nome: jogador.nome, time: jogador.time.nome, impacto: impactoJogador });
  referencia.sort((a, b) => b.impacto - a.impacto);
  const rank = referencia.findIndex((p) => p.nome === jogador.nome) + 1;
  return { rank, total: referencia.length, impacto: +impactoJogador.toFixed(1), lideres: referencia.slice(0, 5) };
}

function simularTemporadaCompleta(jogador) {
  // G-League: mantém simulação simples sem tabela NBA.
  if (jogador.contexto !== "nba" || !jogador.time) {
    let vitorias = 0;
    let mvpsDePartida = 0;
    let somaDesempenho = 0;
    const somaEstatisticas = { pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0 };
    const jogos = [];
    const prob = probabilidadeVitoria(jogador);

    for (let jogo = 0; jogo < JOGOS_POR_TEMPORADA; jogo++) {
      const desempenhoJogo = simularDesempenho(jogador);
      somaDesempenho += desempenhoJogo;
      const venceu = Math.random() < prob;
      if (venceu) vitorias++;
      if (desempenhoJogo >= LIMIAR_MVP_PARTIDA) mvpsDePartida++;
      const stats = estatisticasDoJogo(jogador, desempenhoJogo);
      somaEstatisticas.pontos += stats.pontos;
      somaEstatisticas.rebotes += stats.rebotes;
      somaEstatisticas.assistencias += stats.assistencias;
      somaEstatisticas.roubos += stats.roubos;
      somaEstatisticas.tocos += stats.tocos;
      const pontosTime = Math.round(98 + desempenhoJogo * 0.28 + Math.random() * 14);
      const pontosAdversario = Math.max(80, pontosTime + (venceu ? -(3 + Math.floor(Math.random() * 12)) : 3 + Math.floor(Math.random() * 12)));
      jogos.push({ adversario: { nome: "G League Select", imagem: null }, venceu, pontosTime, pontosAdversario, stats });
    }

    return {
      vitorias,
      derrotas: JOGOS_POR_TEMPORADA - vitorias,
      medias: {
        pontos: +(somaEstatisticas.pontos / JOGOS_POR_TEMPORADA).toFixed(1),
        rebotes: +(somaEstatisticas.rebotes / JOGOS_POR_TEMPORADA).toFixed(1),
        assistencias: +(somaEstatisticas.assistencias / JOGOS_POR_TEMPORADA).toFixed(1),
        roubos: +(somaEstatisticas.roubos / JOGOS_POR_TEMPORADA).toFixed(1),
        tocos: +(somaEstatisticas.tocos / JOGOS_POR_TEMPORADA).toFixed(1),
      },
      mvpsDePartida,
      desempenhoMedio: Math.round(somaDesempenho / JOGOS_POR_TEMPORADA),
      classificacao: null,
      playoffs: null,
      premios: null,
      draft: null,
      tabela: null,
      tabelasConferencia: null,
      jogos,
      calendarioMensal: resumirCalendarioMensal(jogos),
      estatisticasTime: null,
      comparacaoPosicao: null,
    };
  }

  const { tabela, vitorias, derrotas, medias, mvpsDePartida, desempenhoMedio, lesao, jogosJogados, jogos } =
    simularCalendarioETabela(jogador);

  const linhaJogador = tabela.find((l) => l.time.nome === jogador.time.nome);
  const classificacao = {
    posicao: linhaJogador.posicao,
    posicaoConferencia: linhaJogador.posicaoConferencia,
    conferencia: jogador.time.conferencia,
    vagaPlayoff: linhaJogador.vagaPlayoff,
    vitorias: linhaJogador.vitorias,
    derrotas: linhaJogador.derrotas,
  };
  const estatisticasTime = {
    ataque: linhaJogador.ataque,
    defesa: linhaJogador.defesa,
    rankingAtaque: linhaJogador.rankingAtaque,
    rankingDefesa: linhaJogador.rankingDefesa,
    aproveitamento: +(linhaJogador.winPct * 100).toFixed(1),
  };
  const comparacaoPosicao = compararComTitularesDaPosicao(jogador, medias);

  const resultadoPlayoffs = simularPlayoffsLiga(tabela, jogador);
  const playoffs = linhaJogador.vagaPlayoff
    ? {
      ...resultadoPlayoffs.caminhoJogador,
        series: resultadoPlayoffs.seriesJogador,
        chaveCompleta: resultadoPlayoffs.chaveCompleta,
        campeaoLeste: resultadoPlayoffs.campeaoLeste,
        campeaoOeste: resultadoPlayoffs.campeaoOeste,
      }
    : null;

  const draft = gerarDraftAnual(tabela);
  const premios = calcularPremiosTemporada(jogador, medias, tabela, resultadoPlayoffs, draft);
  atualizarForcasAposTemporada(tabela, draft);
  const mundoLiga = global.CB && global.CB.avancarMundoLiga
    ? global.CB.avancarMundoLiga(draft)
    : null;
  const historicoLiga = global.CB && global.CB.registrarHistoricoLiga
    ? global.CB.registrarHistoricoLiga({ ...premios, draft })
    : null;

  return {
    vitorias,
    derrotas,
    medias,
    mvpsDePartida,
    desempenhoMedio,
    classificacao,
    playoffs,
    premios,
    draft,
    lesao,
    jogosJogados,
    jogos,
    calendarioMensal: resumirCalendarioMensal(jogos),
    estatisticasTime,
    comparacaoPosicao,
    chavePlayoffs: resultadoPlayoffs.chaveCompleta,
    papel: jogador.papel || "titular",
    tabela: tabela.slice(0, 8).map((l) => ({
      posicao: l.posicao,
      nome: l.time.nome,
      imagem: l.time.imagem,
      vitorias: l.vitorias,
      derrotas: l.derrotas,
      conferencia: l.time.conferencia,
    })),
    tabelasConferencia: {
      Leste: resumoConferencia(tabela, "Leste"),
      Oeste: resumoConferencia(tabela, "Oeste"),
    },
    mundoLiga,
    historicoLiga,
  };
}

const api = {
  simularTemporadaCompleta,
  estatisticasDoJogo,
  probabilidadeVitoria,
  gerarOrdemDraftLoteria,
  gerarDraftAnual,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);
