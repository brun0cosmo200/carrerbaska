// Testes de regressão sem dependências: execute `node tests/core.test.js`.
const assert = require("assert");
const data = require("../data.js");
const times = require("../times.js");
const progressao = require("../progressao.js");
global.CB = { ...data, ...times, ...progressao, multiplicadorMinutos: () => 1, avancarMundoLiga: () => null, registrarHistoricoLiga: () => null };
const nba = require("../temporadanba.js");

const jogador = {
  idCarreira: "teste-regressao", nome: "Teste", contexto: "nba", time: times.TIMES[0], posicao: "PG", idade: 22, energia: 80, temporadasNba: 0,
  atual: { arremesso: 82, atletismo: 80, criacao: 84, qiBasquete: 82, defesa: 81 }, planoTemporada: { estilo: "equilibrado" },
};
times.sincronizarJogadorDaCarreira(jogador);
assert(times.TIMES[0].jogadores.some((p) => p.usuario), "jogador deve entrar no roster");
const temporada = nba.criarTemporadaProgressiva(jogador);
for (let i = 0; i < 82; i++) nba.resolverProximoJogoDaTemporada(jogador, temporada, { abordagem: "equilibrado", minutos: "normal", matchup: "padrao" });
nba.finalizarTemporadaProgressiva(jogador, temporada);
assert.equal(temporada.ledger.equipes[jogador.time.nome].jogos, 82, "ledger deve fechar 82 jogos");
const boxScore = temporada.jogos.find((jogo) => jogo.stats).stats;
["arremessosConvertidos", "arremessosTentados", "tresConvertidas", "tresTentadas", "lancesLivresConvertidos", "lancesLivresTentados", "turnovers", "minutos"].forEach((campo) => {
  assert(Number.isFinite(boxScore[campo]), `box score deve registrar ${campo}`);
});
assert(boxScore.arremessosTentados >= boxScore.arremessosConvertidos, "tentativas de arremesso não podem ser menores que acertos");
assert(boxScore.tresTentadas >= boxScore.tresConvertidas, "tentativas de três não podem ser menores que acertos");
assert(temporada.draft && temporada.draft.length === 60, "draft anual deve ter 60 escolhas");
assert(temporada.premios.mvpDaLiga && temporada.premios.dpoyDaLiga, "prêmios devem derivar da temporada");

const jogadorAutomatico = {
  idCarreira: "teste-automatico", nome: "Automático", contexto: "nba", time: times.TIMES[1], posicao: "SG", idade: 23, energia: 84, temporadasNba: 1,
  atual: { arremesso: 80, atletismo: 82, criacao: 78, qiBasquete: 80, defesa: 78 }, planoTemporada: { estilo: "equilibrado" },
};

const jogadorComRival = {
  idCarreira: "teste-rival", nome: "Protagonista", rival: "Rival de Teste", contexto: "nba", time: times.TIMES[2], posicao: "SF", idade: 21, energia: 85,
  rivalVivo: { nome: "Rival de Teste", timeNome: times.TIMES[3].nome, overall: 82, potencial: 90, confrontos: { vitorias: 0, derrotas: 0 } },
  atual: { arremesso: 81, atletismo: 83, criacao: 80, qiBasquete: 79, defesa: 80 }, planoTemporada: { estilo: "equilibrado" },
};
const agendaComRival = nba.criarTemporadaProgressiva(jogadorComRival);
assert(agendaComRival.jogos.filter((jogo) => jogo.rivalPessoal).length >= 2, "rival pessoal deve ter ao menos dois confrontos garantidos na temporada regular");

times.sincronizarJogadorDaCarreira(jogadorAutomatico);
const automatica = nba.resolverTemporadaAutomatica(jogadorAutomatico);
assert.equal(automatica.jogosJogados, 82, "modo automático deve resolver os mesmos 82 jogos do motor progressivo");
assert(automatica.finalizada && automatica.ledger && automatica.draft && automatica.premios, "modo automático deve fechar ledger, draft e prêmios no motor único");
console.log("OK: temporada, ledger, prêmios, draft e roster");
