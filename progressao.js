// progressao.js
// Sistema de progressão de atributos: transforma o resultado do draft
// (que agora é o TETO/potencial) num jogador que começa abaixo disso
// e evolui por temporada, conforme desempenho simulado e curva de idade.
(function (global) {

const dados =
  typeof module !== "undefined" && module.exports
    ? require("./data.js")
    : global.CB;

const { ATRIBUTOS } = dados;

const PERCENTUAL_INICIAL = 0.6; // jogador começa em 60% do potencial

// Cria o jogador de carreira a partir do resultado do draft de lendas.
// `potencial` é o objeto { arremesso: 93, ... } que saiu do engine.js.
function criarJogadorDaCarreira(potencial, idadeInicial = 18) {
  const atual = {};
  ATRIBUTOS.forEach((attr) => {
    atual[attr] = Math.round(potencial[attr] * PERCENTUAL_INICIAL);
  });
  const overallInicial = Math.round(
    ATRIBUTOS.reduce((soma, a) => soma + atual[a], 0) / ATRIBUTOS.length
  );

  return {
    potencial: { ...potencial },
    atual,
    idade: idadeInicial,
    idadeDeclinio: calcularIdadeDeclinio(potencial),
    picoOverall: overallInicial,
    temporada: 1,
    contexto: "universidade",
    historicoTemporadas: [],
  };
}

// Nível do jogador = média do potencial (teto) dos 5 atributos.
// Jogador mediano (nível ~75) começa a declinar aos 28.
// Jogador de elite (nível ~99) só declina perto dos 38 — raro por
// natureza, já que exige potencial altíssimo em tudo.
function calcularIdadeDeclinio(potencial) {
  const nivel = ATRIBUTOS.reduce((soma, a) => soma + potencial[a], 0) / ATRIBUTOS.length;
  return 28 + Math.max(0, nivel - 75) * 0.43;
}

// Faixa de crescimento por temporada, de acordo com a idade e a idade
// de início do declínio deste jogador específico.
// Retorna uma função (desempenho 0-100) => delta de pontos.
function funcaoCrescimentoPorIdade(idade, idadeDeclinio) {
  if (idade <= 22) {
    return (desempenho) => (desempenho / 100) * 8; // 0 a +8
  }
  if (idade <= 27) {
    return (desempenho) => (desempenho / 100) * 4; // 0 a +4
  }
  if (idade < idadeDeclinio) {
    return () => 0; // platô
  }
  // a partir da idade de declínio: -3 (desempenho ruim) a -1 (desempenho ótimo)
  return (desempenho) => -3 + (desempenho / 100) * 2;
}

// Simulação leve de desempenho da temporada: quanto melhor o jogador
// atual (média dos atributos atuais), maior a chance de ir bem — mas
// sempre com variância (sorte/azar da temporada).
function simularDesempenho(jogador) {
  const mediaAtual =
    ATRIBUTOS.reduce((soma, a) => soma + jogador.atual[a], 0) / ATRIBUTOS.length;
  const variacao = (Math.random() - 0.5) * 30; // +-15 de sorte/azar

  let penalidadeTime = 0;
  if (jogador.contexto === "nba" && jogador.time) {
    const mediaAtualNorm =
      global.CB && global.CB.normalizarOverallParaForca
        ? global.CB.normalizarOverallParaForca(mediaAtual)
        : mediaAtual;
    const diferenca = jogador.time.forca - mediaAtualNorm;
    penalidadeTime = Math.max(0, diferenca) * 0.5;
  }

  return Math.max(0, Math.min(100, Math.round(mediaAtual + variacao - penalidadeTime)));
}

// Aplica a progressão de uma temporada: calcula desempenho, aplica
// crescimento/declínio por atributo (nunca passando do potencial),
// envelhece o jogador em 1 ano, e registra no histórico.
function progredirTemporada(jogador, desempenhoForcado) {
  const desempenho = desempenhoForcado !== undefined ? desempenhoForcado : simularDesempenho(jogador);
  const crescer = funcaoCrescimentoPorIdade(jogador.idade, jogador.idadeDeclinio);
  let delta = crescer(desempenho);

  if (jogador.contexto === "universidade" && jogador.universidade) {
    delta *= jogador.universidade.crescimentoMultiplicador;
  }

  const crescimentos = {};
  ATRIBUTOS.forEach((attr) => {
    const antes = jogador.atual[attr];
    const depois = Math.max(0, Math.min(jogador.potencial[attr], antes + delta));
    jogador.atual[attr] = Math.round(depois);
    crescimentos[attr] = jogador.atual[attr] - antes;
  });

  const registro = {
    temporada: jogador.temporada,
    idade: jogador.idade,
    contexto: jogador.contexto,
    desempenho,
    crescimentos,
  };
  jogador.historicoTemporadas.push(registro);

  jogador.temporada += 1;
  jogador.idade += 1;

  const overallAtual = Math.round(
    ATRIBUTOS.reduce((soma, a) => soma + jogador.atual[a], 0) / ATRIBUTOS.length
  );
  if (overallAtual > jogador.picoOverall) {
    jogador.picoOverall = overallAtual;
  }
  registro.overallApos = overallAtual;

  return registro;
}

const api = {
  PERCENTUAL_INICIAL,
  criarJogadorDaCarreira,
  calcularIdadeDeclinio,
  funcaoCrescimentoPorIdade,
  simularDesempenho,
  progredirTemporada,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);