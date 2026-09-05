// carreira.js
// Papel no time, prêmios individuais, veredito final e carta compartilhável.
(function (global) {

const dados =
  typeof module !== "undefined" && module.exports
    ? require("./data.js")
    : global.CB;

const { ATRIBUTOS } = dados;

const PAPEIS = {
  titular: { id: "titular", label: "Titular", minutos: 1.0, tradeMod: 10 },
  sexto: { id: "sexto", label: "Sexto homem", minutos: 0.72, tradeMod: 0 },
  banco: { id: "banco", label: "Banco", minutos: 0.48, tradeMod: -14 },
};

const VEREDITOS = [
  { id: "fenomeno", titulo: "O FENÔMENO", min: 130, cor: "#c8102e" },
  { id: "hof", titulo: "Hall of Fame", min: 90, cor: "#ffb648" },
  { id: "allstar", titulo: "All-Star", min: 55, cor: "#7eb6ff" },
  { id: "titular", titulo: "Titular sólido", min: 32, cor: "#e9edf2" },
  { id: "role", titulo: "Role player", min: 16, cor: "#8b97ad" },
  { id: "journeyman", titulo: "Journeyman", min: 0, cor: "#5c6a82" },
];

function overallDe(mapa) {
  return ATRIBUTOS.reduce((s, a) => s + mapa[a], 0) / ATRIBUTOS.length;
}

// times.js comprime força de time pra faixa 73-90 (era 60-99 antes do
// rebalanceamento). Overall de jogador continua na escala original dos
// atributos roubados (pode passar de 90 no pico, ou ficar nos 40 no
// início da carreira). Sem normalizar pra mesma janela, qualquer
// comparação direta overall-vs-forca fica sistematicamente distorcida.
const OVERALL_ESCALA_MIN = 60;
const OVERALL_ESCALA_MAX = 99;
const FORCA_ESCALA_MIN = 73;
const FORCA_ESCALA_MAX = 90;

function normalizarOverallParaForca(overall) {
  const clamped = Math.max(OVERALL_ESCALA_MIN, Math.min(OVERALL_ESCALA_MAX, overall));
  const pct = (clamped - OVERALL_ESCALA_MIN) / (OVERALL_ESCALA_MAX - OVERALL_ESCALA_MIN);
  return FORCA_ESCALA_MIN + pct * (FORCA_ESCALA_MAX - FORCA_ESCALA_MIN);
}

function initCarreiraPro(jogador) {
  if (!jogador.premiosCarreira) {
    jogador.premiosCarreira = {
      aneis: 0,
      mvp: 0,
      dpoy: 0,
      roy: 0,
      allStar: 0,
      allNba: 0,
      allNba1: 0,
      sixthMan: 0,
      finaisMvp: 0,
    };
  }
  if (!jogador.historicoPremios) jogador.historicoPremios = [];
  if (!jogador.historicoLesoes) jogador.historicoLesoes = [];
  if (jogador.reputacao === undefined) jogador.reputacao = 50;
  if (jogador.confiancaTecnico === undefined) jogador.confiancaTecnico = 50;
  if (jogador.apoioTorcida === undefined) jogador.apoioTorcida = 50;
  if (jogador.impulsoTitular === undefined) jogador.impulsoTitular = 0;
  if (jogador.penalidadeMinutos === undefined) jogador.penalidadeMinutos = 0;
  if (jogador.pressao === undefined) jogador.pressao = 0;
  if (jogador.energia === undefined) jogador.energia = 75;
  if (jogador.interesseMercado === undefined) jogador.interesseMercado = 0;
  if (jogador.relacaoImprensa === undefined) jogador.relacaoImprensa = 50;
  if (jogador.lesaoAtiva === undefined) jogador.lesaoAtiva = null;
  if (!jogador.historicoForma) jogador.historicoForma = [];
  if (!jogador.historicoDecisoes) jogador.historicoDecisoes = [];
  const estatisticasPadrao = {
    jogos: 0, pontos: 0, rebotes: 0, assistencias: 0, roubos: 0, tocos: 0,
    arremessosConvertidos: 0, arremessosTentados: 0, tresConvertidas: 0, tresTentadas: 0,
    lancesLivresConvertidos: 0, lancesLivresTentados: 0, turnovers: 0, minutos: 0,
    doubleDoubles: 0, tripleDoubles: 0,
  };
  jogador.estatisticasCarreira = { ...estatisticasPadrao, ...(jogador.estatisticasCarreira || {}) };
  // Saves anteriores não tinham um recorte por liga; partimos do total já
  // salvo uma única vez e, daqui em diante, a contagem NBA é independente.
  jogador.estatisticasNba = { ...estatisticasPadrao, ...(jogador.estatisticasNba || jogador.estatisticasCarreira) };
  // Progresso de recordes de temporada nunca é acumulado entre anos. A melhor
  // marca histórica vive em outro mapa, mantido pelo módulo profissional.
  if (!jogador.recordesTemporadaAtualNBA) jogador.recordesTemporadaAtualNBA = {};
  if (!jogador.papel) jogador.papel = sugerirPapel(jogador);
  if (!jogador.contrato) {
    jogador.contrato = {
      anosRestantes: jogador.contexto === "gleague" ? 1 : 3,
      papelGarantido: jogador.papel,
    };
  }
  if (jogador.temporadasNba === undefined) jogador.temporadasNba = 0;
  return jogador;
}

function sugerirPapel(jogador) {
  if (!jogador.time || jogador.contexto !== "nba") return "titular";
  const overallNorm = normalizarOverallParaForca(overallDe(jogador.atual));
  const encaixe = jogador.time && global.CB && global.CB.encaixeJogadorNoTime
    ? global.CB.encaixeJogadorNoTime(jogador, jogador.time).total
    : 0;
  // A confiança do técnico desloca a disputa por minutos: boa leitura
  // coletiva abre espaço mesmo para quem ainda está abaixo do overall do time.
  const compatível = (atleta) => atleta.posicao === jogador.posicao ||
    (atleta.posicao === "G" && ["PG", "SG"].includes(jogador.posicao)) ||
    (atleta.posicao === "F" && ["SF", "PF"].includes(jogador.posicao));
  const concorrentes = (jogador.time.jogadores || [])
    .filter((atleta) => !atleta.usuario && compatível(atleta))
    .sort((a, b) => b.overall - a.overall);
  const melhorDaPosicao = concorrentes[0] ? concorrentes[0].overall : jogador.time.forca;
  const segundoDaPosicao = concorrentes[1] ? concorrentes[1].overall : melhorDaPosicao - 5;
  const gap = overallNorm - melhorDaPosicao + encaixe +
    (jogador.confiancaTecnico - 50) * 0.15 +
    (jogador.impulsoTitular || 0) * 0.8 - (jogador.penalidadeMinutos || 0) * 4;
  if (gap >= -3) return "titular";
  if (overallNorm - segundoDaPosicao + encaixe >= -7) return "sexto";
  return "banco";
}

function infoPapel(papelId) {
  return PAPEIS[papelId] || PAPEIS.titular;
}

function multiplicadorMinutos(jogador) {
  return infoPapel(jogador.papel).minutos;
}

// Lesão: chance sobe com idade e minutos (titulares se expõem mais).
function sortearLesao(jogador) {
  const idade = jogador.idade || 22;
  const minutos = multiplicadorMinutos(jogador);
  let chance = 0.08 + Math.max(0, idade - 28) * 0.015 + minutos * 0.04;
  if (jogador.contexto !== "nba") chance *= 0.6;
  if (Math.random() > chance) return null;

  const gravidade = Math.random();
  let jogosPerdidos;
  let tipo;
  if (gravidade < 0.55) {
    tipo = "leve";
    jogosPerdidos = 8 + Math.floor(Math.random() * 12);
  } else if (gravidade < 0.85) {
    tipo = "moderada";
    jogosPerdidos = 20 + Math.floor(Math.random() * 16);
  } else {
    tipo = "grave";
    jogosPerdidos = 40 + Math.floor(Math.random() * 25);
  }
  jogosPerdidos = Math.min(70, jogosPerdidos);
  return { tipo, jogosPerdidos };
}

function aplicarMinutosNasMedias(medias, minutos) {
  return {
    pontos: +(medias.pontos * minutos).toFixed(1),
    rebotes: +(medias.rebotes * minutos).toFixed(1),
    assistencias: +(medias.assistencias * minutos).toFixed(1),
    roubos: +(medias.roubos * minutos).toFixed(1),
    tocos: +(medias.tocos * minutos).toFixed(1),
  };
}

function impactoOfensivo(medias) {
  return medias.pontos + medias.rebotes * 1.15 + medias.assistencias * 1.45 + (medias.roubos + medias.tocos) * 2.2;
}

function impactoDefensivo(jogador, medias) {
  const def = jogador.atual.defesa || 70;
  return def * 0.35 + medias.roubos * 18 + medias.tocos * 20 + medias.rebotes * 0.8;
}

// Avalia prêmios do JOGADOR nesta temporada (além do MVP de liga genérico).
function avaliarPremiosIndividuais(jogador, relatorio) {
  const out = {
    allStar: false,
    allNba: null, // 1 | 2 | 3
    dpoy: false,
    roy: false,
    sixthMan: false,
    mvp: false,
    anel: false,
  };

  if (jogador.contexto !== "nba" || !relatorio || !relatorio.medias) return out;

  const medias = relatorio.medias;
  const impacto = impactoOfensivo(medias);
  const jogos = 82 - (relatorio.lesao ? relatorio.lesao.jogosPerdidos : 0);
  const elegivel = jogos >= 45;
  const papel = jogador.papel || "titular";

  if (!elegivel) return out;

  // Ranking real contra o campo de candidatos da liga (mesmo pool usado
  // pro MVP), quando disponível. Isso evita que All-Star/All-NBA sejam
  // concedidos só por bater um número fixo, sem checar concorrência —
  // e junto com isso corrige o All-NBA nunca ter chance de falhar.
  const candidatos = relatorio.premios && relatorio.premios.candidatosOrdenados;
  let rank = null;
  if (candidatos && candidatos.length) {
    const idx = candidatos.findIndex((c) => c.nome === jogador.nome);
    if (idx !== -1) rank = idx + 1;
  }

  if (rank !== null) {
    // All-Star: top do pool de candidatos, ainda com chance de falhar.
    if (rank <= 10) {
      out.allStar = Math.random() < Math.min(0.9, 0.5 + (11 - rank) * 0.04);
    }
    // All-NBA: só quem está no topo do ranking disputa, e mesmo assim
    // não é garantido — cada faixa tem uma chance real de ficar de fora.
    if (rank <= 3) {
      if (Math.random() < 0.8) out.allNba = 1;
    } else if (rank <= 6) {
      if (Math.random() < 0.6) out.allNba = 2;
    } else if (rank <= 9) {
      if (Math.random() < 0.45) out.allNba = 3;
    }
  } else {
    // Sem dado de ranking (ex: fallback), volta pro threshold antigo,
    // mas com o mesmo princípio de nunca ser garantido.
    if (impacto >= 28 || (impacto >= 22 && papel === "titular")) {
      out.allStar = Math.random() < Math.min(0.9, 0.35 + impacto / 80);
    }
    if (impacto >= 38) {
      if (Math.random() < 0.75) out.allNba = Math.random() < 0.6 ? 1 : 2;
    } else if (impacto >= 32) {
      if (Math.random() < 0.55) out.allNba = Math.random() < 0.4 ? 2 : 3;
    } else if (impacto >= 26 && papel === "titular") {
      if (Math.random() < 0.3) out.allNba = 3;
    }
  }

  // Prêmios únicos da liga: a carreira só registra o que a classificação
  // exibida pela própria temporada já definiu. Isso impede vencedores
  // diferentes entre o painel de prêmios e o histórico do jogador.
  if (relatorio.premios) {
    out.mvp = relatorio.premios.mvpDaLiga === jogador.nome;
    out.dpoy = relatorio.premios.dpoyDaLiga === jogador.nome;
    out.sixthMan = relatorio.premios.sextoHomemDaLiga === jogador.nome;
    out.roy = relatorio.premios.novatoDoAno === jogador.nome;
  }

  if (relatorio.playoffs && relatorio.playoffs.campeao) {
    out.anel = true;
  }

  return out;
}

function acumularPremios(jogador, individuais, temporadaLabel) {
  const p = jogador.premiosCarreira;
  const ganhos = [];

  if (individuais.anel) {
    p.aneis++;
    ganhos.push("Anel de campeão");
    // MVP das Finais é elegível apenas para o campeão; impacto alto torna a
    // conquista provável, mas não automática.
    if (Math.random() < 0.42) { p.finaisMvp = (p.finaisMvp || 0) + 1; ganhos.push("MVP das Finais"); }
  }
  if (individuais.mvp) {
    p.mvp++;
    ganhos.push("MVP");
  }
  if (individuais.dpoy) {
    p.dpoy++;
    ganhos.push("DPOY");
  }
  if (individuais.roy) {
    p.roy++;
    ganhos.push("Novato do Ano");
  }
  if (individuais.allStar) {
    p.allStar++;
    ganhos.push("All-Star");
  }
  if (individuais.allNba) {
    p.allNba++;
    if (individuais.allNba === 1) p.allNba1++;
    ganhos.push(`All-NBA ${individuais.allNba}ª equipe`);
  }
  if (individuais.sixthMan) {
    p.sixthMan++;
    ganhos.push("Sexto Homem do Ano");
  }

  if (ganhos.length) {
    jogador.historicoPremios.push({ temporada: temporadaLabel, ganhos });
  }
  return ganhos;
}

function pontuacaoCarreira(jogador) {
  const p = jogador.premiosCarreira || {};
  let pts = 0;
  pts += (p.aneis || 0) * 28;
  pts += (p.mvp || 0) * 22;
  pts += (p.dpoy || 0) * 14;
  pts += (p.roy || 0) * 8;
  pts += (p.allStar || 0) * 4;
  pts += (p.allNba || 0) * 7;
  pts += (p.allNba1 || 0) * 5;
  pts += (p.sixthMan || 0) * 6;
  pts += Math.max(0, (jogador.picoOverall || 0) - 78) * 2.2;
  pts += Math.min(12, (jogador.temporadasNba || 0) * 0.6);
  const times = (jogador.historicoTimes || []).length;
  if (times >= 5) pts -= 6; // journeyman tax leve
  return Math.round(pts);
}

function calcularVeredito(jogador) {
  const pts = pontuacaoCarreira(jogador);
  const veredito = VEREDITOS.find((v) => pts >= v.min) || VEREDITOS[VEREDITOS.length - 1];
  return { ...veredito, pontos: pts };
}

function montarResumoCarreira(jogador) {
  const veredito = calcularVeredito(jogador);
  const p = jogador.premiosCarreira || {};
  return {
    nome: jogador.nome,
    posicao: jogador.posicao,
    altura: jogador.altura,
    peso: jogador.peso,
    idadeFinal: jogador.idade,
    pico: jogador.picoOverall,
    overallFinal: Math.round(overallDe(jogador.atual)),
    temporadas: Math.max(0, (jogador.temporada || 1) - 1),
    temporadasNba: jogador.temporadasNba || 0,
    timeFinal: jogador.time ? jogador.time.nome : "—",
    timeFinalImg: jogador.time ? jogador.time.imagem : null,
    times: jogador.historicoTimes || [],
    premios: p,
    veredito,
    universidade: jogador.universidade ? jogador.universidade.nome : null,
  };
}

function desenharCartaCarreira(canvas, resumo) {
  const ctx = canvas.getContext("2d");
  const w = 720;
  const h = 960;
  canvas.width = w;
  canvas.height = h;

  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#0c1f4a");
  grd.addColorStop(0.45, "#050910");
  grd.addColorStop(1, "#1a0a10");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // faixa NBA
  const faixa = ctx.createLinearGradient(0, 0, w, 0);
  faixa.addColorStop(0, "#c8102e");
  faixa.addColorStop(0.5, "#ffffff");
  faixa.addColorStop(1, "#1d428a");
  ctx.fillStyle = faixa;
  ctx.fillRect(0, 0, w, 8);

  ctx.fillStyle = "#c8102e";
  ctx.font = "700 18px DM Sans, sans-serif";
  ctx.fillText("carrer baska · CARREIRA NBA", 40, 48);

  ctx.fillStyle = "#ffffff";
  ctx.font = "400 64px Anton, sans-serif";
  ctx.fillText(String(resumo.nome).toUpperCase().slice(0, 18), 40, 120);

  ctx.fillStyle = "#8b97ad";
  ctx.font = "500 20px DM Sans, sans-serif";
  ctx.fillText(
    `${resumo.posicao || ""} · ${resumo.altura || "—"}cm · aposentado aos ${resumo.idadeFinal}`,
    40,
    155
  );

  // Veredito box
  ctx.fillStyle = "rgba(200,16,46,0.18)";
  roundRect(ctx, 40, 185, w - 80, 110, 18);
  ctx.fill();
  ctx.fillStyle = resumo.veredito.cor;
  ctx.font = "400 42px Anton, sans-serif";
  ctx.fillText(resumo.veredito.titulo, 60, 250);
  ctx.fillStyle = "#8b97ad";
  ctx.font = "500 16px DM Sans, sans-serif";
  ctx.fillText(`Score de carreira ${resumo.veredito.pontos}`, 60, 278);

  // Stats grid
  const stats = [
    ["Pico OVR", String(resumo.pico)],
    ["OVR final", String(resumo.overallFinal)],
    ["Anéis", String(resumo.premios.aneis || 0)],
    ["MVP", String(resumo.premios.mvp || 0)],
    ["All-Star", String(resumo.premios.allStar || 0)],
    ["All-NBA", String(resumo.premios.allNba || 0)],
    ["DPOY", String(resumo.premios.dpoy || 0)],
    ["Temporadas", String(resumo.temporadasNba || resumo.temporadas)],
  ];

  let x = 40;
  let y = 330;
  stats.forEach((s, i) => {
    if (i === 4) {
      x = 40;
      y = 430;
    }
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, x, y, 150, 78, 14);
    ctx.fill();
    ctx.fillStyle = "#8b97ad";
    ctx.font = "600 12px DM Sans, sans-serif";
    ctx.fillText(s[0].toUpperCase(), x + 14, y + 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "400 32px Anton, sans-serif";
    ctx.fillText(s[1], x + 14, y + 62);
    x += 165;
  });

  // Times
  ctx.fillStyle = "#8b97ad";
  ctx.font = "700 12px DM Sans, sans-serif";
  ctx.fillText("TIMES", 40, 550);
  ctx.fillStyle = "#e9edf2";
  ctx.font = "500 18px DM Sans, sans-serif";
  const timesTxt = (resumo.times || [])
    .map((t) => t.nome)
    .slice(0, 6)
    .join("  ·  ") || resumo.timeFinal;
  wrapText(ctx, timesTxt, 40, 580, w - 80, 26);

  ctx.fillStyle = "#5c6a82";
  ctx.font = "500 14px DM Sans, sans-serif";
  ctx.fillText("carrer baska · career card", 40, h - 36);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth && n > 0) {
      ctx.fillText(line, x, yy);
      line = words[n] + " ";
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

async function baixarCartaCarreira(resumo) {
  const canvas = document.createElement("canvas");
  desenharCartaCarreira(canvas, resumo);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `baska-${String(resumo.nome).toLowerCase().replace(/\s+/g, "-")}-carreira.png`;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    });
  });
}

async function copiarResumoCarreira(resumo) {
  const p = resumo.premios;
  const texto = [
    `${resumo.nome} — ${resumo.veredito.titulo}`,
    `Pico ${resumo.pico} · Anéis ${p.aneis || 0} · MVP ${p.mvp || 0} · All-Star ${p.allStar || 0}`,
    `All-NBA ${p.allNba || 0} · DPOY ${p.dpoy || 0} · Temporadas NBA ${resumo.temporadasNba}`,
    `Times: ${(resumo.times || []).map((t) => t.nome).join(", ") || resumo.timeFinal}`,
    `Joguei no carrer baska.`,
  ].join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(texto);
    return true;
  }
  return false;
}

const api = {
  PAPEIS,
  VEREDITOS,
  initCarreiraPro,
  sugerirPapel,
  infoPapel,
  multiplicadorMinutos,
  sortearLesao,
  aplicarMinutosNasMedias,
  avaliarPremiosIndividuais,
  acumularPremios,
  pontuacaoCarreira,
  calcularVeredito,
  montarResumoCarreira,
  desenharCartaCarreira,
  baixarCartaCarreira,
  copiarResumoCarreira,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);
