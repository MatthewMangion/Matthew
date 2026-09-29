// captions-ep02.mjs — hand-grouped subtitle tracks for EP02 (Maltese on-screen text + English translation)
import fs from 'node:fs';
const G = [
  [0.0, 2.0, 'IN-NANNA KIENET TAF KIF TAĦDEM L-AI.', 'Nanna knew how AI works.'],
  [2.0, 2.75, '(u qatt ma rat kompjuter)', '(and she never saw a computer)'],
  [2.75, 4.0, '7 QWIEL MALTIN LI JISPJEGAW L-AI', '7 Maltese proverbs that explain AI'],
  [4.0, 5.0, 'QAWL 7', 'Proverb 7'],
  [5.0, 7.0, '“Bil-qatra l-qatra timtela l-ġarra.”', '“Drop by drop, the jar fills.”'],
  [7.0, 9.25, "U l-AI? Hekk titgħallem: kelma b'kelma,", 'And AI? That is how it learns: word by word,'],
  [9.25, 11.5, "triljuni ta' drabi.", 'trillions of times.'],
  [12.0, 13.0, 'QAWL 6', 'Proverb 6'],
  [13.0, 15.0, '“Ir-ras meta tifliha tkun taf x’fiha.”', '“Search a head closely and you will know what is in it.”'],
  [15.0, 17.25, 'U l-AI? Lanqas min jibniha ma jaf eżatt x’hemm ġewwa.', 'And AI? Not even its builders know exactly what is inside.'],
  [17.25, 19.5, 'Għalhekk ix-xjenzjati qed ‘jiflu’ moħħha.', 'So scientists are combing through its brain.'],
  [20.0, 21.0, 'QAWL 5', 'Proverb 5'],
  [21.0, 23.0, '“Qattusa għaġġelija frieħ għomja tagħmel.”', '“A hasty cat gives birth to blind kittens.”'],
  [23.0, 24.4, 'U l-AI? Kemm-il ‘r’ hemm f’ “Għargħur”?', 'And AI? How many R’s are in “Għargħur”?'],
  [24.4, 26.25, 'Tweġiba mgħaġġla? Spiss ħażina.', 'A rushed answer? Often wrong.'],
  [26.25, 27.5, 'L-aqwa mudelli llum jieqfu u jaħsbu.', 'Today’s best models stop and think.'],
  [28.0, 29.0, 'QAWL 4', 'Proverb 4'],
  [29.0, 31.0, '“Ix-xogħol agħtih lil min jaf jagħmlu.”', '“Give the job to whoever knows how to do it.”'],
  [31.0, 34.25, 'U l-AI? Tagħmel l-istess:', 'And AI? It does the same:'],
  [34.25, 35.5, 'kull xogħol lill-għodda t-tajba.', 'every job to the right tool.'],
  [36.0, 37.0, 'QAWL 3', 'Proverb 3'],
  [37.0, 39.0, '“Il-ġara tgħallmek tgħammar.”', '“Your neighbour teaches you how to keep house.”'],
  [39.0, 41.25, 'U l-AI? Uriha eżempju…', 'And AI? Show it an example…'],
  [41.25, 43.5, '…u tagħmel bħalu. (fenek → fniek)', '…and it does the same. (rabbit → rabbits)'],
  [44.0, 45.0, 'QAWL 2', 'Proverb 2'],
  [45.0, 47.0, '“Il-giddieb għomru qasir.”', '“A liar’s life is short.”'],
  [47.0, 49.1, "U l-AI? Xi drabi tivvinta — b'kunfidenza sħiħa.", 'And AI? Sometimes it makes things up — with full confidence.'],
  [49.1, 50.5, 'MHUX VERU. Jgħidulha ‘alluċinazzjoni’.', 'NOT TRUE. It is called a “hallucination”.'],
  [50.5, 51.5, 'Iċċekkja dejjem.', 'Always check.'],
  [52.0, 53.0, 'QAWL 1', 'Proverb 1'],
  [53.0, 55.0, '“Bil-kliem u s-sliem tasal kullimkien.”', '“With kind words you get everywhere.”'],
  [55.0, 57.5, 'U l-AI? Illum, bil-kliem tikkmanda l-magni.', 'And AI? Today, words command machines.'],
  [57.5, 58.25, 'U l-Malti? Kliem ukoll.', 'And Maltese? Words too.'],
  [58.25, 60.0, 'KELLIMHA BIL-MALTI.', 'Talk to it in Maltese.'],
  [60.0, 61.0, 'In-nanna kienet taf.', 'Nanna knew.'],
  [61.0, 63.5, 'Liema qawl insejna? Ikteb fil-kummenti.', 'Which proverb did we forget? Tell us in the comments.'],
  [63.5, 64.0, 'IN-NANNA KIENET TAF…', 'Nanna knew…'],
];
const ts = (t) => { const ms = Math.round(t * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`; };
const srt = (k) => G.map(([a, b, mt, en], i) => `${i + 1}\n${ts(a)} --> ${ts(b - 0.02)}\n${k === 'mt' ? mt : en}\n`).join('\n');
fs.mkdirSync('out/ep02', { recursive: true });
fs.writeFileSync('out/ep02/ai-bil-malti-ep02.en.srt', srt('en'));
fs.writeFileSync('out/ep02/ai-bil-malti-ep02.mt.srt', srt('mt'));
console.log(G.length, 'caption groups written');
