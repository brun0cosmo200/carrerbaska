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
  // Todas as linhas do box score nascem juntas. Assim, pontos, bolas de
  // três e aproveitamento não são contadores decorativos desconectados.
  const pontos = ((a.arremesso * 0.5 + a.criacao * 0.3 + a.atletismo * 0.2) / 100) * 35 * f * minutos * uso;
  const tresConvertidas = Math.max(0, Math.min(14, Math.round((a.arremesso / 100) * 4.4 * f * minutos * (estilo === "agressivo" ? 1.18 : 1))));
  const lancesLivresConvertidos = Math.max(0, Math.round((a.atletismo * .42 + a.arremesso * .38) / 100 * 5.4 * f * minutos));
  // Deduzimos as cestas de dois da pontuação para manter o box score
  // matematicamente coerente. A pequena correção evita totais negativos.
  const cestasDeDois = Math.max(0, Math.round((pontos - tresConvertidas * 3 - lancesLivresConvertidos) / 2));
  const arremessosConvertidos = cestasDeDois + tresConvertidas;
  const aproveitamento = Math.max(.38, Math.min(.66, .43 + (a.arremesso - 55) / 220 + (f - .7) / 7));
  const arremessosTentados = Math.max(arremessosConvertidos, Math.round(arremessosConvertidos / aproveitamento));
  const tresTentadas = Math.max(tresConvertidas, Math.round(tresConvertidas / Math.max(.27, Math.min(.52, .31 + (a.arremesso - 55) / 210))));
  const lancesLivresTentados = Math.max(lancesLivresConvertidos, Math.round(lancesLivresConvertidos / Math.max(.62, Math.min(.93, .7 + a.arremesso / 400))));
  const rebotes = ((a.defesa * 0.5 + a.atletismo * 0.5) / 100) * 14 * f * minutos;
  const assistencias = ((a.qiBasquete * 0.6 + a.criacao * 0.4) / 100) * 12 * f * minutos * criacao;
  return {
    pontos: cestasDeDois * 2 + tresConvertidas * 3 + lancesLivresConvertidos,
    rebotes,
    assistencias,
    roubos: ((a.defesa * 0.7 + a.qiBasquete * 0.3) / 100) * 2.5 * f * minutos,
    tocos: ((a.defesa * 0.6 + a.atletismo * 0.4) / 100) * 2.5 * f * minutos,
    arremessosConvertidos,
    arremessosTentados,
    tresConvertidas,
    tresTentadas,
    lancesLivresConvertidos,
    lancesLivresTentados,
    turnovers: Math.max(0, Math.round((2.8 + (70 - a.qiBasquete) / 18 + (uso - 1) * 5) * f * minutos)),
    minutos: Math.max(8, Math.round(30 * minutos)),
  };
}

// Uma atuação histórica não é um bônus recorrente: ela só pode acontecer em
// uma noite excepcional de um jogador de elite e no máximo uma vez por
// temporada. Isso abre uma rota rara aos livros de recordes sem inflar as
// médias normais do simulador.
function sortearNoiteHistorica(jogador, desempenhoJogo, jaAconteceu) {
  if (jaAconteceu || desempenhoJogo < 90) return null;
  const overall = overallDe(jogador.atual);
  if (overall < 88) return null;
  const chance = 0.012 + Math.max(0, overall - 92) * 0.003;
  if (Math.random() >= chance) return null;
  const talentos = [
    ["pontos", jogador.atual.arremesso + jogador.atual.criacao],
    ["rebotes", jogador.atual.defesa + jogador.atual.atletismo],
    ["assistencias", jogador.atual.qiBasquete + jogador.atual.criacao],
    ["defesa", jogador.atual.defesa * 2 + jogador.atual.atletismo],
    ["tres", jogador.atual.arremesso * 2 + jogador.atual.qiBasquete],
  ].sort((a, b) => b[1] - a[1]);
  const foco = talentos[Math.floor(Math.random() * Math.min(3, talentos.length))][0];
  const titulos = {
    pontos: "A ARENA TESTEMUNHA UMA CHUVA DE PONTOS",
    rebotes: "DOMÍNIO ABSOLUTO NO GARRAFÃO",
    assistencias: "UMA AULA DE CRIAÇÃO",
    defesa: "A NOITE EM QUE O ARO DESAPARECEU",
    tres: "A LINHA DE TRÊS VIROU TERRITÓRIO DELE",
  };
  return { foco, titulo: titulos[foco] };
}

function aplicarNoiteHistorica(stats, noite) {
  const inteiro = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  if (noite.foco === "pontos") {
    const pontos = inteiro(62, 100);
    const tres = inteiro(5, 13);
    const livres = inteiro(12, 28);
    const dois = Math.max(0, Math.round((pontos - tres * 3 - livres) / 2));
    stats.tresConvertidas = tres;
    stats.lancesLivresConvertidos = livres;
    stats.arremessosConvertidos = dois + tres;
    stats.arremessosTentados = Math.max(stats.arremessosConvertidos, stats.arremessosConvertidos + inteiro(8, 22));
    stats.tresTentadas = Math.max(tres, tres + inteiro(3, 10));
    stats.lancesLivresTentados = Math.max(livres, livres + inteiro(0, 5));
    stats.pontos = dois * 2 + tres * 3 + livres;
  } else if (noite.foco === "rebotes") {
    stats.rebotes = inteiro(30, 55);
  } else if (noite.foco === "assistencias") {
    stats.assistencias = inteiro(18, 30);
  } else if (noite.foco === "defesa") {
    if (Math.random() < 0.54) stats.tocos = inteiro(9, 17);
    else stats.roubos = inteiro(7, 11);
  } else if (noite.foco === "tres") {
    const tres = inteiro(10, 14);
    const livres = inteiro(6, 16);
    const dois = inteiro(7, 15);
    stats.tresConvertidas = tres;
    stats.tresTentadas = tres + inteiro(4, 11);
    stats.lancesLivresConvertidos = livres;
    stats.lancesLivresTentados = livres + inteiro(0, 4);
    stats.arremessosConvertidos = dois + tres;
    stats.arremessosTentados = stats.arremessosConvertidos + inteiro(7, 17);
    stats.pontos = dois * 2 + tres * 3 + livres;
  }
  stats.minutos = Math.max(stats.minutos || 0, 43);
  return stats;
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
  let noiteHistoricaRealizada = false;
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

    const noiteHistorica = sortearNoiteHistorica(jogador, desempenhoJogo, noiteHistoricaRealizada);
    if (noiteHistorica) noiteHistoricaRealizada = true;
    const stats = estatisticasDoJogo(jogador, desempenhoJogo);
    if (noiteHistorica) aplicarNoiteHistorica(stats, noiteHistorica);
    somaEstatisticas.pontos += stats.pontos;
    somaEstatisticas.rebotes += stats.rebotes;
    somaEstatisticas.assistencias += stats.assistencias;
    somaEstatisticas.roubos += stats.roubos;
    somaEstatisticas.tocos += stats.tocos;

    // Lesão grave reduz um pouco a chance de vitória do time
    const penLesao = lesao && lesao.tipo === "grave" ? 0.04 : lesao ? 0.02 : 0;
    const venceu = noiteHistorica
      ? Math.random() < 0.93
      : Math.random() < Math.max(0.18, chanceVitoria(forcaJog, adversario.forca) - penLesao);
    if (venceu) registrarResultado(regs, jogador.time.nome, adversario.nome);
    else registrarResultado(regs, adversario.nome, jogador.time.nome);
    const pontosTime = Math.round(96 + forcaJog * 0.32 + Math.random() * 18);
    const pontosAdversario = Math.max(78, pontosTime + (venceu ? -(3 + Math.floor(Math.random() * 13)) : 3 + Math.floor(Math.random() * 13)));
    pontosTimeTemporada += pontosTime;
    pontosContraTemporada += pontosAdversario;
    jogos.push({ adversario, venceu, pontosTime, pontosAdversario, stats, noiteHistorica, rivalidade, pressao: pressaoJogo, mes: MESES_TEMPORADA[Math.min(MESES_TEMPORADA.length - 1, Math.floor(i / 12))] });
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

function jogarSerie(a, b, jogador) {
  let chanceA = chanceVitoria(a.time.forca, b.time.forca);
  // Em playoffs o protagonista de elite precisa mudar a equação. O bônus é
  // deliberadamente limitado: um elenco fraco ainda pode cair, mas uma grande
  // carreira não fica refém de quatro sorteios secos.
  if (jogador && jogador.time && (a.time.nome === jogador.time.nome || b.time.nome === jogador.time.nome)) {
    const overall = overallDe(jogador.atual);
    const bonus = Math.min(.14, .05 + Math.max(0, overall - 78) * .006);
    chanceA += a.time.nome === jogador.time.nome ? bonus : -bonus;
  }
  const venceuA = Math.random() < Math.max(.18, Math.min(.85, chanceA));
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

// --- Temporada progressiva -------------------------------------------------
// O calendário interativo não pode nascer com 82 resultados escondidos. Estas
// funções mantêm somente a agenda e resolvem uma rodada quando ela acontece.
function criarRegistrosDaLiga() {
  return Object.fromEntries(TIMES.map((time) => [time.nome, novoRegistro(time)]));
}

// Ledger da temporada: cada rodada escreve aqui antes de atualizar a UI.
// Não há projeção baseada no vencedor final; classificação, forma e prêmios
// sempre são derivados somente dos jogos já resolvidos.
function criarLedgerDaLiga(jogador) {
  const equipes = Object.fromEntries(TIMES.map((time) => [time.nome, {
    jogos: 0, vitorias: 0, derrotas: 0, pontosPro: 0, pontosContra: 0,
    forma: [], meses: Object.fromEntries(MESES_TEMPORADA.map((mes) => [mes, { jogos: 0, vitorias: 0, derrotas: 0, pontosPro: 0, pontosContra: 0 }])),
  }]));
  const estrelas = TIMES.map((time, indice) => {
    const nome = (time.estrelas || time.elenco || ["Estrela"])[0];
    // O usuário já recebe uma linha própria no ledger; não pode entrar duas
    // vezes caso tenha virado a principal estrela do elenco.
    if (time.nome === jogador.time.nome && nome === jogador.nome) return null;
    return {
    id: `estrela-${time.slug}`, nome, time: time.nome,
    imagem: time.imagem, defesaBase: Math.round(time.forca * .78 + (indice % 5)),
    calouro: false, jogos: 0, pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0,
    };
  }).filter(Boolean);
  const calouros = TIMES.flatMap((time) => (time.jogadores || []).filter((atleta) => atleta.calouro).slice(0, 2).map((atleta) => ({
    id: `calouro-${atleta.id}`, nome: atleta.nome, time: time.nome, imagem: time.imagem,
    defesaBase: atleta.overall * .72, calouro: true, jogos: 0, pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0,
  })));
  if ((jogador.temporadasNba || 0) === 0) calouros.push({ id: "voce-roy", nome: jogador.nome, time: jogador.time.nome, imagem: jogador.time.imagem, voce: true, calouro: true, defesaBase: jogador.atual.defesa || 70, jogos: 0, pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0 });
  estrelas.push({ id: "voce", nome: jogador.nome, time: jogador.time.nome, imagem: jogador.time.imagem, voce: true, calouro: false, defesaBase: jogador.atual.defesa || 70, jogos: 0, pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0 });
  return { equipes, candidatos: [...estrelas, ...calouros.filter((c) => !c.voce)], calouros };
}

function registrarLinhaLedger(linha, venceu, pontosPro, pontosContra, mes) {
  linha.jogos++; linha.vitorias += venceu ? 1 : 0; linha.derrotas += venceu ? 0 : 1;
  linha.pontosPro += pontosPro; linha.pontosContra += pontosContra;
  linha.forma.push(venceu ? "V" : "D"); if (linha.forma.length > 10) linha.forma.shift();
  const mensal = linha.meses[mes];
  mensal.jogos++; mensal.vitorias += venceu ? 1 : 0; mensal.derrotas += venceu ? 0 : 1; mensal.pontosPro += pontosPro; mensal.pontosContra += pontosContra;
}

function adicionarStatsCandidato(candidato, time, stats) {
  if (!candidato || candidato.time !== time.nome) return;
  candidato.jogos++; ["pontos", "rebotes", "assistencias", "roubos", "tocos"].forEach((chave) => { candidato[chave] += stats[chave] || 0; });
}

function statsSinteticosDaEstrela(time, venceu) {
  const fator = time.forca / 82;
  return { pontos: 18 + fator * 7 + Math.random() * 8 + (venceu ? 2 : 0), rebotes: 4 + Math.random() * 5, assistencias: 3 + Math.random() * 5, roubos: .6 + Math.random() * 1.8, tocos: .2 + Math.random() * 1.8 };
}

function registrarJogoNoLedger(temporada, casa, fora, venceuCasa, pontosCasa, pontosFora, mes, statsUsuario) {
  const ledger = temporada.ledger;
  registrarLinhaLedger(ledger.equipes[casa.nome], venceuCasa, pontosCasa, pontosFora, mes);
  registrarLinhaLedger(ledger.equipes[fora.nome], !venceuCasa, pontosFora, pontosCasa, mes);
  [casa, fora].forEach((time) => {
    const venceu = time.nome === casa.nome ? venceuCasa : !venceuCasa;
    ledger.candidatos.filter((c) => c.time === time.nome && !c.calouro).forEach((c) => {
      adicionarStatsCandidato(c, time, statsUsuario && c.voce ? statsUsuario.stats : statsSinteticosDaEstrela(time, venceu));
    });
    ledger.calouros.filter((c) => c.time === time.nome).forEach((c) => {
      adicionarStatsCandidato(c, time, statsUsuario && c.voce ? statsUsuario.stats : statsSinteticosDaEstrela(time, venceu));
    });
  });
}

function mediaCandidato(candidato, chave) { return (candidato[chave] || 0) / Math.max(1, candidato.jogos); }

function corridaPremiosDoLedger(temporada) {
  const ledger = temporada.ledger;
  const campanha = (nome) => { const e = ledger.equipes[nome]; return e && e.jogos ? e.vitorias / e.jogos : .5; };
  const pontuar = (candidato, categoria) => {
    const pontos = mediaCandidato(candidato, "pontos"), rebotes = mediaCandidato(candidato, "rebotes"), assistencias = mediaCandidato(candidato, "assistencias"), roubos = mediaCandidato(candidato, "roubos"), tocos = mediaCandidato(candidato, "tocos");
    if (categoria === "dpoy") return candidato.defesaBase * .55 + rebotes * .8 + (roubos + tocos) * 8 + campanha(candidato.time) * 18;
    if (categoria === "roy") return pontos + rebotes * .9 + assistencias * 1.15 + (roubos + tocos) * 2 + campanha(candidato.time) * 8;
    return pontos + rebotes * 1.15 + assistencias * 1.45 + (roubos + tocos) * 2.5 + campanha(candidato.time) * 18;
  };
  const listar = (fonte, categoria) => fonte.map((c) => ({ ...c, impacto: +pontuar(c, categoria).toFixed(2) })).sort((a, b) => b.impacto - a.impacto || b.jogos - a.jogos).slice(0, 10);
  const mvp = listar(ledger.candidatos, "mvp"), dpoy = listar(ledger.candidatos, "dpoy"), roy = listar(ledger.calouros, "roy");
  return { mvp, dpoy, roy, allStar: mvp.slice(0, 10) };
}

// Saves criados antes do ledger continuam jogáveis. Reconstruímos um ponto de
// partida com os registros já existentes, sem re-sortear os jogos passados.
function garantirLedgerDaTemporada(jogador, temporada) {
  if (temporada.ledger) return;
  temporada.ledger = criarLedgerDaLiga(jogador);
  TIMES.forEach((time) => {
    const registro = temporada.registros && temporada.registros[time.nome];
    if (!registro) return;
    const linha = temporada.ledger.equipes[time.nome];
    linha.jogos = registro.jogos || 0; linha.vitorias = registro.vitorias || 0; linha.derrotas = registro.derrotas || 0;
    linha.pontosPro = linha.jogos * (101 + (time.forca - 75) * .95);
    linha.pontosContra = linha.jogos * (118 - (time.forca - 75) * .72);
  });
  (temporada.jogos || []).filter((jogo) => jogo.resolvido && jogo.stats).forEach((jogo) => {
    temporada.ledger.candidatos.filter((c) => c.voce).forEach((c) => adicionarStatsCandidato(c, jogador.time, jogo.stats));
    temporada.ledger.calouros.filter((c) => c.voce).forEach((c) => adicionarStatsCandidato(c, jogador.time, jogo.stats));
  });
}

function calcularMediasParciais(jogos) {
  const disputados = jogos.filter((j) => j.resolvido && j.stats);
  const total = Math.max(1, disputados.length);
  const media = (chave) => +(disputados.reduce((soma, jogo) => soma + (jogo.stats[chave] || 0), 0) / total).toFixed(1);
  return {
    pontos: media("pontos"), rebotes: media("rebotes"), assistencias: media("assistencias"), roubos: media("roubos"), tocos: media("tocos"),
    arremessosConvertidos: media("arremessosConvertidos"), arremessosTentados: media("arremessosTentados"),
    tresConvertidas: media("tresConvertidas"), tresTentadas: media("tresTentadas"),
    lancesLivresConvertidos: media("lancesLivresConvertidos"), lancesLivresTentados: media("lancesLivresTentados"),
    turnovers: media("turnovers"), minutos: media("minutos"),
  };
}

function montarTabelaProgressiva(jogador, registros, jogos, ledger) {
  const pontosTime = jogos.filter((j) => j.resolvido).reduce((soma, jogo) => soma + (jogo.pontosTime || 0), 0);
  const pontosContra = jogos.filter((j) => j.resolvido).reduce((soma, jogo) => soma + (jogo.pontosAdversario || 0), 0);
  const jogosTime = Math.max(1, registros[jogador.time.nome].jogos);
  const tabela = TIMES.map((time) => {
    const registro = registros[time.nome];
    const eDoJogador = time.nome === jogador.time.nome;
    const linhaLedger = ledger && ledger.equipes[time.nome];
    return {
      time,
      vitorias: registro.vitorias,
      derrotas: registro.derrotas,
      winPct: registro.jogos ? registro.vitorias / registro.jogos : 0,
      ataque: +(linhaLedger && linhaLedger.jogos ? linhaLedger.pontosPro / linhaLedger.jogos : eDoJogador ? pontosTime / jogosTime : 101 + (time.forca - 75) * .95).toFixed(1),
      defesa: +(linhaLedger && linhaLedger.jogos ? linhaLedger.pontosContra / linhaLedger.jogos : eDoJogador ? pontosContra / jogosTime : 118 - (time.forca - 75) * .72).toFixed(1),
    };
  });
  tabela.sort((a, b) => b.winPct - a.winPct || b.vitorias - a.vitorias || a.time.nome.localeCompare(b.time.nome));
  tabela.forEach((linha, indice) => { linha.posicao = indice + 1; });
  [...tabela].sort((a, b) => b.ataque - a.ataque).forEach((linha, indice) => { linha.rankingAtaque = indice + 1; });
  [...tabela].sort((a, b) => a.defesa - b.defesa).forEach((linha, indice) => { linha.rankingDefesa = indice + 1; });
  ["Leste", "Oeste"].forEach((conferencia) => {
    tabela.filter((linha) => linha.time.conferencia === conferencia)
      .sort((a, b) => b.winPct - a.winPct || b.vitorias - a.vitorias || a.time.nome.localeCompare(b.time.nome))
      .forEach((linha, indice) => { linha.posicaoConferencia = indice + 1; linha.vagaPlayoff = indice < VAGAS_POR_CONFERENCIA; });
  });
  return tabela;
}

function criarAgendaDaTemporada(jogador) {
  const agenda = Array.from({ length: JOGOS_POR_TEMPORADA }, (_, indice) => {
    const adversario = escolherAdversario(jogador.time);
    const rivalPessoal = Boolean(jogador.rivalVivo && jogador.rivalVivo.timeNome === adversario.nome);
    return {
      adversario,
      rivalPessoal,
      rivalidade: rivalPessoal || (jogador.time.rivais || []).includes(adversario.nome),
      pressao: Math.min(30, (jogador.pressao || 0) + (rivalPessoal ? 18 : (jogador.time.rivais || []).includes(adversario.nome) ? 12 : 0)),
      mes: MESES_TEMPORADA[Math.min(MESES_TEMPORADA.length - 1, Math.floor(indice / 12))],
      resolvido: false,
    };
  });
  if (jogador.rivalVivo) {
    const rival = TIMES.find((time) => time.nome === jogador.rivalVivo.timeNome);
    if (rival && rival.nome !== jogador.time.nome) {
      [15, 57].forEach((indice) => {
        agenda[indice] = { ...agenda[indice], adversario: rival, rivalPessoal: true, rivalidade: true, pressao: Math.min(30, (jogador.pressao || 0) + 18) };
      });
    }
  }
  return agenda;
}

function atualizarOutrosJogosDaRodada(temporada, timeJogador, adversarioJogador, venceuJogador, pontosTime, pontosAdversario, mes, statsUsuario) {
  const registros = temporada.registros;
  if (venceuJogador) registrarResultado(registros, timeJogador.nome, adversarioJogador.nome);
  else registrarResultado(registros, adversarioJogador.nome, timeJogador.nome);
  registrarJogoNoLedger(temporada, timeJogador, adversarioJogador, venceuJogador, pontosTime, pontosAdversario, mes, statsUsuario);
  const restantes = TIMES.filter((time) => time.nome !== timeJogador.nome && time.nome !== adversarioJogador.nome)
    .sort(() => Math.random() - .5);
  for (let indice = 0; indice < restantes.length; indice += 2) {
    const casa = restantes[indice];
    const fora = restantes[indice + 1];
    const venceuCasa = Math.random() < chanceVitoria(casa.forca, fora.forca);
    registrarResultado(registros, venceuCasa ? casa.nome : fora.nome, venceuCasa ? fora.nome : casa.nome);
    const pontosCasa = Math.round(96 + casa.forca * .32 + Math.random() * 18);
    const pontosFora = Math.max(78, pontosCasa + (venceuCasa ? -(3 + Math.floor(Math.random() * 13)) : 3 + Math.floor(Math.random() * 13)));
    registrarJogoNoLedger(temporada, casa, fora, venceuCasa, pontosCasa, pontosFora, mes, null);
  }
}

function atualizarResumoProgressivo(jogador, temporada) {
  garantirLedgerDaTemporada(jogador, temporada);
  const tabela = montarTabelaProgressiva(jogador, temporada.registros, temporada.jogos, temporada.ledger);
  const linha = tabela.find((entrada) => entrada.time.nome === jogador.time.nome);
  temporada.tabelaCompleta = tabela;
  temporada.vitorias = linha.vitorias;
  temporada.derrotas = linha.derrotas;
  temporada.medias = calcularMediasParciais(temporada.jogos);
  const disputados = temporada.jogos.filter((j) => j.resolvido && j.stats);
  temporada.jogosJogados = disputados.length;
  temporada.mvpsDePartida = disputados.filter((j) => j.desempenhoJogo >= LIMIAR_MVP_PARTIDA).length;
  temporada.desempenhoMedio = Math.round(disputados.reduce((soma, jogo) => soma + jogo.desempenhoJogo, 0) / Math.max(1, disputados.length));
  temporada.classificacao = { posicao: linha.posicao, posicaoConferencia: linha.posicaoConferencia, conferencia: jogador.time.conferencia, vagaPlayoff: linha.vagaPlayoff, vitorias: linha.vitorias, derrotas: linha.derrotas };
  temporada.estatisticasTime = { ataque: linha.ataque, defesa: linha.defesa, rankingAtaque: linha.rankingAtaque, rankingDefesa: linha.rankingDefesa, aproveitamento: +(linha.winPct * 100).toFixed(1) };
  temporada.tabelasConferencia = { Leste: resumoConferencia(tabela, "Leste"), Oeste: resumoConferencia(tabela, "Oeste") };
  temporada.calendarioMensal = resumirCalendarioMensal(temporada.jogos.filter((j) => j.resolvido));
  temporada.ledgerResumo = Object.fromEntries(TIMES.map((time) => {
    const linhaLedger = temporada.ledger.equipes[time.nome];
    return [time.nome, { forma: [...linhaLedger.forma], meses: linhaLedger.meses }];
  }));
  temporada.corridaPremios = corridaPremiosDoLedger(temporada);
  return temporada;
}

function criarTemporadaProgressiva(jogador) {
  if (jogador.contexto !== "nba" || !jogador.time) return null;
  const temporada = {
    progressiva: true,
    jogos: criarAgendaDaTemporada(jogador),
    registros: criarRegistrosDaLiga(),
    ledger: criarLedgerDaLiga(jogador),
    proximoIndice: 0,
    vitorias: 0,
    derrotas: 0,
    medias: { pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0 },
    mvpsDePartida: 0,
    desempenhoMedio: 0,
    jogosJogados: 0,
    playoffs: null,
    premios: null,
    draft: null,
    mundoLiga: null,
    historicoLiga: null,
    noiteHistoricaRealizada: false,
    finalizada: false,
  };
  return atualizarResumoProgressivo(jogador, temporada);
}

function resolverProximoJogoDaTemporada(jogador, temporada, decisao) {
  if (!temporada || !temporada.progressiva || temporada.finalizada) return null;
  garantirLedgerDaTemporada(jogador, temporada);
  const indice = temporada.proximoIndice;
  const jogo = temporada.jogos[indice];
  if (!jogo) return null;
  // A decisão é recebida antes de qualquer rolagem. O resultado, as
  // estatísticas e a campanha da liga nascem dela — nunca são remendados
  // depois do placar.
  const escolha = typeof decisao === "string" ? { preparacao: decisao } : (decisao || {});
  const preparacao = escolha.preparacao || null;
  const abordagem = escolha.abordagem || "equilibrado";
  const minutos = escolha.minutos || "normal";
  const matchup = escolha.matchup || "padrao";
  const clutch = escolha.clutch || null;
  const clutchInfo = escolha.clutchInfo || null;
  const ajustePreparacao = preparacao === "treino" ? 5 : preparacao === "filme" ? 2 : preparacao === "descanso" ? 1 : 0;
  if (preparacao === "treino") jogador.energia = Math.max(0, jogador.energia - 3);
  if (preparacao === "filme") jogador.energia = Math.max(0, jogador.energia - 1);
  if (preparacao === "descanso") jogador.energia = Math.min(100, jogador.energia + 5);
  // Recuperação é uma consequência real: a partida acontece, mas sem o
  // jogador. A escolha de voltar cedo mantém risco de agravamento abaixo.
  if (jogador.lesaoAtiva && jogador.lesaoAtiva.jogosRestantes > 0) {
    const forcaSemJogador = jogador.time.forca - 4;
    const venceu = Math.random() < chanceVitoria(forcaSemJogador, jogo.adversario.forca);
    const pontosTime = Math.round(92 + forcaSemJogador * .32 + Math.random() * 18);
    const pontosAdversario = Math.max(78, pontosTime + (venceu ? -(3 + Math.floor(Math.random() * 13)) : 3 + Math.floor(Math.random() * 13)));
    jogador.lesaoAtiva.jogosRestantes--;
    if (!jogador.lesaoAtiva.jogosRestantes) jogador.lesaoAtiva = null;
    Object.assign(jogo, { venceu, pontosTime, pontosAdversario, stats: null, fora: true, motivoAusencia: "recuperação médica", desempenhoJogo: 0, preparacaoAplicada: preparacao, resolvido: true });
    atualizarOutrosJogosDaRodada(temporada, jogador.time, jogo.adversario, venceu, pontosTime, pontosAdversario, jogo.mes, null);
    temporada.proximoIndice++;
    atualizarResumoProgressivo(jogador, temporada);
    return jogo;
  }
  const efeitoPressao = jogo.pressao > 15 ? (Math.random() < .52 ? -Math.round(jogo.pressao * .28) : Math.round(jogo.pressao * .17)) : Math.round(jogo.pressao * .1);
  const ajusteAbordagem = abordagem === "agressivo" ? 3 : abordagem === "coletivo" ? 1 : abordagem === "defensivo" ? 2 : 0;
  const ajusteMinutos = minutos === "carga" ? 4 : minutos === "controle" ? -2 : 0;
  const ajusteMatchup = matchup === "estrela" ? 2 : matchup === "proteger-aro" ? 1 : 0;
  const ajusteClutch = clutch === "isolar" ? (jogador.atual.criacao + jogador.atual.arremesso) / 35 - 4 : clutch === "pick" ? (jogador.atual.criacao + jogador.atual.qiBasquete) / 36 - 4 : clutch === "infiltrar" ? jogador.atual.atletismo / 19 - 4 : clutch === "passe" ? jogador.atual.qiBasquete / 21 - 4 : 0;
  if (minutos === "carga") jogador.energia = Math.max(0, jogador.energia - 5);
  if (minutos === "controle") jogador.energia = Math.min(100, jogador.energia + 2);
  const agravou = jogador.lesaoAtiva && jogador.lesaoAtiva.riscoRetorno && Math.random() < .22;
  if (agravou) jogador.lesaoAtiva = { jogosRestantes: 6 + Math.floor(Math.random() * 8), riscoRetorno: false, descricao: "agravamento após retorno antecipado" };
  const penalidadeLesao = agravou ? 13 : jogador.lesaoAtiva && jogador.lesaoAtiva.riscoRetorno ? 4 : 0;
  const desempenhoJogo = Math.max(35, Math.min(100, simularDesempenho(jogador) + efeitoPressao + ajustePreparacao + ajusteAbordagem + ajusteMinutos + ajusteMatchup + ajusteClutch - penalidadeLesao));
  const forcaJogador = forcaEfetivaJogador(jogador) + (preparacao === "filme" ? .8 : preparacao === "treino" ? .5 : 0) + (abordagem === "coletivo" ? 1.4 : abordagem === "agressivo" ? .8 : 0) + (matchup === "estrela" ? .7 : matchup === "proteger-aro" ? .45 : 0) + ajusteMinutos * .35;
  const noiteHistorica = sortearNoiteHistorica(jogador, desempenhoJogo, temporada.noiteHistoricaRealizada);
  if (noiteHistorica) temporada.noiteHistoricaRealizada = true;
  let venceu = noiteHistorica ? Math.random() < .93 : Math.random() < chanceVitoria(forcaJogador, jogo.adversario.forca);
  const stats = estatisticasDoJogo(jogador, desempenhoJogo);
  if (noiteHistorica) aplicarNoiteHistorica(stats, noiteHistorica);
  if (preparacao === "filme") { stats.assistencias *= 1.08; stats.roubos *= 1.1; }
  if (preparacao === "treino") stats.pontos *= 1.06;
  if (abordagem === "agressivo") { stats.pontos *= 1.16; stats.assistencias *= .88; }
  if (abordagem === "coletivo") { stats.pontos *= .9; stats.assistencias *= 1.2; }
  if (abordagem === "defensivo") { stats.roubos *= 1.35; stats.tocos *= 1.35; stats.rebotes *= 1.1; }
  if (minutos === "carga") Object.keys(stats).forEach((chave) => { stats[chave] *= 1.1; });
  if (minutos === "controle") Object.keys(stats).forEach((chave) => { stats[chave] *= .88; });
  if (matchup === "estrela") { stats.roubos *= 1.2; stats.assistencias *= 1.05; }
  if (matchup === "proteger-aro") { stats.tocos *= 1.4; stats.rebotes *= 1.1; }
  Object.keys(stats).forEach((chave) => { stats[chave] = +stats[chave].toFixed(1); });
  let pontosTime = Math.round(96 + forcaJogador * .32 + Math.random() * 18);
  let pontosAdversario = Math.max(78, pontosTime + (venceu ? -(3 + Math.floor(Math.random() * 13)) : 3 + Math.floor(Math.random() * 13)));
  let clutchResultado = null;
  if (clutch && clutchInfo) {
    const estadoMental = ((jogador.energia || 50) - 50) / 260 + ((jogador.confiancaTecnico || 50) - 50) / 300 + ((jogador.apoioTorcida || 50) - 50) / 420 + ((jogador.reputacao || 50) - 50) / 500;
    const sucesso = Math.random() < Math.max(.18, Math.min(.84, .46 + ajusteClutch / 18 + estadoMental));
    const pontosDaPosse = clutch === "isolar" && Math.random() < .34 ? 3 : 2;
    pontosAdversario = clutchInfo.placarAdversario;
    pontosTime = sucesso ? clutchInfo.placarSeu + pontosDaPosse : clutchInfo.placarSeu;
    if (pontosTime === pontosAdversario) { pontosTime += sucesso ? 4 : 0; pontosAdversario += sucesso ? 2 : 1; }
    if (!sucesso && Math.random() < .35) pontosAdversario += 2;
    venceu = pontosTime > pontosAdversario;
    clutchResultado = { sucesso, tipo: clutch, segundos: clutchInfo.segundos, pontosDaPosse };
  }
  Object.assign(jogo, { venceu, pontosTime, pontosAdversario, stats, noiteHistorica, desempenhoJogo, preparacaoAplicada: preparacao, decisaoAplicada: { abordagem, minutos, matchup, clutch }, clutchResultado, agravouLesao: agravou, resolvido: true });
  jogador.time.rivalidadesDinamicas = jogador.time.rivalidadesDinamicas || {};
  const margem = Math.abs(pontosTime - pontosAdversario);
  if (jogo.rivalidade || margem <= 4) {
    jogador.time.rivalidadesDinamicas[jogo.adversario.nome] = (jogador.time.rivalidadesDinamicas[jogo.adversario.nome] || 0) + (jogo.rivalidade ? 2 : 1);
    if (jogador.time.rivalidadesDinamicas[jogo.adversario.nome] >= 6 && !jogador.time.rivais.includes(jogo.adversario.nome)) jogador.time.rivais.push(jogo.adversario.nome);
  }
  atualizarOutrosJogosDaRodada(temporada, jogador.time, jogo.adversario, venceu, pontosTime, pontosAdversario, jogo.mes, { time: jogador.time.nome, stats });
  temporada.proximoIndice++;
  atualizarResumoProgressivo(jogador, temporada);
  return jogo;
}

function finalizarTemporadaProgressiva(jogador, temporada) {
  if (!temporada || !temporada.progressiva || temporada.finalizada || temporada.proximoIndice < JOGOS_POR_TEMPORADA) return temporada;
  const tabela = temporada.tabelaCompleta;
  const resultadoPlayoffs = simularPlayoffsLiga(tabela, jogador);
  temporada.playoffs = tabela.find((linha) => linha.time.nome === jogador.time.nome).vagaPlayoff
    ? { ...resultadoPlayoffs.caminhoJogador, series: resultadoPlayoffs.seriesJogador, chaveCompleta: resultadoPlayoffs.chaveCompleta, campeaoLeste: resultadoPlayoffs.campeaoLeste, campeaoOeste: resultadoPlayoffs.campeaoOeste }
    : null;
  temporada.chavePlayoffs = resultadoPlayoffs.chaveCompleta;
  temporada.draft = gerarDraftAnual(tabela);
  temporada.premios = calcularPremiosDoLedger(temporada, resultadoPlayoffs);
  temporada.comparacaoPosicao = compararComTitularesDaPosicao(jogador, temporada.medias);
  atualizarForcasAposTemporada(tabela, temporada.draft);
  temporada.mundoLiga = global.CB && global.CB.avancarMundoLiga ? global.CB.avancarMundoLiga(temporada.draft) : null;
  temporada.historicoLiga = global.CB && global.CB.registrarHistoricoLiga ? global.CB.registrarHistoricoLiga({ ...temporada.premios, draft: temporada.draft }) : null;
  temporada.finalizada = true;
  return temporada;
}

// Caminho automático do mesmo motor progressivo. Assim, jogo a jogo,
// automático e carreira completa registram exatamente o mesmo calendário,
// ledger, tabela, playoffs, draft e prêmios; só muda quem aciona as rodadas.
function resolverTemporadaAutomatica(jogador) {
  const temporada = criarTemporadaProgressiva(jogador);
  if (!temporada) return null;
  while (temporada.proximoIndice < JOGOS_POR_TEMPORADA) {
    resolverProximoJogoDaTemporada(jogador, temporada, { abordagem: "equilibrado", minutos: "normal", matchup: "padrao", descanso: "normal" });
  }
  return finalizarTemporadaProgressiva(jogador, temporada);
}

function calcularPremiosDoLedger(temporada, resultadoPlayoffs) {
  const corrida = corridaPremiosDoLedger(temporada);
  const mvp = corrida.mvp[0];
  const dpoy = corrida.dpoy[0];
  const roy = corrida.roy[0];
  const timeDe = (candidato) => TIMES.find((time) => time.nome === candidato.time);
  // Sexto homem vem de atletas que não são a primeira estrela da franquia;
  // o score permanece baseado no mesmo ledger de produção e campanha.
  const sexto = corrida.mvp.find((c) => c.nome !== (timeDe(c) || {}).estrelas?.[0]) || corrida.mvp[1] || mvp;
  const mapear = (lista) => lista.slice(0, 5).map((c) => ({ nome: c.nome, time: c.time, imagem: c.imagem, impacto: c.impacto }));
  return {
    mvpDaLiga: mvp.nome, mvpTime: timeDe(mvp), dpoyDaLiga: dpoy.nome, dpoyTime: timeDe(dpoy),
    sextoHomemDaLiga: sexto.nome, sextoHomemTime: timeDe(sexto), novatoDoAno: roy ? roy.nome : "—", novatoTime: roy ? timeDe(roy) : null,
    campeao: resultadoPlayoffs.campeao, campeaoNome: resultadoPlayoffs.campeao.nome, campeaoLeste: resultadoPlayoffs.campeaoLeste, campeaoOeste: resultadoPlayoffs.campeaoOeste,
    candidatosOrdenados: corrida.mvp.map((c) => ({ nome: c.nome, impacto: c.impacto })),
    candidatosDpoyOrdenados: corrida.dpoy.map((c) => ({ nome: c.nome, impacto: c.impacto })),
    corridaPremios: { mvp: mapear(corrida.mvp), dpoy: mapear(corrida.dpoy), roy: mapear(corrida.roy), allStar: mapear(corrida.allStar) },
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
    const vencedor = jogarSerie(a, b, jogador);
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
    const vencedor = jogarSerie(a, b, jogador);
    caminho = rastrearEliminacao(jogador, a, b, vencedor, RODADAS[1], caminho);
    registrarSerieJogador(jogador, a, b, vencedor, RODADAS[1], seriesJogador);
    registrarSerieChave(a, b, vencedor, RODADAS[1], nomeConf, chaveCompleta);
    return vencedor;
  });

  const campeaoConf = jogarSerie(chave[0], chave[1], jogador);
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

  const campeao = jogarSerie(leste.campeao, oeste.campeao, jogador);
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
  criarTemporadaProgressiva,
  resolverTemporadaAutomatica,
  resolverProximoJogoDaTemporada,
  finalizarTemporadaProgressiva,
  estatisticasDoJogo,
  sortearNoiteHistorica,
  aplicarNoiteHistorica,
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
