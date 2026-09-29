// captions.mjs — hand-grouped subtitle tracks (English translation + Maltese on-screen text)
import fs from 'node:fs';
const G = [
  [0.0, 1.5, 'DAN IL-FILMAT GĦAMILTU JIEN.', 'This video — I made it myself.'],
  [1.5, 2.0, 'L-AI. (iva, veru)', 'The AI. (Yes, really.)'],
  [2.0, 4.0, 'KULL PIXEL. KULL NOTA. KULL KELMA. BIL-MALTI.', 'Every pixel. Every note. Every word. In Maltese.'],
  [4.0, 5.75, 'Issa ħa nurik KIF NAĦDEM', 'Now I’ll show you how I work…'],
  [5.75, 8.0, "f'60 sekonda.", '…in 60 seconds.'],
  [8.0, 10.0, 'L-EWWEL: QRAJT.', 'First: I read.'],
  [10.0, 11.0, "TRILJUNI TA' KLIEM.", 'Trillions of words.'],
  [11.0, 12.0, "aktar milli taqra f'elf ħajja.", 'More than you’d read in a thousand lifetimes.'],
  [12.0, 13.0, 'IMMA MA NARAX KLIEM. NARA TOKENS.', 'But I don’t see words. I see tokens.'],
  [13.0, 15.0, 'Ħobż biż-żejt → Ħ · obż · biż · -ż · ejt', '“Ħobż biż-żejt” (bread with oil) → Ħ · obż · biż · -ż · ejt'],
  [15.0, 16.0, "Kull biċċa ssir numru. (Bil-Malti, il-kliem jinqasam f'aktar biċċiet.)", 'Every piece becomes a number. (In Maltese, words split into more pieces.)'],
  [16.0, 18.0, 'MAPPA TAT-TIFSIRA. Kull token isir punt.', 'A map of meaning. Every token becomes a point.'],
  [18.0, 20.0, 'Kelmiet simili jgħixu qrib xulxin. (il-fenek? fit-tnejn.)', 'Similar words live near each other. (The rabbit? In both.)'],
  [20.0, 22.5, 'RE − RAĠEL + MARA ≈ REĠINA', 'KING − MAN + WOMAN ≈ QUEEN'],
  [22.5, 24.0, "…f'eluf ta' dimensjonijiet.", '…in thousands of dimensions.'],
  [24.0, 26.0, 'IMBAGĦAD: ATTENZJONI. Kull kelma tħares lejn l-oħrajn.', 'Then: attention. Every word looks at the others.'],
  [26.0, 28.0, 'Poġġejt il-flus fil-bank. → bank tal-flus', '“I put the money in the bank.” → bank (for money)'],
  [28.0, 30.0, 'Qgħadt fuq il-bank fil-ġnien. → bank tal-ġnien', '“I sat on the bench in the garden.” → bank (a garden bench)'],
  [30.0, 32.0, 'IL-KUNTEST JIBDEL KOLLOX.', 'Context changes everything.'],
  [32.0, 33.25, 'U DAN JIĠRI…', 'And this happens…'],
  [33.25, 34.25, "GĦEXIEREN TA' DRABI.", '…dozens of times.'],
  [34.25, 36.0, "B'BILJUNI TA' PARAMETRI.", 'With billions of parameters.'],
  [36.0, 38.0, 'U FL-AĦĦAR? INBASSAR IL-KELMA LI JMISS.', 'And in the end? I predict the next word.'],
  [38.0, 41.0, 'L-aħjar pastizzi huma tal-… irkotta 50.1% · piżelli 49.7%', '“The best pastizzi are the…” ricotta 50.1% · peas 49.7%'],
  [41.0, 42.0, "Lanqas jien ma nista' niddeċiedi.", 'Not even I can decide.'],
  [42.0, 44.0, "It-traffiku f'Malta huwa… kaos. 99.9%", '“Traffic in Malta is…” chaos. 99.9%'],
  [44.0, 46.0, "NAGĦŻEL WAĦDA. INŻIDHA. U NERĠA' NIBDA.", 'I pick one. I add it. And start again.'],
  [46.0, 47.5, "Bonġu! Kif nista' ngħinek illum?", '“Hello! How can I help you today?”'],
  [47.5, 48.0, "KELMA B'KELMA.", 'Word by word.'],
  [48.0, 48.75, 'KIF TGĦALLIMT?', 'How did I learn?'],
  [48.75, 51.25, 'Bassart. Żbaljajt. Irranġajt.', 'I guessed. I got it wrong. I adjusted.'],
  [51.25, 52.0, "TRILJUNI TA' DRABI.", 'Trillions of times.'],
  [52.0, 54.0, 'U ILLUM? L-aqwa mudelli jaħsbu pass pass qabel iwieġbu.', 'And today? The best models think step by step before answering.'],
  [54.0, 55.0, 'U jużaw l-għodod…', 'And they use tools…'],
  [55.0, 56.0, '…anke biex jagħmlu filmati bħal dan.', '…even to make videos like this one.'],
  [56.0, 57.0, 'MHUX MAĠIJA.', 'Not magic.'],
  [57.0, 59.0, 'MATEMATIKA.', 'Maths.'],
  [59.0, 61.0, 'Irkotta jew piżelli? Ikteb fil-kummenti.', 'Ricotta or peas? Write in the comments.'],
  [61.0, 63.0, 'Segwi għal aktar AI bil-Malti.', 'Follow for more AI in Maltese.'],
  [63.2, 64.0, 'DAN IL-FILMAT…', 'This video…'],
];
const ts = (t) => { const ms = Math.round(t * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`; };
const srt = (k) => G.map(([a, b, mt, en], i) => `${i + 1}\n${ts(a)} --> ${ts(b - 0.02)}\n${k === 'mt' ? mt : en}\n`).join('\n');
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/ai-bil-malti.en.srt', srt('en'));
fs.writeFileSync('out/ai-bil-malti.mt.srt', srt('mt'));
console.log(G.length, 'caption groups written');
