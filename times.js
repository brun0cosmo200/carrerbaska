// times.js
// Os 30 times da NBA. Força calculada a partir do retrospecto real da
// temporada 2025-26 (vitórias/derrotas), escalada pra faixa 60-99.
// Elenco = escalação de abertura da temporada 2025-26 (última confirmada
// e documentável — a 2026-27 ainda não tinha elenco fechado).
(function (global) {

const TIMES = [
  { nome: "Oklahoma City Thunder", slug: "oklahoma-city-thunder", forca: 99, elenco: ["Shai Gilgeous-Alexander","Chet Holmgren","Jalen Williams","Luguentz Dort","Isaiah Hartenstein","Alex Caruso","Cason Wallace","Aaron Wiggins","Isaiah Joe","Ajay Mitchell","Ousmane Dieng","Jaylin Williams","Nikola Topic","Kenrich Williams","Thomas Sorber"] },
  { nome: "San Antonio Spurs", slug: "san-antonio-spurs", forca: 97, elenco: ["Victor Wembanyama","De'Aaron Fox","Stephon Castle","Devin Vassell","Harrison Barnes","Dylan Harper","Keldon Johnson","Luke Kornet","Jeremy Sochan","Bismack Biyombo","Julian Champagnie","Carter Bryant","Kelly Olynyk","Jordan McLaughlin","Chucky Hepburn"] },
  { nome: "Detroit Pistons", slug: "detroit-pistons", forca: 96, elenco: ["Cade Cunningham","Jalen Duren","Ausar Thompson","Tobias Harris","Isaiah Stewart","Duncan Robinson","Ron Holland II","Caris LeVert","Paul Reed Jr.","Marcus Sasser","Bobi Klintman","Jaden Ivey","Javonte Green","Chaz Lanier"] },
  { nome: "Boston Celtics", slug: "boston-celtics", forca: 92, elenco: ["Jaylen Brown","Jayson Tatum","Derrick White","Payton Pritchard","Anfernee Simons","Sam Hauser","Neemias Queta","Chris Boucher","Luka Garza","Hugo Gonzalez","Josh Minott","Baylor Scheierman","Xavier Tillman Sr.","Jordan Walsh"] },
  { nome: "Denver Nuggets", slug: "denver-nuggets", forca: 91, elenco: ["Nikola Jokic","Jamal Murray","Christian Braun","Aaron Gordon","Cam Johnson","Bruce Brown","Tim Hardaway Jr.","DaRon Holmes II","Julian Strawther","Peyton Watson","Zeke Nnaji","Jalen Pickett","Jonas Valanciunas","Hunter Tyson"] },
  { nome: "Los Angeles Lakers", slug: "los-angeles-lakers", forca: 90, elenco: ["LeBron James","Luka Doncic","Austin Reaves","Rui Hachimura","Deandre Ayton","Jaxson Hayes","Bronny James","Marcus Smart","Maxi Kleber","Dalton Knecht","Jarred Vanderbilt","Gabe Vincent","Adou Thiero"] },
  { nome: "New York Knicks", slug: "new-york-knicks", forca: 90, elenco: ["Jalen Brunson","Mikal Bridges","OG Anunoby","Karl-Anthony Towns","Josh Hart","Mitchell Robinson","Jordan Clarkson","Miles McBride","Tyler Kolek","Landry Shamet","Guerschon Yabusele","Pacome Dadiet","Ariel Hukporti","Mohamed Diawara"] },
  { nome: "Cleveland Cavaliers", slug: "cleveland-cavaliers", forca: 89, elenco: ["Donovan Mitchell","Evan Mobley","Jarrett Allen","De'Andre Hunter","Lonzo Ball","Sam Merrill","Craig Porter Jr.","Larry Nance Jr.","Thomas Bryant","Tyrese Proctor","Dean Wade","Jaylon Tyson","Luke Travers","Nae'Qwan Tomlin"] },
  { nome: "Houston Rockets", slug: "houston-rockets", forca: 89, elenco: ["Kevin Durant","Alperen Sengun","Amen Thompson","Steven Adams","Clint Capela","Fred VanVleet","Tari Eason","Dorian Finney-Smith","Reed Sheppard","Jabari Smith Jr.","Aaron Holiday","Josh Okogie","Jae'Sean Tate"] },
  { nome: "Minnesota Timberwolves", slug: "minnesota-timberwolves", forca: 87, elenco: ["Anthony Edwards","Julius Randle","Rudy Gobert","Mike Conley","Donte DiVincenzo","Jaden McDaniels","Naz Reid","Terrence Shannon Jr.","Rob Dillingham","Joan Beringer","Joe Ingles","Jaylen Clark","Bones Hyland"] },
  { nome: "Atlanta Hawks", slug: "atlanta-hawks", forca: 84, elenco: ["Trae Young","Jalen Johnson","Onyeka Okongwu","Dyson Daniels","Nickeil Alexander-Walker","Kristaps Porzingis","Zaccharie Risacher","Luke Kennard","Asa Newell","Vit Krejci","Mouhamed Gueye","N'Faly Dante","Keaton Wallace"] },
  { nome: "Toronto Raptors", slug: "toronto-raptors", forca: 84, elenco: ["Scottie Barnes","RJ Barrett","Immanuel Quickley","Brandon Ingram","Jakob Poeltl","Ochai Agbaji","Gradey Dick","Jamal Shead","Collin Murray-Boyles","Jamison Battle","Sandro Mamukelashvili","Jonathan Mogbo","Ja'Kobe Walter"] },
  { nome: "Orlando Magic", slug: "orlando-magic", forca: 83, elenco: ["Paolo Banchero","Franz Wagner","Desmond Bane","Jalen Suggs","Wendell Carter Jr.","Anthony Black","Goga Bitadze","Jonathan Isaac","Tristan da Silva","Jett Howard","Noah Penda","Tyus Jones","Moritz Wagner"] },
  { nome: "Philadelphia 76ers", slug: "philadelphia-76ers", forca: 83, elenco: ["Joel Embiid","Tyrese Maxey","Paul George","VJ Edgecombe","Andre Drummond","Quentin Grimes","Kyle Lowry","Jared McCain","Adem Bona","Justin Edwards","Johni Broome","Eric Gordon"] },
  { nome: "Phoenix Suns", slug: "phoenix-suns", forca: 83, elenco: ["Devin Booker","Dillon Brooks","Jalen Green","Grayson Allen","Royce O'Neale","Ryan Dunn","Collin Gillespie","Khaman Maluach","Oso Ighodaro","Jordan Goodwin","Nigel Hayes-Davis","Rasheer Fleming"] },
  { nome: "Charlotte Hornets", slug: "charlotte-hornets", forca: 82, elenco: ["LaMelo Ball","Miles Bridges","Brandon Miller","Kon Knueppel","Ryan Kalkbrenner","Tre Mann","Josh Green","Liam McNeeley","Pat Connaughton","Sion James","Mason Plumlee","Moussa Diabate","Tidjane Salaun","Grant Williams","Collin Sexton"] },
  { nome: "Miami Heat", slug: "miami-heat", forca: 82, elenco: ["Bam Adebayo","Tyler Herro","Norman Powell","Kel'el Ware","Davion Mitchell","Andrew Wiggins","Nikola Jovic","Terry Rozier","Pelle Larsson","Jaime Jaquez Jr.","Simone Fontecchio","Kasparas Jakucionis","Keshad Johnson","Dru Smith"] },
  { nome: "Portland Trail Blazers", slug: "portland-trail-blazers", forca: 81, elenco: ["Deni Avdija","Jerami Grant","Donovan Clingan","Toumani Camara","Jrue Holiday","Damian Lillard","Shaedon Sharpe","Scoot Henderson","Duop Reath","Rayan Rupert","Matisse Thybulle","Kris Murray","Blake Wesley"] },
  { nome: "Los Angeles Clippers", slug: "los-angeles-clippers", forca: 81, elenco: ["Kawhi Leonard","James Harden","Bradley Beal","Ivica Zubac","Nicolas Batum","Bogdan Bogdanovic","John Collins","Derrick Jones Jr.","Kris Dunn","Brook Lopez","Chris Paul","Cam Christie","Kobe Brown"] },
  { nome: "Golden State Warriors", slug: "golden-state-warriors", forca: 77, elenco: ["Stephen Curry","Jimmy Butler III","Draymond Green","Jonathan Kuminga","Al Horford","Buddy Hield","Moses Moody","Brandin Podziemski","Gary Payton II","Quinten Post","Will Richard","De'Anthony Melton","Trayce Jackson-Davis","Gui Santos"] },
  { nome: "Milwaukee Bucks", slug: "milwaukee-bucks", forca: 72, elenco: ["Giannis Antetokounmpo","Kyle Kuzma","Bobby Portis","Gary Trent Jr.","Ryan Rollins","Kevin Porter Jr.","Cole Anthony","AJ Green","Andre Jackson Jr.","Taurean Prince","Jericho Sims","Thanasis Antetokounmpo","Alex Antetokounmpo"] },
  { nome: "Chicago Bulls", slug: "chicago-bulls", forca: 72, elenco: ["Nikola Vucevic","Coby White","Josh Giddey","Ayo Dosunmu","Matas Buzelis","Kevin Huerter","Tre Jones","Isaac Okoro","Zach Collins","Jevon Carter","Julian Phillips","Dalen Terry","Patrick Williams","Noa Essengue"] },
  { nome: "New Orleans Pelicans", slug: "new-orleans-pelicans", forca: 68, elenco: ["Zion Williamson","Trey Murphy III","Herbert Jones","Jordan Poole","Derik Queen","Yves Missi","Jose Alvarado","Saddiq Bey","Jeremiah Fears","Jordan Hawkins","Karlo Matkovic","Micah Peavy","Jaden Springer","Kevon Looney"] },
  { nome: "Dallas Mavericks", slug: "dallas-mavericks", forca: 68, elenco: ["Anthony Davis","Cooper Flagg","D'Angelo Russell","Klay Thompson","P.J. Washington","Daniel Gafford","Dereck Lively II","Max Christie","Caleb Martin","Naji Marshall","Jaden Hardy","Dwight Powell","Moussa Cisse","Ryan Nembhard"] },
  { nome: "Memphis Grizzlies", slug: "memphis-grizzlies", forca: 67, elenco: ["Ja Morant","Jaren Jackson Jr.","Santi Aldama","Zach Edey","Ty Jerome","Cedric Coward","Brandon Clarke","GG Jackson II","Scotty Pippen Jr.","Jock Landale","John Konchar","Kentavious Caldwell-Pope","Cam Spencer","Jaylen Wells"] },
  { nome: "Sacramento Kings", slug: "sacramento-kings", forca: 64, elenco: ["DeMar DeRozan","Zach LaVine","Domantas Sabonis","Malik Monk","Keon Ellis","Devin Carter","Dennis Schroder","Nique Clifford","Drew Eubanks","Maxime Raynaud","Isaac Jones","Doug McDermott","Dario Saric"] },
  { nome: "Utah Jazz", slug: "utah-jazz", forca: 64, elenco: ["Lauri Markkanen","Walker Kessler","Keyonte George","Isaiah Collier","Ace Bailey","Kyle Filipowski","Taylor Hendricks","Svi Mykhailiuk","Jusuf Nurkic","Kyle Anderson","Walter Clayton Jr.","Cody Williams","Brice Sensabaugh"] },
  { nome: "Brooklyn Nets", slug: "brooklyn-nets", forca: 63, elenco: ["Michael Porter Jr.","Cam Thomas","Nic Claxton","Noah Clowney","Terance Mann","Day'Ron Sharpe","Egor Demin","Ben Saraf","Drake Powell","Tyrese Martin","Ziaire Williams","Jalen Wilson","Danny Wolf","Nolan Traore"] },
  { nome: "Indiana Pacers", slug: "indiana-pacers", forca: 62, elenco: ["Pascal Siakam","Bennedict Mathurin","Andrew Nembhard","Aaron Nesmith","Myles Turner","Obi Toppin","Ben Sheppard","T.J. McConnell","Jarace Walker","Isaiah Jackson","Johnny Furphy","James Wiseman","Tony Bradley"] },
  { nome: "Washington Wizards", slug: "washington-wizards", forca: 60, elenco: ["CJ McCollum","Khris Middleton","Marvin Bagley III","Bilal Coulibaly","Alex Sarr","Tre Johnson","Corey Kispert","Kyshawn George","AJ Johnson","Malaki Branham","Bub Carrington","Justin Champagnie","Will Riley","Anthony Gill"] },
];

TIMES.forEach((t) => {
  t.imagem = `img/times/${t.slug}.png`;
});

// Conferências oficiais da NBA (2020s).
const CONFERENCIA_POR_SLUG = {
  "atlanta-hawks": "Leste",
  "boston-celtics": "Leste",
  "brooklyn-nets": "Leste",
  "charlotte-hornets": "Leste",
  "chicago-bulls": "Leste",
  "cleveland-cavaliers": "Leste",
  "detroit-pistons": "Leste",
  "indiana-pacers": "Leste",
  "miami-heat": "Leste",
  "milwaukee-bucks": "Leste",
  "new-york-knicks": "Leste",
  "orlando-magic": "Leste",
  "philadelphia-76ers": "Leste",
  "toronto-raptors": "Leste",
  "washington-wizards": "Leste",
  "dallas-mavericks": "Oeste",
  "denver-nuggets": "Oeste",
  "golden-state-warriors": "Oeste",
  "houston-rockets": "Oeste",
  "los-angeles-clippers": "Oeste",
  "los-angeles-lakers": "Oeste",
  "memphis-grizzlies": "Oeste",
  "minnesota-timberwolves": "Oeste",
  "new-orleans-pelicans": "Oeste",
  "oklahoma-city-thunder": "Oeste",
  "phoenix-suns": "Oeste",
  "portland-trail-blazers": "Oeste",
  "sacramento-kings": "Oeste",
  "san-antonio-spurs": "Oeste",
  "utah-jazz": "Oeste",
};

TIMES.forEach((t) => {
  t.conferencia = CONFERENCIA_POR_SLUG[t.slug] || "Oeste";
});

// Rebalanceia a liga: a escala antiga (60–99) fazia o OKC (99) ganhar
// quase sempre. Comprimimos pra ~73–90 e guardamos forcaBase pra drifts.
const FORCA_MIN = 73;
const FORCA_MAX = 90;
const FORCA_OLD_MIN = 60;
const FORCA_OLD_MAX = 99;

TIMES.forEach((t) => {
  const normalizado = (t.forca - FORCA_OLD_MIN) / (FORCA_OLD_MAX - FORCA_OLD_MIN);
  t.forcaBase = Math.round(FORCA_MIN + normalizado * (FORCA_MAX - FORCA_MIN));
  t.forca = t.forcaBase;
});

// Identidade de franquia: estrelas, necessidade e sistema passam a orientar
// o encaixe do jogador, não apenas a força total do time.
const SISTEMAS = [
  { nome: "Ataque de ritmo", foco: ["arremesso", "criacao"] },
  { nome: "Defesa e transição", foco: ["defesa", "atletismo"] },
  { nome: "Movimentação e passe", foco: ["qiBasquete", "criacao"] },
  { nome: "Meia quadra física", foco: ["defesa", "arremesso"] },
  { nome: "Liberdade para estrelas", foco: ["criacao", "atletismo"] },
];

const HISTORICO_LIGA = [];
const AGENTES_LIVRES = [];
const NECESSIDADES_ROTATIVAS = [["PG", "C"], ["SG", "SF"], ["PF", "C"], ["PG", "SF"], ["SG", "PF"]];
const POSICOES_RODIZIO = ["PG", "SG", "SF", "PF", "C", "G", "F", "C", "G", "F", "C", "PG", "SF", "PF", "SG"];
const POSICOES_BASE = ["PG", "SG", "SF", "PF", "C"];

TIMES.forEach((t, i) => {
  t.estrelas = t.elenco.slice(0, 3);
  t.sistema = SISTEMAS[i % SISTEMAS.length];
  t.necessidadesPreferenciais = NECESSIDADES_ROTATIVAS[i % NECESSIDADES_ROTATIVAS.length];
  t.necessidades = [...t.necessidadesPreferenciais];
  t.historicoPlayoffs = [];
  const candidatos = TIMES.filter((outro) => outro.conferencia === t.conferencia && outro.nome !== t.nome);
  t.rivais = candidatos.slice(i % Math.max(1, candidatos.length - 1), (i % Math.max(1, candidatos.length - 1)) + 2).map((r) => r.nome);
  t.jogadores = t.elenco.map((nome, slot) => ({
    id: `${t.slug}-${slot}`,
    nome,
    idade: 21 + ((i * 3 + slot) % 15),
    overall: Math.max(65, Math.min(94, t.forca + 5 - slot * 1.4)),
    potencial: Math.max(68, Math.min(96, t.forca + 8 - slot * 0.7)),
    posicao: POSICOES_RODIZIO[slot],
    contrato: { anosRestantes: 1 + ((i + slot) % 4), salario: Math.round(Math.max(1.2, (t.forca + 5 - slot * 1.4) * 0.42) * 10) / 10 },
  }));
});

function posicaoDoCalouro(pick) {
  return pick.posicaoJogador || POSICOES_BASE[(pick.posicao - 1) % POSICOES_BASE.length];
}

function atualizarNecessidadesDoElenco(time) {
  const contagem = Object.fromEntries(POSICOES_BASE.map((p) => [p, 0]));
  time.jogadores.forEach((j) => {
    if (contagem[j.posicao] !== undefined) contagem[j.posicao]++;
    else if (j.posicao === "G") { contagem.PG++; contagem.SG++; }
    else if (j.posicao === "F") { contagem.SF++; contagem.PF++; }
  });
  const faltas = POSICOES_BASE
    .map((posicao) => ({ posicao, falta: 2 - contagem[posicao] }))
    .filter((x) => x.falta > 0)
    .sort((a, b) => b.falta - a.falta)
    .map((x) => x.posicao);
  time.necessidades = [...new Set([...faltas, ...(time.necessidadesPreferenciais || [])])].slice(0, 2);
}

function atualizarIdentidadeDoElenco(time) {
  time.jogadores.sort((a, b) => b.overall - a.overall);
  time.elenco = time.jogadores.map((j) => j.nome);
  time.estrelas = time.jogadores.slice(0, 3).map((j) => j.nome);
  const mediaTop8 = time.jogadores.slice(0, 8).reduce((s, j) => s + j.overall, 0) / Math.max(1, Math.min(8, time.jogadores.length));
  time.forca = Math.round(Math.max(70, Math.min(92, mediaTop8)));
  atualizarNecessidadesDoElenco(time);
}

function renovarContrato(jogador) {
  jogador.contrato = {
    anosRestantes: jogador.idade >= 33 ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3),
    salario: Math.round(Math.max(1.1, jogador.overall * (jogador.idade >= 32 ? 0.32 : 0.42)) * 10) / 10,
  };
}

function assinarAgenteLivre(time, jogador) {
  renovarContrato(jogador);
  time.jogadores.push(jogador);
}

function preencherElencosComMercado(movimentacoes) {
  AGENTES_LIVRES.sort((a, b) => b.overall - a.overall || b.potencial - a.potencial);
  TIMES.forEach((time) => atualizarNecessidadesDoElenco(time));
  const restantes = [];
  AGENTES_LIVRES.forEach((jogador) => {
    const destinos = TIMES
      .filter((time) => time.jogadores.length < 15)
      .map((time) => ({
        time,
        interesse: (time.necessidades.includes(jogador.posicao) ? 24 : 0) +
          (15 - time.jogadores.length) * 9 + (92 - time.forca) * 0.35 + Math.random() * 8,
      }))
      .sort((a, b) => b.interesse - a.interesse);
    const destino = destinos[0];
    if (!destino) { restantes.push(jogador); return; }
    assinarAgenteLivre(destino.time, jogador);
    if (movimentacoes.length < 8) movimentacoes.push({ tipo: "free-agent", nome: jogador.nome, para: destino.time.nome, overall: Math.round(jogador.overall) });
  });
  AGENTES_LIVRES.splice(0, AGENTES_LIVRES.length, ...restantes.slice(0, 40));
}

function executarTrocasDaLiga(movimentacoes) {
  const usados = new Set();
  const candidatos = [...TIMES].sort(() => Math.random() - 0.5);
  for (const comprador of candidatos) {
    if (movimentacoes.filter((m) => m.tipo === "troca").length >= 3) break;
    const vendedor = TIMES.find((time) => time !== comprador && !usados.has(time.nome) && time.jogadores.length >= 10);
    if (!vendedor) continue;
    atualizarNecessidadesDoElenco(comprador);
    const alvo = vendedor.jogadores
      .filter((j) => comprador.necessidades.includes(j.posicao) && !j.calouro)
      .sort((a, b) => b.overall - a.overall)[0];
    const retorno = comprador.jogadores
      .filter((j) => vendedor.necessidades.includes(j.posicao) && !j.calouro)
      .sort((a, b) => Math.abs(a.overall - (alvo ? alvo.overall : 0)) - Math.abs(b.overall - (alvo ? alvo.overall : 0)))[0];
    if (!alvo || !retorno || Math.abs(alvo.overall - retorno.overall) > 9) continue;
    vendedor.jogadores = vendedor.jogadores.filter((j) => j.id !== alvo.id);
    comprador.jogadores = comprador.jogadores.filter((j) => j.id !== retorno.id);
    vendedor.jogadores.push(retorno);
    comprador.jogadores.push(alvo);
    usados.add(comprador.nome);
    usados.add(vendedor.nome);
    movimentacoes.push({ tipo: "troca", nome: alvo.nome, de: vendedor.nome, para: comprador.nome, retorno: retorno.nome });
  }
}

// Offseason completa: evolução, aposentadoria, contratos, draft, mercado e
// trocas. O retorno é salvo no relatório para que a mudança seja visível.
function avancarMundoLiga(draft) {
  const aposentados = [];
  const agentesLivres = [];
  const movimentacoes = [];
  TIMES.forEach((time) => {
    const ativos = [];
    time.jogadores.forEach((j) => {
      j.calouro = false;
      j.idade += 1;
      const delta = j.idade <= 24 ? 1 + (Math.random() < 0.24 ? 1 : 0) : j.idade <= 29 ? (Math.random() < 0.3 ? 1 : 0) : j.idade <= 33 ? (Math.random() < 0.5 ? -1 : 0) : -1 - (Math.random() < 0.35 ? 1 : 0);
      j.overall = Math.max(55, Math.min(j.potencial, j.overall + delta));
      const aposenta = j.idade >= 39 || (j.idade >= 35 && Math.random() < (j.idade - 34) * 0.16);
      if (aposenta) {
        aposentados.push({ nome: j.nome, time: time.nome, idade: j.idade });
        return;
      }
      j.contrato = j.contrato || { anosRestantes: 1, salario: Math.round(j.overall * 0.4) };
      j.contrato.anosRestantes -= 1;
      const reter = j.contrato.anosRestantes > 0 || Math.random() < (j.idade <= 29 ? 0.67 : j.idade <= 33 ? 0.48 : 0.25);
      if (reter) {
        if (j.contrato.anosRestantes <= 0) renovarContrato(j);
        ativos.push(j);
      } else {
        agentesLivres.push(j);
        if (movimentacoes.length < 8) movimentacoes.push({ tipo: "mercado", nome: j.nome, de: time.nome, para: "free agency", overall: Math.round(j.overall) });
      }
    });
    time.jogadores = ativos;
  });

  AGENTES_LIVRES.push(...agentesLivres);
  (draft || []).forEach((pick) => {
    pick.time.jogadores.push({
      id: pick.id,
      nome: pick.calouro,
      idade: 19,
      overall: pick.overall,
      potencial: pick.potencial,
      posicao: posicaoDoCalouro(pick),
      contrato: { anosRestantes: 3, salario: Math.round(Math.max(1.4, pick.overall * 0.18) * 10) / 10 },
      calouro: true,
    });
  });
  preencherElencosComMercado(movimentacoes);
  executarTrocasDaLiga(movimentacoes);
  TIMES.forEach((time) => {
    const calouros = time.jogadores.filter((j) => j.calouro).sort((a, b) => b.potencial - a.potencial).slice(0, 2);
    const outros = time.jogadores.filter((j) => !j.calouro).sort((a, b) => b.overall - a.overall);
    time.jogadores = [...calouros, ...outros].slice(0, 15);
    atualizarIdentidadeDoElenco(time);
  });
  return { aposentados, agentesLivres: AGENTES_LIVRES.slice(0, 12).map((j) => ({ nome: j.nome, posicao: j.posicao, overall: Math.round(j.overall) })), movimentacoes };
}

function registrarHistoricoLiga(resumo) {
  const temporada = HISTORICO_LIGA.length + 1;
  const entrada = {
    temporada,
    campeao: resumo.campeaoNome,
    campeaoImagem: resumo.campeao.imagem,
    mvp: resumo.mvpDaLiga,
    mvpTime: resumo.mvpTime.nome,
    dpoy: resumo.dpoyDaLiga,
    roy: resumo.novatoDoAno,
    royTime: resumo.novatoTime.nome,
    sextoHomem: resumo.sextoHomemDaLiga,
    draft: (resumo.draft || []).slice(0, 3).map((pick) => ({ posicao: pick.posicao, nome: pick.calouro, time: pick.time.nome })),
  };
  HISTORICO_LIGA.push(entrada);
  return entrada;
}

function encaixeJogadorNoTime(jogador, time) {
  if (!time) return { necessidade: 0, sistema: 0, total: 0 };
  const necessidade = time.necessidades.includes(jogador.posicao) ? 8 : -3;
  const foco = time.sistema.foco;
  const sistema = foco.reduce((s, attr) => s + ((jogador.atual && jogador.atual[attr]) || 70), 0) / foco.length;
  return { necessidade, sistema: Math.round((sistema - 75) * 0.16), total: necessidade + Math.round((sistema - 75) * 0.16) };
}

function encontrarTimePorNome(nome) {
  return TIMES.find((t) => t.nome === nome) || null;
}

const api = { TIMES, HISTORICO_LIGA, AGENTES_LIVRES, encontrarTimePorNome, encaixeJogadorNoTime, avancarMundoLiga, registrarHistoricoLiga };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);
