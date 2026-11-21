/**
 * Sprites em pixel art 12×12, desenhados como SVG (nítidos em qualquer tamanho).
 * Cada letra é uma cor da paleta do sprite; "." é transparente.
 */
const SPRITES = {
  trophy: {
    palette: { Y: '#e09f1f', y: '#ffd166', w: '#fff6d5', b: '#8a5a2b' },
    rows: [
      '............',
      '..YYYYYYYY..',
      'Y.YyyyyywY.Y',
      'Y.YyyyyywY.Y',
      '.YYyyyyyyYY.',
      '...YyyyyY...',
      '....YyyY....',
      '.....YY.....',
      '.....YY.....',
      '...YYYYYY...',
      '..bbbbbbbb..',
      '..bbbbbbbb..',
    ],
  },
  star: {
    palette: { S: '#1fb6dc', s: '#4de1ff', w: '#e6fbff' },
    rows: [
      '.....SS.....',
      '.....SS.....',
      '....SwsS....',
      'SSSSswssSSSS',
      '.SSssssssSS.',
      '..SssssssS..',
      '...SssssS...',
      '..SssSSssS..',
      '..SsS..SsS..',
      '.SSS....SSS.',
      '.S........S.',
      '............',
    ],
  },
  shirt: {
    palette: { B: '#3fbf66', b: '#7cf29c', w: '#f2fff5' },
    rows: [
      '...BB..BB...',
      '..BbbwwbbB..',
      '.BbbbbbbbbB.',
      'BbbbbbbbbbbB',
      'BBB.bbbb.BBB',
      '...Bbbbbb...',
      '...BbwwbB...',
      '...BbbbwB...',
      '...BbwwbB...',
      '...BbwbbB...',
      '...BbwwwB...',
      '...BBBBBB...',
    ],
  },
  bench: {
    palette: { P: '#6d55c9', p: '#a98bff' },
    rows: [
      '............',
      '............',
      '............',
      '.PPPPPPPPPP.',
      '.PppppppppP.',
      '.PPPPPPPPPP.',
      '.P........P.',
      'PPPPPPPPPPPP',
      'PppppppppppP',
      '.P........P.',
      '.P........P.',
      '.P........P.',
    ],
  },
  cone: {
    palette: { O: '#ff9f5a', w: '#fff3e6', d: '#8a4b20' },
    rows: [
      '.....OO.....',
      '.....OO.....',
      '....OwwO....',
      '....OwwO....',
      '....OOOO....',
      '...OOOOOO...',
      '...wwwwww...',
      '..OOOOOOOO..',
      '..OOOOOOOO..',
      '.OOOOOOOOOO.',
      'dddddddddddd',
      'dddddddddddd',
    ],
  },
  flag: {
    palette: { k: '#c9d6e8', R: '#ff4f8b', Y: '#ffd166' },
    rows: [
      '.k..........',
      '.kRRRRYYYY..',
      '.kRRRRYYYY..',
      '.kRRRRYYYY..',
      '.kYYYYRRRR..',
      '.kYYYYRRRR..',
      '.kYYYYRRRR..',
      '.k..........',
      '.k..........',
      '.k..........',
      '.k..........',
      'kkk.........',
    ],
  },
  ball: {
    palette: { w: '#f4f7fb', g: '#b8c4d6', k: '#0b1424' },
    rows: [
      '....wwww....',
      '..wwwwwwww..',
      '.wwwkkkkwww.',
      '.wwwkkkkwgw.',
      'wkwwwkkwwwkw',
      'wkkwwwwwwkkw',
      'wkwwwwwwwwkw',
      'wwwwkkkwwwww',
      '.wwkkkkkwgw.',
      '.wwwkkkwwgw.',
      '..wwwwwwgg..',
      '....gggg....',
    ],
  },
};

/** Monta o SVG juntando pixels vizinhos da mesma cor em uma faixa só. */
export function sprite(name, className = 'sprite') {
  const s = SPRITES[name] || SPRITES.ball;
  let rects = '';
  s.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w++;
      if (ch !== '.') rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${s.palette[ch]}"/>`;
      x += w;
    }
  });
  return `<svg class="${className}" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}
