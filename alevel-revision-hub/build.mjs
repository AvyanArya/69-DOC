// Builds preview.html: one self-contained file with every stylesheet and script inlined,
// so it opens by double-clicking with no server. Run: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const index = read('index.html');

const inline = (html) => html
  .replace(/<link rel="stylesheet" href="(src\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}</style>`)
  .replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p).replace(/<\/script/gi, '<\\/script')}</script>`);

const full = inline(index);
writeFileSync(join(root, 'preview.html'), full);

// The page content without the document skeleton, for hosts that add their own <html>/<head>/<body>.
const start = full.indexOf('<!-- page:start -->'), end = full.indexOf('<!-- page:end -->');
const page = full.slice(start, end).replace('<!-- page:start -->\n', '').replace('<!-- head:end -->\n</head>\n<body>\n', '');
const out = process.argv[2];
if (out) writeFileSync(out, page);

console.log('preview.html', (full.length / 1024).toFixed(0) + ' KB' + (out ? ', page body → ' + out : ''));
