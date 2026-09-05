// Sanity checks estatísticos do motor. Não tentam fixar resultados exatos:
// verificam se a aleatoriedade preserva vantagem para a força superior.
const assert = require("assert");
const data = require("../data.js");
const times = require("../times.js");
const progressao = require("../progressao.js");
global.CB = { ...data, ...times, ...progressao };
const nba = require("../temporadanba.js");

const atributos = (overall) => ({ arremesso: overall, atletismo: overall, criacao: overall, qiBasquete: overall, defesa: overall });
const favorita = nba.probabilidadeVitoria({ contexto: "nba", time: { forca: 90 }, atual: atributos(90) });
const zebra = nba.probabilidadeVitoria({ contexto: "nba", time: { forca: 72 }, atual: atributos(72) });
assert(favorita > zebra, "um time mais forte precisa ter probabilidade maior");
assert(favorita >= .65 && favorita <= .78, "a vantagem de elite deve ser forte, sem eliminar zebras");
assert(zebra >= .22 && zebra <= .35, "a zebra deve continuar possível, mas rara");

let vitoriasFavorita = 0;
const AMOSTRA = 10000;
for (let i = 0; i < AMOSTRA; i++) if (Math.random() < favorita) vitoriasFavorita++;
const taxa = vitoriasFavorita / AMOSTRA;
assert(taxa > .62 && taxa < .81, "a distribuição observada saiu do intervalo aceitável");

console.log(`OK: balanceamento — favorito 90 OVR venceu ${(taxa * 100).toFixed(1)}% de ${AMOSTRA} jogos`);
