// data.js
// Dados estáticos do jogo: atributos, lendas, ligas.
// Nenhuma lógica de jogo aqui — só definição de conteúdo.
//
// Tudo fica isolado nesta IIFE e só é exposto via o namespace global CB.
// Isso evita colisão de identificador quando vários <script> soltos
// compartilham o mesmo escopo global no navegador.
(function (global) {

const ATRIBUTOS = ["arremesso", "atletismo", "criacao", "qiBasquete", "defesa"];

const NOMES_ATRIBUTOS = {
  arremesso: "Arremesso",
  atletismo: "Atletismo",
  criacao: "Criação",
  qiBasquete: "QI de Basquete",
  defesa: "Defesa",
};

// Cada lenda tem exatamente 2 atributos-marca registrada.
// Ao roubar um, o outro sai do tabuleiro (mecânica de trade-off).
// posicao é informativa (usada mais pra frente, no roster/time).
// valores: mapa { atributo: valor } cobrindo APENAS os 2 atributos-marca da lenda.
// curados à mão pra refletir o jogador real (escala 85-99).
const LENDAS = [
  { id: 1,  nome: "Michael Jordan",        posicao: "SG", marcas: ["arremesso", "atletismo"], valores: { arremesso: 93, atletismo: 97 } },
  { id: 2,  nome: "LeBron James",          posicao: "SF", marcas: ["atletismo", "qiBasquete"], valores: { atletismo: 96, qiBasquete: 96 } },
  { id: 3,  nome: "Kareem Abdul-Jabbar",   posicao: "C",  marcas: ["arremesso", "defesa"],      valores: { arremesso: 95, defesa: 90 } },
  { id: 4,  nome: "Magic Johnson",         posicao: "PG", marcas: ["qiBasquete", "criacao"],    valores: { qiBasquete: 98, criacao: 93 } },
  { id: 5,  nome: "Larry Bird",            posicao: "SF", marcas: ["arremesso", "qiBasquete"],  valores: { arremesso: 96, qiBasquete: 97 } },
  { id: 6,  nome: "Wilt Chamberlain",      posicao: "C",  marcas: ["atletismo", "defesa"],      valores: { atletismo: 99, defesa: 92 } },
  { id: 7,  nome: "Bill Russell",          posicao: "C",  marcas: ["defesa", "qiBasquete"],     valores: { defesa: 99, qiBasquete: 90 } },
  { id: 8,  nome: "Kobe Bryant",           posicao: "SG", marcas: ["arremesso", "criacao"],      valores: { arremesso: 95, criacao: 91 } },
  { id: 9,  nome: "Tim Duncan",            posicao: "PF", marcas: ["defesa", "qiBasquete"],     valores: { defesa: 96, qiBasquete: 93 } },
  { id: 10, nome: "Shaquille O'Neal",      posicao: "C",  marcas: ["atletismo", "defesa"],      valores: { atletismo: 97, defesa: 90 } },
  { id: 11, nome: "Hakeem Olajuwon",       posicao: "C",  marcas: ["criacao", "defesa"],        valores: { criacao: 94, defesa: 97 } },
  { id: 12, nome: "Karl Malone",           posicao: "PF", marcas: ["atletismo", "arremesso"],   valores: { atletismo: 92, arremesso: 89 } },
  { id: 13, nome: "Charles Barkley",       posicao: "PF", marcas: ["atletismo", "defesa"],      valores: { atletismo: 93, defesa: 88 } },
  { id: 14, nome: "John Stockton",         posicao: "PG", marcas: ["qiBasquete", "criacao"],    valores: { qiBasquete: 95, criacao: 90 } },
  { id: 15, nome: "Isiah Thomas",          posicao: "PG", marcas: ["criacao", "qiBasquete"],    valores: { criacao: 92, qiBasquete: 91 } },
  { id: 16, nome: "Julius Erving",         posicao: "SF", marcas: ["atletismo", "criacao"],     valores: { atletismo: 94, criacao: 89 } },
  { id: 17, nome: "Oscar Robertson",       posicao: "PG", marcas: ["qiBasquete", "arremesso"],  valores: { qiBasquete: 96, arremesso: 88 } },
  { id: 18, nome: "Jerry West",            posicao: "SG", marcas: ["arremesso", "criacao"],     valores: { arremesso: 92, criacao: 88 } },
  { id: 19, nome: "Elgin Baylor",          posicao: "SF", marcas: ["atletismo", "arremesso"],   valores: { atletismo: 91, arremesso: 87 } },
  { id: 20, nome: "David Robinson",        posicao: "C",  marcas: ["defesa", "atletismo"],      valores: { defesa: 93, atletismo: 90 } },
  { id: 21, nome: "Moses Malone",          posicao: "C",  marcas: ["atletismo", "defesa"],      valores: { atletismo: 88, defesa: 89 } },
  { id: 22, nome: "Scottie Pippen",        posicao: "SF", marcas: ["defesa", "qiBasquete"],     valores: { defesa: 95, qiBasquete: 92 } },
  { id: 23, nome: "Dennis Rodman",         posicao: "PF", marcas: ["defesa", "atletismo"],      valores: { defesa: 98, atletismo: 87 } },
  { id: 24, nome: "Allen Iverson",         posicao: "PG", marcas: ["criacao", "atletismo"],     valores: { criacao: 95, atletismo: 92 } },
  { id: 25, nome: "Steve Nash",            posicao: "PG", marcas: ["qiBasquete", "arremesso"],  valores: { qiBasquete: 94, arremesso: 93 } },
  { id: 26, nome: "Dirk Nowitzki",         posicao: "PF", marcas: ["arremesso", "qiBasquete"],  valores: { arremesso: 97, qiBasquete: 90 } },
  { id: 27, nome: "Kevin Garnett",         posicao: "PF", marcas: ["defesa", "qiBasquete"],     valores: { defesa: 94, qiBasquete: 92 } },
  { id: 28, nome: "Kevin Durant",          posicao: "SF", marcas: ["arremesso", "criacao"],     valores: { arremesso: 96, criacao: 90 } },
  { id: 29, nome: "Stephen Curry",         posicao: "PG", marcas: ["arremesso", "criacao"],     valores: { arremesso: 99, criacao: 91 } },
  { id: 30, nome: "Giannis Antetokounmpo", posicao: "PF", marcas: ["atletismo", "defesa"],      valores: { atletismo: 98, defesa: 91 } },
];

// Estrutura de ligas: NBA no topo, G-League como escada de acesso/retorno.
const LIGAS = {
  UNIVERSIDADE: { id: "universidade", nome: "Universidade", nivel: 0 },
  GLEAGUE:      { id: "gleague",      nome: "G-League",      nivel: 1 },
  NBA:          { id: "nba",          nome: "NBA",            nivel: 2 },
};

const CB = { ATRIBUTOS, NOMES_ATRIBUTOS, LENDAS, LIGAS };

if (typeof module !== "undefined" && module.exports) {
  module.exports = CB;
} else {
  global.CB = CB;
}

})(typeof window !== "undefined" ? window : global);
