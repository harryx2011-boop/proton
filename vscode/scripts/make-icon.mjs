// media/icon.png from the Lucide atom glyph (ISC) on a neutral tile; no brand mark exists yet
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const glyph = readFileSync('media/atom.svg', 'utf8').replace(/<\/?svg[^>]*>/g, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect width="256" height="256" rx="48" fill="#2b2b2b"/>
<g transform="translate(32 32) scale(8)" fill="none" stroke="#f2f2f2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
</svg>`;
writeFileSync('media/icon.png', new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render().asPng());
