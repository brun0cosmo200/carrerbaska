// draft.js
// Camada de UI do draft. Não tem regra de jogo aqui — só chama CB (engine.js)
// e renderiza o estado no DOM.
(function () {
  const {
    ATRIBUTOS,
    NOMES_ATRIBUTOS,
    novoEstadoDraft,
    sortearLenda,
    marcasEscolhiveis,
    roubarAtributo,
    draftCompleto,
  } = window.CB;

  let estado = novoEstadoDraft();

  const elTrilha = document.getElementById("trilha");
  const elCarta = document.getElementById("carta-lenda");
  // Cada lenda tem sua foto curada no acervo local; o ID coincide com a
  // ordem do draft em data.js para impedir qualquer troca visual acidental.
  const FOTOS_LENDAS = {
    1: "img/lenda-01-michael-jordan.png", 2: "img/lenda-02-lebron-james.png",
    3: "img/lenda-03-kareem-abdul-jabbar.png", 4: "img/lenda-04-magic-johnson.png",
    5: "img/lenda-05-larry-bird.png", 6: "img/lenda-06-wilt-chamberlain.png",
    7: "img/lenda-07-bill-russell.png", 8: "img/lenda-08-kobe-bryant.png",
    9: "img/lenda-09-tim-duncan.png", 10: "img/lenda-10-shaquille-oneal.png",
    11: "img/lenda-11-hakeem-olajuwon.png", 12: "img/lenda-12-karl-malone.png",
    13: "img/lenda-13-charles-barkley.png", 14: "img/lenda-14-john-stockton.png",
    15: "img/lenda-15-isiah-thomas.png", 16: "img/lenda-16-julius-erving.png",
    17: "img/lenda-17-oscar-robertson.png", 18: "img/lenda-18-jerry-west.png",
    19: "img/lenda-19-elgin-baylor.png", 20: "img/lenda-20-david-robinson.png",
    21: "img/lenda-21-moses-malone.png", 22: "img/lenda-22-scottie-pippen.png",
    23: "img/lenda-23-dennis-rodman.png", 24: "img/lenda-24-allen-iverson.png",
    25: "img/lenda-25-steve-nash.png", 26: "img/lenda-26-dirk-nowitzki.png",
    27: "img/lenda-27-kevin-garnett.png", 28: "img/lenda-28-kevin-durant.png",
    29: "img/lenda-29-stephen-curry.png", 30: "img/lenda-30-giannis-antetokounmpo.png",
  };
  // Cenas horizontais preenchem o fundo; a posição prioriza o atleta, não o
  // centro geométrico da fotografia.
  const ENQUADRAMENTOS_LENDAS = {
    1:{ modo:"cover", posicao:"center 48%" }, 2:{ modo:"cover", posicao:"center 52%" },
    3:{ modo:"cover", posicao:"center 48%" }, 4:{ modo:"cover", posicao:"58% center" },
    5:{ modo:"cover", posicao:"center 45%" }, 6:{ modo:"cover", posicao:"center 48%" },
    7:{ modo:"cover", posicao:"center 48%" }, 8:{ modo:"cover", posicao:"36% center" },
    9:{ modo:"cover", posicao:"center 48%" }, 10:{ modo:"cover", posicao:"63% center" },
    11:{ modo:"cover", posicao:"58% center" }, 12:{ modo:"cover", posicao:"58% center" },
    13:{ modo:"cover", posicao:"center 48%" },
    14:{ modo:"cover", posicao:"72% center" }, 15:{ modo:"cover", posicao:"38% center" },
    16:{ modo:"cover", posicao:"35% center" }, 17:{ modo:"cover", posicao:"70% center" }, 18:{ modo:"cover", posicao:"center center" },
    19:{ modo:"cover", posicao:"58% center" }, 20:{ modo:"cover", posicao:"center 48%" },
    21:{ modo:"cover", posicao:"48% center" }, 22:{ modo:"cover", posicao:"65% center" },
    23:{ modo:"cover", posicao:"58% center" }, 24:{ modo:"cover", posicao:"32% center" },
    25:{ modo:"cover", posicao:"38% center" }, 26:{ modo:"cover", posicao:"50% center" },
    27:{ modo:"cover", posicao:"center 45%" }, 28:{ modo:"cover", posicao:"center 55%" },
    29:{ modo:"cover", posicao:"50% center" }, 30:{ modo:"cover", posicao:"center 48%" },
  };
  const LENDAS_COM_RETRATO_INTERNO = new Set();
  const LOGOS_DAS_LENDAS = {
    1:"img/times/chicago-bulls.png", 2:"img/times/cleveland-cavaliers.png", 3:"img/times/los-angeles-lakers.png", 4:"img/times/los-angeles-lakers.png",
    5:"img/times/boston-celtics.png", 6:"img/times/philadelphia-76ers.png", 7:"img/times/boston-celtics.png", 8:"img/times/los-angeles-lakers.png",
    9:"img/times/san-antonio-spurs.png", 10:"img/times/los-angeles-lakers.png", 11:"img/times/houston-rockets.png", 12:"img/times/utah-jazz.png",
    13:"img/times/philadelphia-76ers.png", 14:"img/times/utah-jazz.png", 15:"img/times/detroit-pistons.png", 17:"img/times/milwaukee-bucks.png",
    19:"img/times/los-angeles-lakers.png", 20:"img/times/san-antonio-spurs.png", 24:"img/times/philadelphia-76ers.png", 25:"img/times/los-angeles-lakers.png",
    28:"img/times/minnesota-timberwolves.png", 30:"img/times/milwaukee-bucks.png",
  };
  // O tom do clube só acentua a interface: a foto continua sendo a estrela.
  const TONS_DAS_LENDAS = {
    1:"#ce1141", 2:"#860038", 3:"#552583", 4:"#552583", 5:"#007a33", 6:"#006bb6",
    7:"#007a33", 8:"#552583", 9:"#c4ced4", 10:"#552583", 11:"#ce1141", 12:"#f9a01b",
    13:"#e56020", 14:"#f9a01b", 15:"#c8102e", 16:"#006bb6", 17:"#00471b", 18:"#552583",
    19:"#552583", 20:"#c4ced4", 21:"#9ea2a2", 22:"#ce1141", 23:"#ce1141", 24:"#006bb6",
    25:"#552583", 26:"#00538c", 27:"#0c2340", 28:"#1d428a", 29:"#1d428a", 30:"#00471b",
  };
  const NOMES_DE_RIVAIS = ["Darius Cole", "Malik Cross", "Ethan Price", "Noah Bennett", "Jalen Brooks"];

  function definirCenarioDaLenda(foto, id) {
    document.body.classList.remove("draft-lenda-trocando");
    document.body.classList.toggle("draft-lenda-ativo", Boolean(foto));
    document.body.classList.toggle("draft-lenda-retrato", Boolean(foto && LENDAS_COM_RETRATO_INTERNO.has(id)));
    if (foto) {
      const enquadramento = ENQUADRAMENTOS_LENDAS[id] || { modo:"cover", posicao:"center center" };
      document.body.style.setProperty("--foto-lenda-draft", `url("${foto}")`);
      document.body.style.setProperty("--tamanho-lenda-draft", enquadramento.modo);
      document.body.style.setProperty("--posicao-lenda-draft", enquadramento.posicao);
      document.body.style.setProperty("--cor-lenda", TONS_DAS_LENDAS[id] || "#8bbcff");
      if (LOGOS_DAS_LENDAS[id]) document.body.style.setProperty("--logo-lenda-draft", `url("${LOGOS_DAS_LENDAS[id]}")`);
      else document.body.style.removeProperty("--logo-lenda-draft");
      // Reinicia a entrada do cenário a cada rodada sem animar a página toda.
      void document.body.offsetWidth;
      document.body.classList.add("draft-lenda-trocando");
    } else {
      ["--foto-lenda-draft", "--tamanho-lenda-draft", "--posicao-lenda-draft", "--logo-lenda-draft", "--cor-lenda"].forEach((variavel) => document.body.style.removeProperty(variavel));
    }
  }
  const elHistorico = document.getElementById("lista-historico");

  function nomeAtributo(chave) {
    return NOMES_ATRIBUTOS[chave];
  }

  function renderTrilha() {
    const preenchidos = estado.historico.length;
    elTrilha.innerHTML = `
      <div class="dna-cabecalho">
        <span>DNA do prospecto</span>
        <strong><b>${preenchidos}</b>/5 atributos roubados</strong>
      </div>
      <div class="dna-segmentos" role="list" aria-label="DNA do jogador em construção"></div>
    `;
    const elSegmentos = elTrilha.querySelector(".dna-segmentos");
    ATRIBUTOS.forEach((attr) => {
      const valor = estado.atributos[attr];
      const origem = estado.historico.find((registro) => registro.roubado === attr);
      const div = document.createElement("div");
      div.className = "slot" + (valor !== null ? " preenchido" : "");
      div.setAttribute("role", "listitem");
      if (origem) {
        div.style.setProperty("--cor-dna", TONS_DAS_LENDAS[origem.lendaId] || "#8bbcff");
        div.title = `${nomeAtributo(attr)} roubado de ${origem.lenda}`;
      }
      div.innerHTML = `
        <div class="slot-label">${nomeAtributo(attr)}</div>
        <div class="slot-valor">${valor !== null ? valor : "--"}</div>
        <div class="dna-origem">${origem ? origem.lenda : "aguardando lenda"}</div>
      `;
      elSegmentos.appendChild(div);
    });
  }

  function renderHistorico() {
    elHistorico.innerHTML = "";
    estado.historico
      .slice()
      .reverse()
      .forEach((h) => {
        const li = document.createElement("div");
        li.className = "historico-item";
        const perdaTexto = h.perdido
          ? `perdeu ${nomeAtributo(h.perdido)}`
          : "sem perda (slot já ocupado)";
        li.innerHTML = `<span><b>${h.lenda}</b> — ${nomeAtributo(h.roubado)} (${h.valor})</span><span>${perdaTexto}</span>`;
        elHistorico.appendChild(li);
      });
  }

  function renderRodada() {
    renderTrilha();
    renderHistorico();

    if (draftCompleto(estado)) {
      renderTelaFinal();
      return;
    }

    const lenda = sortearLenda(estado);
    const opcoes = marcasEscolhiveis(estado, lenda);
    const fotoLenda = FOTOS_LENDAS[lenda.id];
    const retratoInterno = fotoLenda && LENDAS_COM_RETRATO_INTERNO.has(lenda.id);
    definirCenarioDaLenda(fotoLenda, lenda.id);

    elCarta.innerHTML = `
      <div class="carta-lenda${fotoLenda ? " carta-lenda-com-foto" : ""}${retratoInterno ? " carta-lenda-retrato" : ""}">
        ${retratoInterno ? `<div class="fundo-retrato-carta" style="--foto-retrato-carta:url('${fotoLenda}')" role="img" aria-label="${lenda.nome} em um momento marcante da carreira"></div>` : ""}
        <div class="conteudo-carta-lenda">
          <span class="lenda-posicao">${lenda.posicao}</span>
          <h2 class="lenda-nome">${lenda.nome}</h2>
          <p class="chamada-lenda">Escolha um legado. O outro atributo ficará para trás.</p>
          <div class="opcoes">
          ${opcoes
            .map((attr) => {
              const outraMarca = lenda.marcas.find((m) => m !== attr);
              const vaiPerder = estado.atributos[outraMarca] === null;
              return `
                <button type="button" class="opcao-atributo" data-lenda="${lenda.id}" data-atributo="${attr}">
                  <span class="rotulo">${nomeAtributo(attr)}</span>
                  <span class="valor">${lenda.valores[attr]}</span>
                  ${vaiPerder ? `<span class="perde">abre mão de ${nomeAtributo(outraMarca)}</span>` : ""}
                </button>
              `;
            })
            .join("")}
          </div>
        </div>
      </div>
    `;

    // Delegação mantém a escolha funcional após cada cartão ser recriado.
    elCarta.onclick = (evento) => {
      const btn = evento.target.closest(".opcao-atributo");
      if (!btn || !elCarta.contains(btn)) return;
      const lendaId = Number(btn.dataset.lenda);
      const atributo = btn.dataset.atributo;
      roubarAtributo(estado, lendaId, atributo);
      renderRodada();
    };
  }

  function renderTelaFinal() {
    definirCenarioDaLenda(null);
    const overall = Math.round(
      ATRIBUTOS.reduce((soma, a) => soma + estado.atributos[a], 0) / ATRIBUTOS.length
    );

    elCarta.innerHTML = `
      <div class="carta-lenda tela-final">
        <span class="lenda-posicao">Carta pronta</span>
        <h2 class="lenda-nome">Draft completo</h2>
        <div class="overall">${overall}</div>
        <p class="meta-linha compacta">overall médio dos atributos roubados</p>
        <div class="acoes-stack">
          <button class="acao" id="btn-iniciar-carreira">Iniciar carreira universitária</button>
          <button class="acao secundaria" id="btn-reiniciar">Sortear outro jogador</button>
        </div>
      </div>
    `;

    document.getElementById("btn-reiniciar").addEventListener("click", () => {
      estado = novoEstadoDraft();
      renderRodada();
    });

    // A torcida só começa quando o showcase é apresentado, sempre após um clique.
    function tocarIntroducaoSonora() {
      const ContextoAudio = window.AudioContext || window.webkitAudioContext;
      if (!ContextoAudio) return { parar: () => {}, alternar: () => false };

      const contexto = new ContextoAudio();
      const inicio = contexto.currentTime;
      const torcida = new Audio("audio/torcida-arena.mp3");
      const temporizadores = [];
      let silenciado = false;
      const master = contexto.createGain();
      master.gain.setValueAtTime(0.0001, inicio);
      master.gain.exponentialRampToValueAtTime(0.075, inicio + 0.3);
      master.connect(contexto.destination);
      const ganhoTorcida = contexto.createGain();
      const filtroArena = contexto.createBiquadFilter();
      const compressor = contexto.createDynamicsCompressor();
      filtroArena.type = "lowpass";
      filtroArena.frequency.value = 3900;
      filtroArena.Q.value = 0.7;
      compressor.threshold.value = -24;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.25;
      ganhoTorcida.gain.setValueAtTime(0.0001, inicio);
      contexto.createMediaElementSource(torcida).connect(filtroArena).connect(compressor).connect(ganhoTorcida).connect(contexto.destination);
      torcida.preload = "auto";
      torcida.volume = 1;
      torcida.play().catch(() => {});

      const tom = (frequencia, quando, duracao, tipo = "sine", volume = 0.1, destino = master) => {
        const oscilador = contexto.createOscillator();
        const ganho = contexto.createGain();
        oscilador.type = tipo;
        oscilador.frequency.setValueAtTime(frequencia, quando);
        ganho.gain.setValueAtTime(0.0001, quando);
        ganho.gain.exponentialRampToValueAtTime(volume, quando + 0.025);
        ganho.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
        oscilador.connect(ganho).connect(destino);
        oscilador.start(quando);
        oscilador.stop(quando + duracao + 0.04);
      };

      const multidao = (quando, duracao, volume) => {
        const buffer = contexto.createBuffer(1, Math.ceil(contexto.sampleRate * duracao), contexto.sampleRate);
        const dados = buffer.getChannelData(0);
        for (let i = 0; i < dados.length; i += 1) dados[i] = (Math.random() * 2 - 1) * (1 - i / dados.length);
        const ruido = contexto.createBufferSource();
        const filtro = contexto.createBiquadFilter();
        const ganho = contexto.createGain();
        filtro.type = "bandpass";
        filtro.frequency.value = 680;
        filtro.Q.value = 0.5;
        ganho.gain.setValueAtTime(0.0001, quando);
        ganho.gain.linearRampToValueAtTime(volume, quando + duracao * 0.28);
        ganho.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
        ruido.buffer = buffer;
        ruido.connect(filtro).connect(ganho).connect(master);
        ruido.start(quando);
      };

      [0.12, 8.1].forEach((tempo, indice) => {
        tom(55 + indice * 5, inicio + tempo, 1.3, "sine", 0.13);
        tom(110 + indice * 10, inicio + tempo + 0.06, 0.62, "triangle", 0.045);
      });
      [0.14, 4.8, 8.2].forEach((tempo, indice) => {
        tom(240 + indice * 60, inicio + tempo, 1.15, "sawtooth", 0.025);
        multidao(inicio + tempo + 0.12, 1.9, 0.038);
      });
      tom(740, inicio + 8.05, 0.17, "square", 0.035);
      tom(880, inicio + 8.27, 0.17, "square", 0.03);
      tom(1040, inicio + 8.49, 0.55, "sine", 0.07);

      const mudarVolumeTorcida = (volume, em) => {
        temporizadores.push(window.setTimeout(() => {
          ganhoTorcida.gain.setTargetAtTime(silenciado ? 0.0001 : volume, contexto.currentTime, 0.1);
        }, em));
      };
      mudarVolumeTorcida(0.16, 0);
      mudarVolumeTorcida(0.13, 4800);
      mudarVolumeTorcida(0.24, 8200);
      mudarVolumeTorcida(0.001, 11700);

      return {
        parar: () => {
          temporizadores.forEach((temporizador) => window.clearTimeout(temporizador));
          torcida.pause();
          torcida.currentTime = 0;
          torcida.removeAttribute("src");
          master.gain.cancelScheduledValues(contexto.currentTime);
          master.gain.setTargetAtTime(0.0001, contexto.currentTime, 0.08);
          ganhoTorcida.gain.setTargetAtTime(0.0001, contexto.currentTime, 0.08);
          window.setTimeout(() => contexto.close(), 260);
        },
        alternar: () => {
          silenciado = !silenciado;
          ganhoTorcida.gain.setTargetAtTime(silenciado ? 0.0001 : 0.16, contexto.currentTime, 0.04);
          master.gain.setTargetAtTime(silenciado ? 0.0001 : 0.075, contexto.currentTime, 0.04);
          return !silenciado;
        },
      };
    }

    function seguirParaUniversidade() {
      document.getElementById("trilha").style.display = "none";
      elCarta.style.display = "none";
      document.getElementById("painel-historico").style.display = "none";
      window.dispatchEvent(
        new CustomEvent("cb:draft-lendas-completo", { detail: { ...estado.atributos } })
      );
    }

    document.getElementById("btn-iniciar-carreira").addEventListener("click", () => {
      const jogador = window.CB.personagem || {};
      const introducao = document.createElement("section");
      introducao.className = "intro-universidade";
      introducao.setAttribute("role", "dialog");
      introducao.setAttribute("aria-label", "Introdução à jornada universitária");
      introducao.innerHTML = `
        <div class="intro-cortina intro-cortina-superior" aria-hidden="true"></div>
        <div class="intro-cortina intro-cortina-inferior" aria-hidden="true"></div>
        <div class="intro-capitulo" aria-live="polite"></div>
        <div class="intro-conteudo">
          <div class="intro-cena intro-cena-um">
            <span class="intro-kicker">Um novo prospecto entrou no radar</span>
            <h2>${jogador.nome || "Jogador"}</h2>
            <div class="intro-overall"><strong>${overall}</strong><span>OVR</span></div>
          </div>
          <div class="intro-cena intro-cena-dois">
            <span class="intro-kicker">Cinco legados. Um único destino.</span>
            <p>Não é apenas um conjunto de números. É o início de uma história que ainda não tem final.</p>
          </div>
          <div class="intro-cena intro-cena-tres">
            <span class="intro-kicker">DNA em construção</span>
            <p>${estado.historico.map((registro) => registro.lenda).join(" · ")}</p>
          </div>
          <div class="intro-cena intro-cena-quatro">
            <span class="intro-kicker">Meses antes</span>
            <h2>Quem foi o rival?</h2>
            <p>O nome que ficou ligado à sua primeira grande noite.</p>
            <label class="intro-rival-campo">Nome do rival
              <input id="input-rival" maxlength="24" autocomplete="off" placeholder="Ex.: Malik Cross" />
            </label>
            <button class="intro-confirmar-rival" type="button">Confirmar rival</button>
            <small>Se pular a introdução, um rival será sorteado.</small>
          </div>
          <div class="intro-cena intro-cena-rival">
            <span class="intro-kicker">College Showcase Nacional</span>
            <p class="intro-farpa"><b data-rival-nome></b> passa por você no túnel e sorri: “Hoje você vai entender por que essa arena é minha.”</p>
            <p class="intro-farpa intro-farpa-resposta">Você não responde. Apenas olha para a quadra e ajusta a camisa.</p>
          </div>
          <div class="intro-cena intro-cena-origem">
            <span class="intro-kicker">Antes das câmeras</span>
            <p>Você e <b data-rival-nome></b> cresceram ouvindo que só havia espaço para um nome no topo do ranking. Cada treino virou disputa. Cada elogio, uma indireta.</p>
          </div>
          <div class="intro-cena intro-cena-cinco">
            <span class="intro-kicker">Último quarto · 8,4 segundos</span>
            <div class="intro-placar" aria-label="Seu time lidera por 72 a 69"><b>72</b><span>SEU TIME<br><i>8,4 SEG</i><br>RIVAIS</span><b>69</b></div>
            <p>Você já soma 35 pontos e tem a posse. <b data-rival-nome></b> pede a bola para tentar impedir a sua noite perfeita.</p>
          </div>
          <div class="intro-cena intro-cena-seis">
            <span class="intro-kicker">A jogada que mudou tudo</span>
            <p>Você controla o relógio. <b data-rival-nome></b> assume a marcação. Um drible entre as pernas, dois marcadores no garrafão — e a bola sobe no estouro do relógio.</p>
            <strong class="intro-manchete">A BOLA CAI.</strong>
          </div>
          <div class="intro-cena intro-cena-sete">
            <span class="intro-kicker">40 pontos · 14 rebotes · 11 assistências</span>
            <p>Por alguns segundos, ninguém ouve nada além da própria respiração. Então a arena inteira desaba em gritos.</p>
            <strong class="intro-rumo">SEU TIME 75 · RIVAIS 69</strong>
          </div>
          <div class="intro-cena intro-cena-oito">
            <span class="intro-kicker">Depois do buzzer</span>
            <p><b data-rival-nome></b> encara o placar, sem dizer uma palavra. No caminho para o vestiário, ele para ao seu lado: “Da próxima vez, eu termino isso.”</p>
          </div>
          <div class="intro-cena intro-cena-nove">
            <span class="intro-kicker">Na manhã seguinte</span>
            <strong class="intro-manchete">“A NOITE QUE MUDOU O SHOWCASE.”</strong>
            <p>Vídeos da jogada ocupam as redes. Olheiros passam a procurar seu nome.</p>
          </div>
          <div class="intro-cena intro-cena-dez">
            <span class="intro-kicker">O país inteiro está assistindo</span>
            <p>Convites começam a chegar. Programas grandes enxergam potencial; outros enxergam um problema impossível de marcar.</p>
          </div>
          <div class="intro-cena intro-cena-onze">
            <span class="intro-kicker">Prólogo concluído</span>
            <p>O rival espera pela revanche. A primeira escolha é sua.</p>
            <strong class="intro-rumo">Rumo à universidade</strong>
          </div>
          <i class="intro-luz intro-luz-um" aria-hidden="true"></i>
          <i class="intro-luz intro-luz-dois" aria-hidden="true"></i>
        </div>
        <button class="intro-proximo" type="button">Continuar</button>
        <button class="intro-pular" type="button">Pular introdução</button>
        <button class="intro-som" type="button" aria-pressed="true">Som: ligado</button>
      `;
      document.body.appendChild(introducao);
      let controleSom = { parar: () => {}, alternar: () => false };
      let somAtivo = true;
      let audioDoJogoIniciado = false;
      let rivalConfirmado = false;
      let rival = "";
      const roteiro = [
        "intro-cena-um", "intro-cena-dois", "intro-cena-tres", "intro-cena-quatro",
        "intro-cena-origem", "intro-cena-rival", "intro-cena-cinco", "intro-cena-seis",
        "intro-cena-sete", "intro-cena-oito", "intro-cena-nove", "intro-cena-dez", "intro-cena-onze",
      ];
      let indiceCena = 0;
      const titulosDeCapitulo = {
        "intro-cena-um": "PRÓLOGO · O PROSPECTO",
        "intro-cena-dois": "PRÓLOGO · O LEGADO",
        "intro-cena-tres": "PRÓLOGO · O DNA",
        "intro-cena-quatro": "CAPÍTULO I · MESES ANTES",
        "intro-cena-origem": "CAPÍTULO I · A ORIGEM",
        "intro-cena-rival": "CAPÍTULO II · O RIVAL",
        "intro-cena-cinco": "CAPÍTULO III · O SHOWCASE",
        "intro-cena-seis": "CAPÍTULO III · A ÚLTIMA POSSE",
        "intro-cena-sete": "CAPÍTULO III · O BUZZER",
        "intro-cena-oito": "CAPÍTULO IV · A PROMESSA",
        "intro-cena-nove": "CAPÍTULO IV · A MANCHETE",
        "intro-cena-dez": "CAPÍTULO IV · O RADAR",
        "intro-cena-onze": "PRÓXIMO CAPÍTULO · UNIVERSIDADE",
      };
      const mostrarCena = (classe) => {
        introducao.querySelectorAll(".intro-cena").forEach((cena) => cena.classList.toggle("visivel", cena.classList.contains(classe)));
        introducao.querySelector(".intro-capitulo").textContent = titulosDeCapitulo[classe] || "";
      };
      const sortearRival = () => NOMES_DE_RIVAIS[Math.floor(Math.random() * NOMES_DE_RIVAIS.length)];
      const registrarRival = (nome) => {
        rival = nome.trim().slice(0, 24) || sortearRival();
        window.CB.personagem.rival = rival;
        introducao.querySelectorAll("[data-rival-nome]").forEach((el) => { el.textContent = rival; });
      };

      let concluida = false;
      const concluir = () => {
        if (concluida) return;
        concluida = true;
        if (!rival) registrarRival(sortearRival());
        controleSom.parar();
        introducao.classList.add("encerrando");
        window.setTimeout(() => {
          seguirParaUniversidade();
          window.setTimeout(() => introducao.remove(), 420);
        }, 260);
      };

      const ativarCena = (classe) => {
        mostrarCena(classe);
        const proximo = introducao.querySelector(".intro-proximo");
        const aguardaRival = classe === "intro-cena-quatro";
        proximo.hidden = aguardaRival;
        proximo.textContent = classe === "intro-cena-onze" ? "Escolher universidade" : "Continuar";
        if (classe === "intro-cena-cinco" && !audioDoJogoIniciado) {
          controleSom = tocarIntroducaoSonora();
          audioDoJogoIniciado = true;
          if (!somAtivo) controleSom.alternar();
        }
      };
      const avancar = () => {
        if (roteiro[indiceCena] === "intro-cena-onze") {
          concluir();
          return;
        }
        indiceCena += 1;
        ativarCena(roteiro[indiceCena]);
      };

      const confirmarRival = () => {
        if (rivalConfirmado) return;
        rivalConfirmado = true;
        const campo = introducao.querySelector("#input-rival");
        registrarRival(campo.value);
        indiceCena = roteiro.indexOf("intro-cena-origem");
        ativarCena(roteiro[indiceCena]);
      };

      introducao.querySelector(".intro-proximo").addEventListener("click", avancar);
      introducao.querySelector(".intro-pular").addEventListener("click", concluir);
      introducao.querySelector(".intro-som").addEventListener("click", (evento) => {
        somAtivo = !somAtivo;
        if (audioDoJogoIniciado) controleSom.alternar();
        evento.currentTarget.textContent = somAtivo ? "Som: ligado" : "Som: desligado";
        evento.currentTarget.setAttribute("aria-pressed", String(somAtivo));
      });
      introducao.querySelector(".intro-confirmar-rival").addEventListener("click", confirmarRival);
      introducao.querySelector("#input-rival").addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") confirmarRival();
      });
      requestAnimationFrame(() => introducao.classList.add("ativa"));
      window.setTimeout(() => ativarCena(roteiro[0]), 850);
    });
  }

  window.addEventListener("cb:personagem-criado", () => {
    renderRodada();
  });
})();
