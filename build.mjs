import fs from 'fs-extra';
import path from 'path';
import { globby } from 'globby';
import { minify as minifyHtml } from 'html-minifier-terser';

const root = process.cwd();
const dist = path.join(root, 'dist');

async function clean() {
  await fs.remove(dist);
  await fs.ensureDir(dist);
}

async function copyStatic() {
  const rootStatic = [
    'favicon.ico',
    'icon.png',
    'icon.svg',
    'robots.txt',
    'CNAME',
    'social-cover.jpg',
  ].filter((f) => fs.existsSync(path.join(root, f)));

  await fs.ensureDir(path.join(dist, 'docs'));
  if (fs.existsSync(path.join(root, 'docs'))) {
    await fs.copy(path.join(root, 'docs'), path.join(dist, 'docs'));
  }

  for (const f of rootStatic) {
    await fs.copy(path.join(root, f), path.join(dist, f));
  }
}

async function minifyHtmlFiles() {
  const htmlFiles = await globby(['**/*.html'], {
    cwd: root,
    ignore: ['dist/**', 'node_modules/**'],
  });

  for (const rel of htmlFiles) {
    const src = path.join(root, rel);
    const out = path.join(dist, rel);
    await fs.ensureDir(path.dirname(out));
    const html = await fs.readFile(src, 'utf8');
    const minified = await minifyHtml(html, {
      // Whitespace and comments
      collapseWhitespace: true,
      collapseInlineTagWhitespace: true,
      conservativeCollapse: false,
      removeComments: true,
      // Attributes
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeAttributeQuotes: true, // remove quotes when safe (single word, no spaces)
      collapseBooleanAttributes: true,
      // Tags and doctypes
      useShortDoctype: true,
      removeOptionalTags: true,
      keepClosingSlash: true,
      // Strip legacy type attributes
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      // Entity handling and ordering (tiny wins)
      decodeEntities: true,
      sortAttributes: true,
      sortClassName: true,
      // Inline CSS/JS minification – go aggressive
      minifyCSS: { level: 2 },
      minifyJS: {
        mangle: true,
        format: { comments: false },
        compress: {
          defaults: true,
          passes: 2,
          pure_getters: true,
          unsafe: true,
        },
      },
    });
    await fs.writeFile(out, minified);
  }
}

async function copyImages() {
  const srcDir = path.join(root, 'img');
  const outDir = path.join(dist, 'img');
  if (fs.existsSync(srcDir)) {
    await fs.ensureDir(path.dirname(outDir));
    await fs.copy(srcDir, outDir); // no optimization, just copy
  }
}

async function main() {
  await clean();
  await copyStatic();
  await minifyHtmlFiles();
  await copyImages();
  console.log('Build complete → dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});