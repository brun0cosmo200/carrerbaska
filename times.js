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

function encontrarTimePorNome(nome) {
  return TIMES.find((t) => t.nome === nome) || null;
}

const api = { TIMES, encontrarTimePorNome };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
} else {
  Object.assign(global.CB, api);
}

})(typeof window !== "undefined" ? window : global);
