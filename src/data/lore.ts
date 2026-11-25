import { FactionInfo, WorldRegion } from '../types/game';

export const LORE_CHRONICLES = [
  {
    id: 'parte_1',
    chapter: 'Parte I',
    title: 'A Era do Grande Selo e a Queda de Oakhaven',
    paragraphs: [
      'Há mil anos, o mundo de Aeldrin não era dividido em continentes fragmentados e regiões de névoa mortal. Existia apenas um único continente contínuo, sustentado por Sete Pilares da Alma — colossais obeliscos forjados pela primeira geração de mortais e abençoados pelos Astros Gêmeos (Solarius, a Chama da Ordem, e Noctis, a Maré do Silêncio).',
      'Sob esses pilares floresceu o Império de Aurelia, uma civilização onde a magia arcana, a forja marcial, a precisão do caçador e a devoção sagrada conviviam em equilíbrio. Cada cidadão recebia, na maioridade, um Selo de Resposta que indicava sua afinidade natural com as forças do mundo: o aço, o éter, a sombra, o horizonte ou a luz.',
      'Nas profundezas do Abismo de Cinder, uma entidade conhecida como O Arquiteto do Vazio descobriu uma brecha entre as camadas da realidade. Ele não desejava destruir Aeldrin com fogo ou exércitos; ele queria reescrever o código da existência, apagando memórias, invertendo causas e efeitos e transformando seres vivos em ecos sem vontade.',
      'Para detê-lo, Cinco Heróis Originais uniram seus corpos, almas e artefatos no centro do continente. Eles selaram o Arquiteto dentro de uma Fenda Temporal no coração do que hoje se chama A Cicatriz de Cinzas — mas o selo partiu o continente, quebrou o fluxo do tempo e fragmentou as Caminhas das Almas em 30 subclasses e 9 caminhos secretos.',
    ],
  },
  {
    id: 'parte_2',
    chapter: 'Parte II',
    title: 'O Mundo Atual: Um Continente em Guerra Silenciosa',
    paragraphs: [
      'Hoje, Aeldrin vive uma paz frágil. A Cidadela de Valen tenta manter a ordem entre as facções, mas o mundo está à beira de um novo colapso: fissuras temporais estão se abrindo em todo o mapa, trazendo relíquias de eras mortas e Ecos de pessoas que ainda não nasceram ou já morreram.',
      'As antigas marcas de afinidade sofrem interferência do Vazio. Alguns jovens nascem com assinaturas instáveis — Viajantes Marcados capazes de trilhar múltiplas frequências, dominar habilidades evolutivas e despertar classes secretas temidas até pelos maiores mestres.',
    ],
  },
  {
    id: 'parte_4',
    chapter: 'Parte IV',
    title: 'O Gancho Maior: Quem Escreveu o Selo?',
    paragraphs: [
      'No fim da jornada, revela-se que O Arquiteto do Vazio não invadiu Aeldrin por acaso. O continente foi forjado como um laboratório de almas para testar como seres mortais reagem quando o destino é quebrado em múltiplos caminhos.',
      'Cada escolha feita pelo Viajante Marcado — qual classe base escolheu, qual subclasse abraçou, se decidiu executar ou curar Malakor, quais segredos desbloqueou — altera qual versão de Aeldrin sobrevive quando o véu finalmente se abre por inteiro.',
    ],
  },
];

export const FACTIONS: FactionInfo[] = [
  {
    id: 'amanhecer',
    name: 'A Ordem do Amanhecer',
    seat: 'Cidadela de Valen',
    philosophy:
      'Defende que o Grande Selo deve ser mantido a qualquer custo, mesmo censurando histórias proibidas e reprimindo magias e classes secretas.',
    color: '#D4A853',
  },
  {
    id: 'ciclo',
    name: 'Os Filhos do Ciclo',
    seat: 'Santuários Errantes',
    philosophy:
      'Acreditam que o selo está apodrecendo por dentro e que a única forma de salvar Aeldrin é reabrir e refazer o pacto original.',
    color: '#8B5CF6',
  },
  {
    id: 'cinzas',
    name: 'O Sindicato das Cinzas',
    seat: 'Rotas da Cicatriz',
    philosophy:
      'Caçadores de relíquias, mercenários e contrabandistas que lucram com o caos, negociando artefatos temporais e segredos de ruínas ocultas.',
    color: '#D97706',
  },
];

export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'kael_dorn',
    name: 'Muralhas de Kael-Dorn',
    subtitle: 'Fronteira de Ferro e Pontes Partidas',
    dangerLevel: 'Nível 15–35',
    subStoryTitle: 'O Juramento Quebrado da Guarda de Ferro',
    subStoryText:
      'Há trezentos anos, o comandante Vaelen de Kael quebrou o próprio juramento de nunca recuar para salvar três mil civis presos no vale inferior. Assumiu sozinho a retaguarda numa ponte estreita por três dias, banhado em sangue corrompido.',
    questHook:
      'Os descendentes da Guarda ainda caçam "traidores", enquanto o espírito de Vaelen aguarda quem compreenda que sobreviver para proteger é mais difícil que morrer por orgulho.',
    classConnection: 'Guardião, Berserker, Tirano de Sangue e Quebrador de Céus',
    mapX: 20,
    mapY: 32,
    color: '#D97706',
    bossIds: ['kael7', 'vaelen'],
  },
  {
    id: 'vale_laminas',
    name: 'Vale das Lâminas Partidas',
    subtitle: 'Pântanos Corrompidos e Campos de Cerco',
    dangerLevel: 'Nível 20–40',
    subStoryTitle: 'As Cicatrizes das Hordas de Sangue',
    subStoryText:
      'Abaixo das muralhas de Kael-Dorn jaz o vale onde milhares de armas quebraram durante o cerco. O solo absorveu toxinas e sangue corrompido, gerando feras mutantes de regeneração rápida.',
    questHook:
      'Rastrear as crias mutantes revela como o veneno e o sangramento podem despertar lâminas vivas.',
    classConnection: 'Mestre dos Venenos, Duelista e Ceifador Carmesim',
    mapX: 30,
    mapY: 62,
    color: '#10B981',
    bossIds: ['hidra_cinzas'],
  },
  {
    id: 'mirath',
    name: 'Arquipélago das Marés Presas',
    subtitle: 'Biblioteca Submersa em Loop de 7 Minutos',
    dangerLevel: 'Nível 30–55',
    subStoryTitle: 'A Biblioteca Submersa de Mirath e o Erro do Cronomante',
    subStoryText:
      'O arquimago Lyraen tentou criar um espelho temporal para observar o dia anterior à queda de Aurelia. O experimento travou a ilha num ciclo eterno de sete minutos enquanto séculos se passaram do lado de fora.',
    questHook:
      'Ao entrar no arquipélago, o jogador encontra versões de um mesmo NPC em diferentes graus de consciência sobre o loop.',
    classConnection: 'Cronomante, Arquimago do Caos Primordial e Escriba das Estrelas',
    mapX: 78,
    mapY: 28,
    color: '#3B82F6',
    bossIds: ['relojoeiro_mirath', 'lyraen'],
  },
  {
    id: 'nyx',
    name: 'Baixos-Fundos de Nyx',
    subtitle: 'Cidade das Lanternas Azuis e Catacumbas',
    dangerLevel: 'Nível 35–60',
    subStoryTitle: 'A Guilda dos Nomes Apagados',
    subStoryText:
      'Em Nyx existe um mercado onde não se paga com ouro, mas com memórias, sombras ou o próprio nome. Seu líder, O Zero, afirma que a história de Aeldrin foi editada e há pessoas vivas arrancadas das crônicas.',
    questHook:
      'Uma mensageira esqueceu quem contratou sua última entrega — mas a carta carrega um selo de oitocentos anos atrás.',
    classConnection: 'Assassino das Sombras, Caminhante do Véu e Ceifador Carmesim',
    mapX: 25,
    mapY: 80,
    color: '#38BDF8',
    bossIds: ['sussurro_nyx', 'o_zero'],
  },
  {
    id: 'aethel',
    name: 'Picos de Aethel',
    subtitle: 'Floresta dos Sussurros e Penhascos do Eclipse',
    dangerLevel: 'Nível 40–65',
    subStoryTitle: 'O Último Canto do Eclipse',
    subStoryText:
      'Os Observadores do Horizonte vigiavam as rotas entre os mundos. Quando o céu rasgou, colossos alados desceram das tempestades. Sera do Vento Branco abateu um titã com arco de osso de dragão e desapareceu após o disparo.',
    questHook:
      'Durante tempestades e eclipses, ecos de caçadas antigas atravessam rochas como se fossem névoa.',
    classConnection: 'Atirador de Elite, Caçador de Dragões/Titãs e Arqueiro Fantasma',
    mapX: 62,
    mapY: 18,
    color: '#0EA5E9',
    bossIds: ['sera'],
  },
  {
    id: 'solenis',
    name: 'Ruínas de Solenis',
    subtitle: 'Santuário Dourado e Violeta',
    dangerLevel: 'Nível 45–70',
    subStoryTitle: 'O Santuário do Crepúsculo e o Herege de Luz',
    subStoryText:
      'Quando uma praga do Vazio atingiu Solenis, o sumo sacerdote Malakor descobriu que a luz pura apenas queimava as almas corrompidas mais rápido. Ao unir preces sagradas e drenagem sombria, foi declarado herege pela Ordem.',
    questHook:
      'Você encontra um chefe amaldiçoado em agonia — escolher curá-lo ou executá-lo altera o destino da região.',
    classConnection: 'Sumo Sacerdote, Inquisidor, Exorcista e Apóstolo do Crepúsculo',
    mapX: 74,
    mapY: 72,
    color: '#A855F7',
    bossIds: ['arauto_solenis', 'malakor'],
  },
  {
    id: 'cicatriz_cinzas',
    name: 'A Cicatriz de Cinzas',
    subtitle: 'Epicentro do Grande Selo e Fenda do Vazio',
    dangerLevel: 'Raid End-Game (Nível 70+)',
    subStoryTitle: 'O Coração da Fratura Temporal',
    subStoryText:
      'O ponto exato onde os Cinco Heróis Originais estilhaçaram a ponte do Vazio e aprisionaram o Arquiteto. Aqui, gravidade, tempo, vida e morte obedecem a leis paradoxais.',
    questHook:
      'As 10 habilidades Quebra-Jogo ressoam com força máxima contra quem tenta reescrever o Grande Selo.',
    classConnection: 'Todas as 5 Classes · Sinergia Híbrida e Habilidades Paradoxais',
    mapX: 50,
    mapY: 48,
    color: '#8B5CF6',
    bossIds: ['arquiteto_vazio'],
  },
];
