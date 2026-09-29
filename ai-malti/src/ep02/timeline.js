// ep02/timeline.js — EP02 "7 Qwiel tan-Nanna": scene windows, script and audio cues.
// 120 BPM → beat 0.5 s, bar 2 s. Each proverb owns 4 bars (8 s): tile-flip into its number card on the downbeat,
// flip into the scene half a bar later, proverb on beats 3–6, "U L-AI?" on beat 7, the AI lesson after.
(function (root) {
  const S = {
    hook: [0, 4],
    p7: [4, 12],
    p6: [12, 20],
    p5: [20, 28],
    p4: [28, 36],
    p3: [36, 44],
    p2: [44, 52],
    p1: [52, 60],
    outro: [60, 64],
  };
  // proverb segments in order of appearance (countdown 7 → 1)
  const SEG = [
    { key: 'p7', n: 7, T: 4 },
    { key: 'p6', n: 6, T: 12 },
    { key: 'p5', n: 5, T: 20 },
    { key: 'p4', n: 4, T: 28 },
    { key: 'p3', n: 3, T: 36 },
    { key: 'p2', n: 2, T: 44 },
    { key: 'p1', n: 1, T: 52 },
  ];

  // All proverbs verified against qawl.mt page titles or multiple published sources.
  const SCRIPT = [
    [0.0, 'IN-NANNA KIENET TAF KIF TAĦDEM L-AI.', 'Nanna knew how AI works.'],
    [2.0, '(u qatt ma rat kompjuter)', '(and she never saw a computer)'],
    [2.75, '7 QWIEL MALTIN LI JISPJEGAW L-AI', '7 Maltese proverbs that explain AI'],
    [5.0, 'Bil-qatra l-qatra timtela l-ġarra.', 'Drop by drop, the jar fills.'],
    [7.25, "Hekk titgħallem l-AI: kelma b'kelma, triljuni ta' drabi.", 'That is how AI learns: word by word, trillions of times.'],
    [13.0, "Ir-ras meta tifliha tkun taf x'fiha.", 'Search a head closely and you learn what is in it.'],
    [15.25, "Lanqas min jibniha ma jaf eżatt x'hemm ġewwa. Għalhekk ix-xjenzjati qed 'jiflu' moħħha.", 'Not even its builders know exactly what is inside. So scientists are combing through its brain.'],
    [21.0, 'Qattusa għaġġelija frieħ għomja tagħmel.', 'A hasty cat gives birth to blind kittens.'],
    [23.25, "Kemm-il 'r' hemm f'“Għargħur”? Mgħaġġel: 1 ✗ — Jaħseb: 2 ✓", 'How many r’s in “Għargħur”? Hasty: 1 ✗ — Thinking: 2 ✓'],
    [29.0, 'Ix-xogħol agħtih lil min jaf jagħmlu.', 'Give the job to whoever knows how to do it.'],
    [31.25, "L-AI tagħmel l-istess: kull xogħol lill-għodda t-tajba.", 'AI does the same: every job to the right tool.'],
    [37.0, 'Il-ġara tgħallmek tgħammar.', 'Your neighbour teaches you how to keep house.'],
    [39.25, 'Uriha eżempju… u tagħmel bħalu. qattus → qtates, kelb → klieb, fenek → fniek', 'Show it an example… and it does the same.'],
    [45.0, 'Il-giddieb għomru qasir.', 'A liar’s life is short.'],
    [47.25, "Xi drabi tivvinta — b'kunfidenza sħiħa. Jgħidulha 'alluċinazzjoni'. Iċċekkja dejjem.", 'Sometimes it makes things up — confidently. It is called “hallucination”. Always check.'],
    [53.0, 'Bil-kliem u s-sliem tasal kullimkien.', 'With kind words you get everywhere.'],
    [55.25, 'Illum, bil-kliem tikkmanda l-magni. U l-Malti? Kliem ukoll. Kellimha bil-Malti.', 'Today, words command machines. And Maltese? Words too. Talk to it in Maltese.'],
    [60.0, 'In-nanna kienet taf.', 'Nanna knew.'],
    [61.0, 'Liema qawl insejna? Ikteb fil-kummenti.', 'Which proverb did we forget? Write it in the comments.'],
  ];

  const CUES = [
    // hook
    [0.0, 'impact', { size: 1.0 }],
    [0.5, 'glint', {}],
    [1.0, 'hit', { note: 50 }],
    [1.5, 'hit', { note: 53 }],
    [1.5, 'glitch', { dur: 0.22 }],
    [2.0, 'pop', { note: 79 }],
    [2.75, 'stab', { note: 62 }],
    [3.25, 'whoosh', { dur: 0.4 }],
    // p7 — ġarra
    [5.0, 'plip', { note: 84 }], [5.5, 'plip', { note: 88 }], [6.0, 'plip', { note: 86 }], [6.5, 'plip', { note: 91 }],
    [7.75, 'plip', { note: 84 }], [8.0, 'plip', { note: 86 }], [8.25, 'plip', { note: 88 }], [8.5, 'plip', { note: 91 }],
    [8.75, 'stream', { dur: 1.9 }],
    [9.25, 'hit', { note: 57 }],
    [10.75, 'shimmer', { dur: 0.8 }],
    // p6 — ras
    [13.5, 'shimmer', { dur: 1.4, soft: 1 }],
    [16.5, 'whoosh', { dur: 0.45 }],
    [17.0, 'ping', { note: 84 }], [17.5, 'ping', { note: 88 }], [18.0, 'ping', { note: 91 }],
    // p5 — qattusa
    [21.0, 'zoom', {}],
    [21.75, 'pop', { note: 84 }], [21.9, 'pop', { note: 88 }], [22.05, 'pop', { note: 91 }],
    [23.25, 'type', { n: 16, dur: 0.6 }],
    [24.1, 'blip', { note: 72 }],
    [24.4, 'buzz', {}],
    [24.9, 'tick', { note: 76 }], [25.02, 'tick', { note: 76 }], [25.14, 'tick', { note: 79 }], [25.26, 'tick', { note: 76 }], [25.38, 'tick', { note: 76 }], [25.5, 'tick', { note: 79 }],
    [25.8, 'ping', { note: 88 }], [26.0, 'ping', { note: 91 }],
    [26.25, 'ding', {}],
    // p4 — xogħol
    [30.0, 'pop', { note: 72 }], [30.25, 'pop', { note: 76 }], [30.5, 'pop', { note: 79 }],
    [31.75, 'whoosh', { dur: 0.35 }], [32.1, 'clunk', {}], [32.4, 'ding', {}],
    [32.5, 'whoosh', { dur: 0.35 }], [32.85, 'clunk', {}], [33.15, 'ding', {}],
    [33.25, 'whoosh', { dur: 0.35 }], [33.6, 'clunk', {}], [33.9, 'ding', {}],
    // p3 — il-ġara
    [37.0, 'hit', { note: 50, soft: 1 }],
    [37.5, 'swish', {}], [38.1, 'swish', {}],
    [38.3, 'pop', { note: 84 }], [38.5, 'pop', { note: 88 }],
    [39.75, 'type', { n: 14, dur: 0.4 }], [40.25, 'type', { n: 12, dur: 0.35 }], [40.75, 'type', { n: 8, dur: 0.3 }],
    [41.25, 'type', { n: 5, dur: 0.35 }],
    [41.75, 'ding', {}],
    // p2 — il-giddieb
    [45.0, 'pop', { note: 67 }],
    [45.25, 'pop', { note: 72 }], [45.4, 'pop', { note: 76 }], [45.55, 'pop', { note: 79 }],
    [48.5, 'whoosh', { dur: 0.4 }],
    [48.8, 'drain', { dur: 0.3 }],
    [49.1, 'impact', { size: 1.0 }],
    [49.2, 'poof', {}], [49.35, 'poof', {}],
    [50.5, 'hit', { note: 62 }],
    // p1 — il-kliem
    [54.5, 'swish', {}],
    [55.25, 'type', { n: 26, dur: 0.75 }],
    [56.0, 'send', {}],
    [56.0, 'riser', { dur: 0.8 }],
    [56.8, 'impact', { size: 0.7 }],
    [56.8, 'pop', { note: 72 }], [56.9, 'pop', { note: 76 }], [57.0, 'pop', { note: 79 }], [57.1, 'pop', { note: 84 }], [57.2, 'pop', { note: 88 }],
    [58.25, 'stab', { note: 74, big: 1 }],
    [59.5, 'flips', { dur: 0.5 }],
    // outro
    [60.0, 'hit', { note: 50 }],
    [61.0, 'stab', { note: 62 }],
    [61.4, 'pop', { note: 79 }],
    [62.25, 'blip', { note: 84 }],
    [63.2, 'reverse', { dur: 0.8 }],
    [63.5, 'flips', { dur: 0.5 }],
  ];
  // shared per-segment cues: flip to card, card slam, flip into scene, proverb words, kicker
  for (const g of SEG) {
    CUES.push([g.T - 0.5, 'flips', { dur: 0.5 }]);
    CUES.push([g.T, 'impact', { size: 0.8 }]);
    CUES.push([g.T, 'numeral', { n: g.n }]);
    CUES.push([g.T + 0.5, 'flips', { dur: 0.5 }]);
    [1.0, 1.5, 2.0, 2.5].forEach((d, i) => CUES.push([g.T + d, 'word', { i }]));
    CUES.push([g.T + 3.0, 'kicker', {}]);
  }
  CUES.sort((a, b) => a[0] - b[0]);

  const TL = { S, SEG, SCRIPT, CUES, DURATION: 64, BPM: 120, EP: '02' };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL;
  else root.TL = TL;
})(typeof window !== 'undefined' ? window : globalThis);
