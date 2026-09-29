// fonts.js — registers variable-font instances usable from <canvas>.
// Canvas can't animate font-stretch continuously, so every integer width 62–125 of Archivo
// gets its own face with a fixed font-stretch descriptor (the browser clamps the wdth axis to it).
(function (G) {
  const BASE = 'assets/fonts/';
  async function loadFonts() {
    const [arch, isi, isr, jb] = await Promise.all(
      ['Archivo-VF.ttf', 'InstrumentSerif-Italic.ttf', 'InstrumentSerif-Regular.ttf', 'JetBrainsMono-VF.ttf'].map((f) =>
        fetch(BASE + f).then((r) => r.arrayBuffer())
      )
    );
    const faces = [];
    for (let w = 62; w <= 125; w++) {
      faces.push(new FontFace('A' + w, arch, { weight: '100 900', stretch: w + '%' }));
    }
    faces.push(new FontFace('IS', isi, { style: 'italic', weight: '400' }));
    faces.push(new FontFace('ISR', isr, { weight: '400' }));
    faces.push(new FontFace('JB', jb, { weight: '100 800' }));
    await Promise.all(faces.map((f) => f.load()));
    faces.forEach((f) => document.fonts.add(f));
    // warm up glyph caches (incl. Maltese letters) so the first frames are not blank
    const probe = document.createElement('canvas').getContext('2d');
    const sample = 'ĊċĠġĦħŻżGĦAQDAabcxyz0123456789€%';
    for (const f of faces) {
      probe.font = `${f.style === 'italic' ? 'italic ' : ''}700 40px ${f.family}`;
      probe.fillText(sample, 0, 40);
    }
    await document.fonts.ready;
  }
  G.loadFonts = loadFonts;
})(window);
