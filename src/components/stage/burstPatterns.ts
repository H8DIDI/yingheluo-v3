export type BurstPatternId =
  | 'ring'
  | 'heart'
  | 'star'
  | 'diamond'
  | 'butterfly'
  | 'text-love'
  | 'text-520'
  | 'text-custom';

type BurstPatternKind = 'shape' | 'text';

type BurstPatternMeta = {
  id: BurstPatternId;
  kind: BurstPatternKind;
  label: string;
};

const LETTER_PATTERNS: Record<string, string[]> = {
  L: ['1000', '1000', '1000', '1000', '1111'],
  O: ['0110', '1001', '1001', '1001', '0110'],
  V: ['10001', '10001', '10001', '01010', '00100'],
  E: ['1111', '1000', '1110', '1000', '1111'],
  '5': ['1111', '1000', '1110', '0001', '1110'],
  '2': ['1110', '0001', '0110', '1000', '1111'],
  '0': ['0110', '1001', '1001', '1001', '0110'],
};

const PATTERN_META: Record<BurstPatternId, BurstPatternMeta> = {
  ring: { id: 'ring', kind: 'shape', label: 'RING' },
  heart: { id: 'heart', kind: 'shape', label: 'HEART' },
  star: { id: 'star', kind: 'shape', label: 'STAR' },
  diamond: { id: 'diamond', kind: 'shape', label: 'DIAMOND' },
  butterfly: { id: 'butterfly', kind: 'shape', label: 'BUTTERFLY' },
  'text-love': { id: 'text-love', kind: 'text', label: 'LOVE' },
  'text-520': { id: 'text-520', kind: 'text', label: '520' },
  'text-custom': { id: 'text-custom', kind: 'text', label: 'YHL' },
};

export function resolveBurstPatternMeta(pattern: BurstPatternId): BurstPatternMeta {
  return PATTERN_META[pattern];
}

function buildStarPoints(count: number, scale: number): Array<[number, number, number]> {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const radius = index % 2 === 0 ? scale : scale * 0.42;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
  });
}

function buildHeartPoints(count: number, scale: number): Array<[number, number, number]> {
  return Array.from({ length: count }, (_, index) => {
    const t = (index / count) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x * scale * 0.08, (y - 2) * scale * 0.08, 0];
  });
}

function buildRingPoints(count: number, scale: number): Array<[number, number, number]> {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.cos(angle) * scale, 0, Math.sin(angle) * scale];
  });
}

function buildDiamondPoints(count: number, scale: number): Array<[number, number, number]> {
  const corners: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];

  return Array.from({ length: count }, (_, index) => {
    const t = index / count;
    const segment = Math.floor(t * corners.length);
    const localT = (t * corners.length) % 1;
    const [ax, ay] = corners[segment % corners.length];
    const [bx, by] = corners[(segment + 1) % corners.length];
    return [(ax + (bx - ax) * localT) * scale, (ay + (by - ay) * localT) * scale, 0];
  });
}

function buildButterflyPoints(count: number, scale: number): Array<[number, number, number]> {
  return Array.from({ length: count }, (_, index) => {
    const t = (index / count) * Math.PI * 2;
    const x = Math.sin(t) * (Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5));
    const y = Math.cos(t) * 0.8;
    return [x * scale * 0.28, y * scale * 1.2, 0];
  });
}

function buildTextMask(label: string): Array<[number, number]> {
  const chars = label.split('');
  const cellPoints: Array<[number, number]> = [];
  let cursorX = 0;

  chars.forEach((char) => {
    const glyph = LETTER_PATTERNS[char];
    if (!glyph) {
      cursorX += 5;
      return;
    }

    glyph.forEach((row, rowIndex) => {
      row.split('').forEach((value, columnIndex) => {
        if (value === '1') {
          cellPoints.push([cursorX + columnIndex, -rowIndex]);
        }
      });
    });

    cursorX += glyph[0].length + 1;
  });

  const minX = Math.min(...cellPoints.map((point) => point[0]));
  const maxX = Math.max(...cellPoints.map((point) => point[0]));
  const minY = Math.min(...cellPoints.map((point) => point[1]));
  const maxY = Math.max(...cellPoints.map((point) => point[1]));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return cellPoints.map(([x, y]) => [x - centerX, y - centerY]);
}

function buildTextPoints(label: string, count: number, scale: number): Array<[number, number, number]> {
  const mask = buildTextMask(label);
  const pointScale = Math.max(scale * 0.32, 1.5);

  return Array.from({ length: count }, (_, index) => {
    const [x, y] = mask[index % mask.length];
    const jitterX = ((index * 17) % 5) / 10 - 0.2;
    const jitterY = ((index * 13) % 5) / 10 - 0.2;
    return [(x + jitterX) * pointScale, (y + jitterY) * pointScale, 0];
  });
}

export function buildBurstPattern(
  pattern: BurstPatternId,
  count: number,
  scale: number
): Array<[number, number, number]> {
  switch (pattern) {
    case 'star':
      return buildStarPoints(count, scale);
    case 'heart':
      return buildHeartPoints(count, scale);
    case 'diamond':
      return buildDiamondPoints(count, scale);
    case 'butterfly':
      return buildButterflyPoints(count, scale);
    case 'text-love':
    case 'text-520':
      return buildTextPoints(resolveBurstPatternMeta(pattern).label, count, scale);
    case 'ring':
    default:
      return buildRingPoints(count, scale);
  }
}
