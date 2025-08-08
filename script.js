// script.js — versão robusta com espaçamento compacto (aguarda DOMContentLoaded)
(function(){
  'use strict';

  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const EQUIV = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };
  const SECTION_TAGS = /^(intro|other|fade out|end|pre-chorus|pré-refrão|pré refrão|chorus|synth|bassline|solo|riff|sad verse|synth bass intro|verso|refrão|ponte|outro|riff|solo|verse|chorus|bridge|talk|dialog)$/i;

  window.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const must = id => {
      const el = $(id);
      if (!el) console.error(`Elemento com id="${id}" não encontrado no DOM.`);
      return el;
    };

    const input            = must('input');
    const lineNumbers      = must('lineNumbers');
    const preview          = must('preview');
    const upBtn            = must('up');
    const downBtn          = must('down');
    const semitonesSpan    = must('semitones');
    const origKeySelect    = must('orig-key');
    const currentKeyStrong = must('current-key');
    const titleInput       = must('title');
    const composerInput    = must('composer');
    const autorInput       = must('letrista');
    const downloadBtn      = must('download');

    const insertVerseBtn   = must('insert-verse');
    const insertChorusBtn  = must('insert-chorus');
    const insertBridgeBtn  = must('insert-bridge');
    const insertSoloBtn    = must('insert-solo');
    const insertChordBtn   = must('insert-chord');
    const insertBreakBtn   = must('insert-break');

    const exportTxtBtn     = must('export-txt');
    const importFileInput  = must('import-file');

    const toggleLyricsBtn  = must('toggle-lyrics');
    const chordColorPicker = must('chord-color');
    const colorChordsBox   = must('color-chords');

    if (!input || !preview || !lineNumbers) {
      console.error('Elementos essenciais ausentes. Verifique os ids.');
      return;
    }

    let semitones = parseInt(localStorage.getItem('semitones')||'0',10) || 0;
    let lyricsOnly = false;

    function updateLineNumbers() {
      const count = input.value.split('\n').length;
      lineNumbers.innerHTML = Array.from({ length: count }, (_, i) => i + 1).join('<br>');
    }

    function transposeChord(chord, delta) {
      const m = chord.match(/^([A-G][b#]?)(.*)$/);
      if (!m) return chord;
      let [ , root, rest ] = m;
      const norm = EQUIV[root] || root;
      const idx  = NOTES.indexOf(norm);
      if (idx === -1) return chord;
      let ni = (idx + delta) % NOTES.length;
      if (ni < 0) ni += NOTES.length;
      return NOTES[ni] + rest;
    }

    function insertAtCursor(text) {
      const el = input;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = el.value.substring(0, start);
      const after = el.value.substring(end);
      el.value = before + text + after;
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
      el.focus();
      localStorage.setItem('lyrics', input.value);
      updateLineNumbers();
      render();
    }

    function escapeHtml(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function applyChordColor() {
      try {
        const useColor = colorChordsBox && colorChordsBox.checked;
        const color = (chordColorPicker && chordColorPicker.value) || '#1f4fa8';
        document.documentElement.style.setProperty('--chord-color', useColor ? color : '#000000');
      } catch(e) { /* ignore */ }
    }

    function render() {
      applyChordColor();

      const now = new Date();
      const hora_atual = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const data_atual = now.toLocaleDateString();

      const orig = (origKeySelect && origKeySelect.value) || 'C';
      const norm = EQUIV[orig] || orig;
      let idx = NOTES.indexOf(norm);
      if (idx === -1) idx = 0;
      let curIx = (idx + semitones) % NOTES.length;
      if (curIx < 0) curIx += NOTES.length;
      if (currentKeyStrong) currentKeyStrong.textContent = NOTES[curIx];
      if (semitonesSpan) semitonesSpan.textContent = semitones;

      preview.innerHTML = '';
      preview.classList.toggle('lyrics-only', lyricsOnly);

      const meta = document.createElement('div');
      meta.className = 'song-meta';
      meta.innerHTML = `
        <h2>${escapeHtml(titleInput ? titleInput.value : '— Sem título —')}</h2>
        <p>Compositor: ${escapeHtml(composerInput ? composerInput.value : '— —')}</p>
        <p>Letrista: ${escapeHtml(autorInput ? autorInput.value : '— —')}</p>
        <p>Tom original: ${escapeHtml(orig)} | Tom atual: ${NOTES[curIx]}</p>
        <p>Criado em ${data_atual} - ${hora_atual}</p>
        <hr />
      `;
      preview.appendChild(meta);

      const lines = input.value.split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line.toLowerCase() === '<breakline>') {
          const br = document.createElement('div');
          br.className = 'page-break';
          br.textContent = '— Quebra de Página —';
          preview.appendChild(br);
          continue;
        }

        const tagMatch = line.match(/^\[([^\]]+)\]$/);
        if (tagMatch && SECTION_TAGS.test(tagMatch[1])) {
          const lbl = document.createElement('div');
          lbl.className = 'section-label';
          lbl.textContent = tagMatch[1].toUpperCase();
          preview.appendChild(lbl);
          continue;
        }

        const parts = rawLine.split(/(\[[^\]]+\])/g);

        if (lyricsOnly) {
          if (parts.length === 1 && parts[0].trim() === '') {
            const p = document.createElement('p'); p.innerHTML='&nbsp;'; preview.appendChild(p); continue;
          }
          const p = document.createElement('p');
          const lyricText = parts.map(token => /^\[.+\]$/.test(token) ? '' : token).join('');
          p.textContent = lyricText || '\u00A0';
          preview.appendChild(p);
          continue;
        }

        const table = document.createElement('table');
        const rowCh = document.createElement('tr');
        const rowLy = document.createElement('tr');

        for (const token of parts) {
          const tdC = document.createElement('td');
          const tdL = document.createElement('td');
          tdC.className = 'cell-chord';
          tdL.className = 'cell-lyric';

          if (/^\[.+\]$/.test(token)) {
            let chord = token.slice(1,-1).trim();
            chord = transposeChord(chord, semitones);
            // **sem nbsp** — células vazias ficam vazias para evitar altura extra
            tdC.textContent = chord || '';
            tdL.textContent = '';
          } else {
            tdC.textContent = '';
            tdL.textContent = token || '';
          }
          rowCh.appendChild(tdC);
          rowLy.appendChild(tdL);
        }
        table.appendChild(rowCh);
        table.appendChild(rowLy);
        preview.appendChild(table);
      }
    }

    // carrega do storage
    try {
      const savedLyrics   = localStorage.getItem('lyrics');
      const savedTitle    = localStorage.getItem('title');
      const savedComposer = localStorage.getItem('composer');
      const savedLyricist = localStorage.getItem('lyricist');
      const savedOrigKey  = localStorage.getItem('origKey');
      const savedChordColor = localStorage.getItem('chordColor');
      const savedColorEnabled = localStorage.getItem('colorEnabled');

      if (savedLyrics && input) input.value = savedLyrics;
      if (savedTitle && titleInput) titleInput.value = savedTitle;
      if (savedComposer && composerInput) composerInput.value = savedComposer;
      if (savedLyricist && autorInput) autorInput.value = savedLyricist;
      if (savedOrigKey && origKeySelect) origKeySelect.value = savedOrigKey;
      if (savedChordColor && chordColorPicker) chordColorPicker.value = savedChordColor;
      if (savedColorEnabled !== null && colorChordsBox) colorChordsBox.checked = savedColorEnabled === 'true';
    } catch(e) {
      console.warn('Erro ao ler localStorage:', e);
    }

    // listeners
    input.addEventListener('input', () => {
      localStorage.setItem('lyrics', input.value);
      updateLineNumbers();
      render();
    });
    input.addEventListener('scroll', () => { lineNumbers.scrollTop = input.scrollTop; });

    [titleInput, composerInput, autorInput].forEach(el => {
      if (!el) return;
      el.addEventListener('input', () => {
        const key = el === titleInput ? 'title' : el === composerInput ? 'composer' : 'lyricist';
        localStorage.setItem(key, el.value);
        render();
      });
    });

    if (origKeySelect) origKeySelect.addEventListener('input', () => { localStorage.setItem('origKey', origKeySelect.value); render(); });
    if (upBtn) upBtn.addEventListener('click', () => { semitones++; localStorage.setItem('semitones', semitones); render(); });
    if (downBtn) downBtn.addEventListener('click', () => { semitones--; localStorage.setItem('semitones', semitones); render(); });

    if (insertVerseBtn) insertVerseBtn.addEventListener('click', () => insertAtCursor('[Verse]\n'));
    if (insertChorusBtn) insertChorusBtn.addEventListener('click', () => insertAtCursor('[Chorus]\n'));
    if (insertBridgeBtn) insertBridgeBtn.addEventListener('click', () => insertAtCursor('[Bridge]\n'));
    if (insertSoloBtn) insertSoloBtn.addEventListener('click', () => insertAtCursor('[Solo]\n'));
    if (insertChordBtn) insertChordBtn.addEventListener('click', () => insertAtCursor('[C]'));
    if (insertBreakBtn) insertBreakBtn.addEventListener('click', () => insertAtCursor('<breakline>\n'));

    if (exportTxtBtn) exportTxtBtn.addEventListener('click', () => {
      const filename = (titleInput && titleInput.value || 'letra_de_musica').replace(/\s+/g,'_') + '.txt';
      const blob = new Blob([input.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    if (importFileInput) importFileInput.addEventListener('change', (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { input.value = reader.result; localStorage.setItem('lyrics', input.value); updateLineNumbers(); render(); };
      reader.readAsText(f, 'UTF-8'); importFileInput.value = '';
    });

    if (toggleLyricsBtn) toggleLyricsBtn.addEventListener('click', () => { lyricsOnly = !lyricsOnly; toggleLyricsBtn.textContent = lyricsOnly ? 'Mostrar: Letra' : 'Mostrar: Tabela'; render(); });

    if (chordColorPicker) chordColorPicker.addEventListener('input', () => { localStorage.setItem('chordColor', chordColorPicker.value); applyChordColor(); render(); });
    if (colorChordsBox) colorChordsBox.addEventListener('change', () => { localStorage.setItem('colorEnabled', colorChordsBox.checked ? 'true' : 'false'); applyChordColor(); render(); });

    if (downloadBtn) downloadBtn.addEventListener('click', async () => {
      if (!window.html2canvas || !window.jspdf) {
        alert('html2canvas ou jsPDF não carregados. Verifique as bibliotecas CDN em index.html.');
        return;
      }
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const cw = pw - margin * 2;
      let cursorY = margin;
      const blocks = Array.from(preview.children);
      for (const block of blocks) {
        if (block.classList.contains('page-break')) { pdf.addPage(); cursorY = margin; continue; }
        const canvas = await html2canvas(block, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const imgW = cw;
        const imgH = (canvas.height * imgW) / canvas.width;
        if (cursorY + imgH > ph - margin) { pdf.addPage(); cursorY = margin; }
        pdf.addImage(imgData, 'PNG', margin, cursorY, imgW, imgH);
        cursorY += imgH + 6;
      }
      const filename = (titleInput && titleInput.value || 'letra_de_musica').replace(/\s+/g,'_') + '.pdf';
      pdf.save(filename);
    });

    // init
    updateLineNumbers();
    render();
    console.info('Editor inicializado — agora a prévia deve atualizar com espaçamento compacto.');
  });
})();
