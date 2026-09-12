import type { BirdSkin } from './birds';

export type BirdVisualEvolution = {
  stage: number;
  wings: number;
  legs: number;
  arms: number;
  shoulders: number;
};

export type BirdVisualState = {
  stage: number;
  scale: number;
  muscle: number;
  wingPower: number;
  armPower: number;
  shoulderPower: number;
  legPower: number;
  definition: number;
  champion: boolean;
};

export type BirdPose = 'showcase' | 'flying';

export type BirdVisualOptions = {
  pose?: BirdPose;
};

const STAGES = [
  { scale: 0.64, muscle: 0, definition: 0 },
  { scale: 0.71, muscle: 0.14, definition: 0.12 },
  { scale: 0.77, muscle: 0.3, definition: 0.24 },
  { scale: 0.82, muscle: 0.48, definition: 0.37 },
  { scale: 0.86, muscle: 0.68, definition: 0.51 },
  { scale: 0.9, muscle: 0.9, definition: 0.66 },
  { scale: 0.93, muscle: 1.12, definition: 0.82 },
  { scale: 0.93, muscle: 1.35, definition: 0.99 },
  { scale: 0.94, muscle: 1.58, definition: 1.17 },
  { scale: 1.14, muscle: 2.08, definition: 1.48 },
] as const;

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const n = (value: number) => Number(value.toFixed(2));

function rgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => part + part)
          .join('')
      : normalized.padEnd(6, '0').slice(0, 6);
  const parsed = Number.parseInt(value, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function mix(first: string, second: string, amount: number) {
  const a = rgb(first);
  const b = rgb(second);
  const weight = clamp(amount);
  const channel = (start: number, end: number) =>
    Math.round(start + (end - start) * weight)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
}

export function getBirdVisualState(evo?: Partial<BirdVisualEvolution>): BirdVisualState {
  const stage = Math.round(clamp(evo?.stage ?? 0, 0, 9));
  const profile = STAGES[stage];
  return {
    stage,
    scale: profile.scale,
    muscle: profile.muscle,
    wingPower: profile.muscle + clamp((evo?.wings ?? 0) / 100) * 0.45,
    armPower: profile.muscle + clamp((evo?.arms ?? 0) / 100) * 0.55,
    shoulderPower: profile.muscle + clamp((evo?.shoulders ?? 0) / 100) * 0.5,
    legPower: profile.muscle + clamp((evo?.legs ?? 0) / 100) * 0.55,
    definition: profile.definition,
    champion: stage === 9,
  };
}

export function createBirdSvg(
  skin: BirdSkin,
  evo?: Partial<BirdVisualEvolution>,
  instanceId = 'bird',
  options: BirdVisualOptions = {}
) {
  const state = getBirdVisualState(evo);
  const {
    stage,
    scale,
    muscle,
    wingPower,
    armPower,
    shoulderPower,
    legPower,
    definition,
    champion,
  } = state;
  const pose = options.pose ?? 'showcase';
  const id = instanceId.replace(/[^a-zA-Z0-9_-]/g, '') || 'bird';
  const outline = skin.id === 'onyx' ? '#0B1020' : mix(skin.eye, '#172554', 0.42);
  const bodyDark = mix(skin.body, outline, 0.2);
  const bodyLight = mix(skin.body, '#FFFFFF', 0.24);
  const wingLight = mix(skin.wing, '#FFFFFF', 0.16);
  const line = mix(outline, skin.body, 0.18);
  const gold = '#F7C948';
  const goldDark = '#B7791F';
  const stroke = champion ? 6.4 : 5.2;
  const rearReach = n(34 - wingPower * 5.5);
  const rearTop = n(83 - wingPower * 7.2);
  const shoulder = n(9 + shoulderPower * 6.6);
  const bicep = n(10 + armPower * 8.8);
  const chestX = n(173 + muscle * 5 + wingPower * 3);
  const chestY = n(151 + muscle * 5);
  const bodyBottom = n(190 + muscle * 4);
  const bodyTop = n(93 - muscle * 6);
  const opacity = n(0.3 + definition * 0.34);
  const legBulk = n(legPower * 4.4);
  const rearLine = mix(wingLight, outline, 0.36);

  const shadow =
    pose === 'showcase'
      ? `<ellipse cx="132" cy="226" rx="${n(44 + legPower * 5)}" ry="8" fill="${outline}" opacity="0.1"/>`
      : '';
  const legs =
    pose === 'flying'
      ? `<g id="${id}-legs" fill="${skin.beak}" stroke="${outline}" stroke-width="${stroke}">
          <path d="M${n(113 - legBulk)} ${n(bodyBottom - 18)} C103 185 96 194 91 205 C99 201 107 199 ${n(115 + legBulk)} 197 C121 190 125 184 127 ${n(bodyBottom - 10)} Z"/>
          <path d="M${n(146 - legBulk)} ${n(bodyBottom - 15)} C140 195 134 204 132 216 C139 210 147 206 ${n(155 + legBulk)} 204 C159 196 162 188 162 ${n(bodyBottom - 8)} Z"/>
        </g>`
      : `<g id="${id}-legs" fill="${skin.beak}" stroke="${outline}" stroke-width="${stroke}">
          <path d="M${n(116 - legBulk)} ${n(bodyBottom - 17)} C${n(112 - legBulk)} ${n(199 + legPower * 2)} 109 210 108 220 C102 222 96 226 91 231 C100 230 108 230 114 232 C117 224 121 215 ${n(125 + legBulk)} ${n(bodyBottom - 8)} Z"/>
          <path d="M${n(151 - legBulk)} ${n(bodyBottom - 14)} C153 ${n(200 + legPower * 2)} 157 211 160 220 C155 223 151 228 148 233 C157 230 165 230 173 231 C170 221 166 212 ${n(163 + legBulk)} ${n(bodyBottom - 6)} Z"/>
        </g>`;

  const anatomy: string[] = [];
  if (stage >= 1) {
    anatomy.push(
      `<path d="M136 119 C133 132 134 145 137 157" fill="none" stroke="${line}" stroke-width="3.2" stroke-linecap="round" opacity="${opacity}"/>`
    );
  }
  if (stage >= 2) {
    anatomy.push(
      `<path d="M105 130 C116 120 128 120 136 128 C145 119 159 120 ${chestX} 132" fill="none" stroke="${line}" stroke-width="3.6" stroke-linecap="round" opacity="${opacity}"/>`
    );
  }
  if (stage >= 3) {
    anatomy.push(
      `<path d="M114 151 C121 146 130 146 137 151 M138 151 C146 146 155 146 161 151" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round" opacity="${opacity}"/>`
    );
  }
  if (stage >= 4) {
    anatomy.push(
      `<path d="M116 165 C123 160 131 160 137 165 M139 165 C146 160 154 160 159 165" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round" opacity="${opacity}"/>`
    );
  }
  if (stage >= 5) {
    anatomy.push(
      `<path d="M119 178 C125 174 132 174 137 178 M139 178 C145 174 152 174 157 178" fill="none" stroke="${line}" stroke-width="2.8" stroke-linecap="round" opacity="${opacity}"/>`
    );
  }
  if (stage >= 6) {
    anatomy.push(
      `<path d="M91 121 C99 110 109 104 121 102 M153 102 C166 105 176 113 182 125" fill="none" stroke="${bodyLight}" stroke-width="4" stroke-linecap="round" opacity="0.58"/>`
    );
  }
  if (stage >= 7) {
    anatomy.push(
      `<path d="M57 103 C74 106 91 115 108 126 M49 119 C69 119 87 123 104 132" fill="none" stroke="${rearLine}" stroke-width="3.2" stroke-linecap="round" opacity="0.72"/>`
    );
  }
  if (stage >= 8) {
    anatomy.push(
      `<path d="M178 107 C187 102 193 104 198 112 M169 129 C178 125 184 126 190 132 M100 142 C94 152 93 163 97 173" fill="none" stroke="${bodyLight}" stroke-width="3.2" stroke-linecap="round" opacity="0.78"/>`
    );
  }

  const championDetails = champion
    ? `
      <path d="M151 54 C165 47 183 49 195 59 L191 70 C178 64 162 64 149 72 Z" fill="${gold}" stroke="${outline}" stroke-width="4.4"/>
      <path d="M152 64 C164 59 181 59 193 66" fill="none" stroke="${goldDark}" stroke-width="3" stroke-linecap="round"/>
      <path d="M132 120 L137 130 L148 131 L140 139 L142 150 L132 144 L122 150 L124 139 L116 131 L127 130 Z" fill="${gold}" stroke="${goldDark}" stroke-width="2.8"/>
      <path d="M38 90 C55 91 77 102 96 115" fill="none" stroke="${gold}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M101 124 C113 111 126 110 136 121 C148 108 166 111 181 127" fill="none" stroke="${line}" stroke-width="5.2" stroke-linecap="round" opacity="0.86"/>
      <path d="M108 143 C119 135 130 136 137 144 C146 135 159 136 168 144" fill="none" stroke="${line}" stroke-width="4.4" stroke-linecap="round" opacity="0.82"/>
    `
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="${id}-body" x1="0" y1="0" x2="0.82" y2="1">
      <stop offset="0" stop-color="${bodyLight}"/>
      <stop offset="0.5" stop-color="${skin.body}"/>
      <stop offset="1" stop-color="${bodyDark}"/>
    </linearGradient>
    <linearGradient id="${id}-wing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${wingLight}"/>
      <stop offset="1" stop-color="${skin.wing}"/>
    </linearGradient>
  </defs>
  <g transform="translate(${champion ? 126 : 128} 128) scale(${scale}) translate(-128 -128)" stroke-linejoin="round">
    ${shadow}
    ${legs}
    <path id="${id}-rear-wing" d="M113 112 C91 ${rearTop} 57 ${n(rearTop - 12)} ${rearReach} ${n(rearTop - 5)}
      C25 ${n(rearTop - 3)} 23 ${n(rearTop + 5)} 29 ${n(rearTop + 12)}
      C35 ${n(rearTop + 21)} 47 ${n(rearTop + 29)} 61 ${n(rearTop + 34)}
      C45 ${n(rearTop + 30)} 31 ${n(rearTop + 32)} 24 ${n(rearTop + 39)}
      C21 ${n(rearTop + 44)} 23 ${n(rearTop + 51)} 31 ${n(rearTop + 53)}
      C47 ${n(rearTop + 58)} 65 ${n(rearTop + 57)} 83 ${n(rearTop + 53)}
      C70 ${n(rearTop + 61)} 62 ${n(rearTop + 69)} 65 ${n(rearTop + 75)}
      C69 ${n(rearTop + 81)} 82 ${n(rearTop + 75)} 96 ${n(rearTop + 67)}
      C108 ${n(rearTop + 60)} 119 ${n(rearTop + 56)} 130 ${n(rearTop + 54)} Z"
      fill="url(#${id}-wing)" stroke="${outline}" stroke-width="${stroke}"/>
    <path d="M39 ${n(rearTop + 15)} C59 ${n(rearTop + 22)} 80 ${n(rearTop + 34)} 103 ${n(rearTop + 49)}
      M35 ${n(rearTop + 40)} C58 ${n(rearTop + 41)} 79 ${n(rearTop + 45)} 100 ${n(rearTop + 53)}"
      fill="none" stroke="${mix(skin.wing, outline, 0.42)}" stroke-width="3" stroke-linecap="round" opacity="0.62"/>
    <path id="${id}-body" d="M119 ${bodyTop}
      C139 ${n(75 - muscle * 3)} 171 ${n(78 - muscle * 4)} 188 ${n(101 - muscle * 2)}
      C200 119 ${n(202 + muscle * 2)} ${n(153 + muscle * 2)} ${chestX} ${chestY}
      C174 ${n(184 + muscle * 7)} 158 ${bodyBottom} 137 ${n(bodyBottom + 6)}
      C111 ${n(bodyBottom + 4)} 88 ${n(187 + muscle * 2)} 80 164
      C72 141 79 116 96 102 C102 97 110 94 119 ${bodyTop} Z"
      fill="url(#${id}-body)" stroke="${outline}" stroke-width="${stroke}"/>
    <ellipse cx="137" cy="${n(162 + muscle * 2)}" rx="${n(32 + muscle * 4)}" ry="${n(31 + muscle * 5)}" fill="${skin.belly}" opacity="0.82"/>
    <circle cx="105" cy="111" r="${shoulder}" fill="${bodyLight}" stroke="${outline}" stroke-width="${n(stroke - 1)}"/>
    ${stage >= 6 ? `<path d="M${n(91 - shoulderPower * 2)} 112 C96 ${n(96 - shoulderPower * 2)} 111 ${n(94 - shoulderPower * 2)} ${n(120 + shoulderPower * 2)} 105" fill="none" stroke="${bodyLight}" stroke-width="${n(3 + shoulderPower)}" stroke-linecap="round" opacity="0.72"/>` : ''}
    <path id="${id}-front-wing" d="M154 119
      C160 ${n(101 - muscle * 5)} 170 ${n(91 - muscle * 7)} 184 ${n(92 - muscle * 7)}
      C${n(198 + muscle * 4)} ${n(92 - muscle * 5)} ${n(208 + muscle * 5)} 102 ${n(208 + muscle * 3)} 115
      C${n(207 + muscle * 2)} 124 199 130 190 127
      C${n(196 + muscle * 2)} 116 194 108 187 106
      C179 104 175 112 179 120
      C${n(185 + muscle * 2)} ${n(130 + muscle * 2)} 184 ${n(141 + muscle * 4)} 176 ${n(150 + muscle * 5)}
      C166 ${n(160 + muscle * 4)} 153 ${n(160 + muscle * 4)} 145 151
      C151 142 154 131 154 119 Z"
      fill="url(#${id}-wing)" stroke="${outline}" stroke-width="${stroke}"/>
    <ellipse cx="${n(190 + muscle * 2)}" cy="${n(108 - muscle * 2)}" rx="${bicep}" ry="${n(9 + muscle * 7)}"
      fill="${wingLight}" stroke="${outline}" stroke-width="${n(stroke - 1.2)}" transform="rotate(-12 ${n(190 + muscle * 2)} ${n(108 - muscle * 2)})"/>
    <path d="M171 121 C178 116 184 116 190 121 M157 145 C164 140 171 139 177 142"
      fill="none" stroke="${mix(skin.wing, outline, 0.45)}" stroke-width="3.2" stroke-linecap="round" opacity="${opacity}"/>
    ${anatomy.join('')}
    <ellipse cx="166" cy="82" rx="${n(35 + muscle * 2.2)}" ry="${n(31 + muscle)}" fill="url(#${id}-body)" stroke="${outline}" stroke-width="${stroke}"/>
    <path d="M143 60 C138 48 143 38 153 45 C157 33 168 31 171 45 C179 36 190 40 187 54"
      fill="${skin.body}" stroke="${outline}" stroke-width="${stroke}" stroke-linecap="round"/>
    <ellipse cx="179" cy="78" rx="12" ry="13" fill="#FFFFFF" stroke="${outline}" stroke-width="3.8"/>
    <circle cx="183" cy="80" r="5.2" fill="${skin.eye}"/>
    <circle cx="185" cy="77" r="1.7" fill="#FFFFFF"/>
    ${stage >= 2 ? `<path d="M168 67 C177 64 186 66 192 71" fill="none" stroke="${outline}" stroke-width="4.2" stroke-linecap="round"/>` : ''}
    <path d="M196 82 L239 92 L198 105 C202 97 202 89 196 82 Z" fill="${skin.beak}" stroke="${outline}" stroke-width="${stroke}"/>
    <path d="M203 94 L226 94" fill="none" stroke="${mix(skin.beak, outline, 0.45)}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M174 96 C181 102 191 101 196 95" fill="none" stroke="${outline}" stroke-width="3.2" stroke-linecap="round"/>
    ${championDetails}
  </g>
</svg>`;
}
