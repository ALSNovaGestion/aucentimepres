// Générateur statique du blog "Au centime près" — zéro dépendance.
// Usage : node build.js  → génère le dossier dist/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const TODAY = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date()); // AAAA-MM-JJ heure de Paris

// ---------- utilitaires ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const frDate = d => { const [y, m, j] = d.split('-').map(Number); return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${y}`; };
function write(rel, content) {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

// ---------- front-matter ----------
function parseDoc(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

// ---------- markdown minimal ----------
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(esc(c)); return `\u0000${codes.length - 1}\u0000`; });
  // échappe le HTML sauf balises simples autorisées
  s = s.replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    const ext = /^https?:\/\//.test(u) && !u.startsWith(cfg.url);
    return `<a href="${u}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  return s;
}

function markdown(md, toc) {
  const lines = md.replace(/\r/g, '').split('\n');
  let out = [], i = 0;
  const isBlockStart = l => /^(#{1,4}\s|[-*]\s|\d+\.\s|>|\||<)/.test(l) || l.trim() === '';
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === '') { i++; continue; }
    let h = l.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length, txt = h[2].trim(), id = slugify(txt);
      if (toc && lvl === 2) toc.push({ id, txt });
      out.push(`<h${lvl} id="${id}">${inline(txt)}</h${lvl}>`); i++; continue;
    }
    if (/^<\/?[a-zA-Z]/.test(l)) { // HTML brut
      const buf = [];
      while (i < lines.length && lines[i].trim() !== '') buf.push(lines[i++]);
      out.push(buf.join('\n')); continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      let cls = 'note', first = buf[0] || '';
      const tag = first.match(/^\[!(\w+)\]\s*/);
      if (tag) { cls = tag[1].toLowerCase(); buf[0] = first.replace(tag[0], ''); }
      out.push(`<aside class="callout callout-${cls}">${buf.filter(x => x.trim()).map(x => `<p>${inline(x)}</p>`).join('')}</aside>`);
      continue;
    }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
        body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^[-*]\s/.test(l) || /^\d+\.\s/.test(l)) {
      const ordered = /^\d+\.\s/.test(l);
      const re = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && !isBlockStart(lines[i])) buf.push(lines[i++]);
    if (!buf.length) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---------- chargement du contenu ----------
function loadDir(dir) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith('.md')).map(f => {
    const { meta, body } = parseDoc(fs.readFileSync(path.join(d, f), 'utf8'));
    meta.slug = meta.slug || f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    return { ...meta, body };
  });
}

const articles = loadDir('content/articles')
  .filter(a => a.title && a.date && a.date <= TODAY && a.draft !== 'true')
  .sort((a, b) => (b.date + b.slug).localeCompare(a.date + a.slug));
const pages = loadDir('content/pages');

for (const a of articles) {
  a.toc = [];
  a.html = markdown(a.body, a.toc);
  a.words = a.body.split(/\s+/).length;
  a.minutes = Math.max(2, Math.round(a.words / 220));
  a.url = `/${a.slug}/`;
  a.catName = cfg.categories[a.category] || 'Finances';
}

// ---------- gabarit ----------
function layout({ title, description, canonical, body, jsonld = [], type = 'website', noindex = false }) {
  const fullTitle = title === cfg.name ? `${cfg.name} — ${cfg.tagline}` : `${title} | ${cfg.name}`;
  const ads = cfg.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.adsenseClient}" crossorigin="anonymous"></script>`
    : '';
  const ga = cfg.gaId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.gaId}');</script>`
    : '';
  const nav = Object.entries(cfg.categories).map(([k, v]) => `<a href="/categorie/${k}/">${v}</a>`).join('');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${cfg.url}${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${cfg.url}${canonical}">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.name)}" href="/rss.xml">
<link rel="stylesheet" href="/style.css">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
${ads}
${ga}
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="/" aria-label="${esc(cfg.name)}, accueil"><span class="logo-mark">€</span><span class="logo-text">Au centime <em>près</em></span></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="nav" onclick="var n=document.getElementById('nav');var o=n.classList.toggle('open');this.setAttribute('aria-expanded',o)">Menu</button>
  </div>
  <nav id="nav" class="wrap cat-nav" aria-label="Rubriques">${nav}</nav>
</header>
<main id="contenu">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <p class="logo small"><span class="logo-mark">€</span><span class="logo-text">Au centime <em>près</em></span></p>
      <p>${esc(cfg.tagline)}.</p>
      <p class="disclaimer">Les articles de ce site sont des informations générales, vérifiées à la date indiquée. Ils ne remplacent pas un conseil personnalisé (conseiller financier, expert-comptable, CAF, impots.gouv.fr).</p>
    </div>
    <div>
      <p class="footer-title">Rubriques</p>
      <ul>${Object.entries(cfg.categories).map(([k, v]) => `<li><a href="/categorie/${k}/">${v}</a></li>`).join('')}</ul>
    </div>
    <div>
      <p class="footer-title">Le site</p>
      <ul>
        <li><a href="/a-propos/">À propos</a></li>
        <li><a href="/contact/">Contact</a></li>
        <li><a href="/mentions-legales/">Mentions légales</a></li>
        <li><a href="/confidentialite/">Confidentialité et cookies</a></li>
        <li><a href="/rss.xml">Flux RSS</a></li>
      </ul>
    </div>
  </div>
  <p class="wrap copyright">© ${new Date().getFullYear()} ${esc(cfg.name)}</p>
</footer>
</body>
</html>`;
}

function card(a) {
  return `<article class="card">
  <a class="card-cat" href="/categorie/${a.category}/">${esc(a.catName)}</a>
  <h3><a href="${a.url}">${esc(a.title)}</a></h3>
  <p>${esc(a.description)}</p>
  <p class="meta"><time datetime="${a.date}">${frDate(a.date)}</time> · ${a.minutes} min de lecture</p>
</article>`;
}

// ---------- génération ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'static'))) fs.copyFileSync(path.join(ROOT, 'static', f), path.join(DIST, f));

const orgLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.name, url: cfg.url, inLanguage: 'fr-FR', description: cfg.tagline };

// Accueil
{
  const [first, ...rest] = articles;
  const hero = first ? `<section class="hero wrap">
  <p class="eyebrow">Dernier article</p>
  <h1><a href="${first.url}">${esc(first.title)}</a></h1>
  <p class="lead">${esc(first.description)}</p>
  <p class="meta"><a href="/categorie/${first.category}/">${esc(first.catName)}</a> · <time datetime="${first.date}">${frDate(first.date)}</time> · ${first.minutes} min</p>
</section>` : `<section class="hero wrap"><h1>${esc(cfg.name)}</h1><p class="lead">${esc(cfg.tagline)}</p></section>`;
  const body = `${hero}
<section class="wrap intro-band">
  <p><strong>Au centime près</strong>, c'est l'argent du quotidien expliqué par une ancienne comptable : des chiffres vérifiés, des sources officielles, et des exemples concrets.</p>
</section>
<section class="wrap">
  <h2 class="section-title">Articles récents</h2>
  <div class="grid">${rest.slice(0, 12).map(card).join('')}</div>
</section>
<section class="wrap">
  <h2 class="section-title">Explorer par rubrique</h2>
  <div class="cats">${Object.entries(cfg.categories).map(([k, v]) => {
    const n = articles.filter(a => a.category === k).length;
    return `<a class="cat-tile" href="/categorie/${k}/"><span>${v}</span><small>${n} article${n > 1 ? 's' : ''}</small></a>`;
  }).join('')}</div>
</section>`;
  write('index.html', layout({ title: cfg.name, description: cfg.tagline, canonical: '/', body, jsonld: [orgLd] }));
}

// Articles
for (const a of articles) {
  const related = articles.filter(x => x !== a && x.category === a.category).slice(0, 3);
  const more = related.length < 3 ? articles.filter(x => x !== a && !related.includes(x)).slice(0, 3 - related.length) : [];
  const toc = a.toc.length >= 3 ? `<nav class="toc" aria-label="Sommaire"><p>Sommaire</p><ol>${a.toc.map(t => `<li><a href="#${t.id}">${inline(t.txt)}</a></li>`).join('')}</ol></nav>` : '';
  const updated = a.updated && a.updated !== a.date ? ` · mis à jour le <time datetime="${a.updated}">${frDate(a.updated)}</time>` : '';
  const body = `<article class="wrap narrow post">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <a href="/categorie/${a.category}/">${esc(a.catName)}</a></nav>
  <h1>${esc(a.title)}</h1>
  <p class="lead">${esc(a.description)}</p>
  <p class="meta">Par <a href="/a-propos/">${esc(cfg.author)}</a>, ancienne comptable · <time datetime="${a.date}">${frDate(a.date)}</time>${updated} · ${a.minutes} min de lecture</p>
  ${toc}
  <div class="prose">${a.html}</div>
  <aside class="author-box">
    <div class="avatar" aria-hidden="true">S</div>
    <div><p class="author-name">${esc(cfg.author)}</p><p>${esc(cfg.authorBio)}</p></div>
  </aside>
  <p class="disclaimer">Informations générales vérifiées à la date de publication, qui ne constituent pas un conseil personnalisé. Les montants et taux évoluent : vérifiez toujours auprès de la source officielle citée.</p>
</article>
<section class="wrap">
  <h2 class="section-title">À lire aussi</h2>
  <div class="grid">${[...related, ...more].map(card).join('')}</div>
</section>`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.description,
    datePublished: a.date, dateModified: a.updated || a.date, inLanguage: 'fr-FR',
    author: { '@type': 'Person', name: cfg.author, url: `${cfg.url}/a-propos/` },
    publisher: { '@type': 'Organization', name: cfg.name, url: cfg.url },
    mainEntityOfPage: `${cfg.url}${a.url}`
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: cfg.url + '/' },
      { '@type': 'ListItem', position: 2, name: a.catName, item: `${cfg.url}/categorie/${a.category}/` },
      { '@type': 'ListItem', position: 3, name: a.title, item: `${cfg.url}${a.url}` }]
  }];
  write(`${a.slug}/index.html`, layout({ title: a.title, description: a.description, canonical: a.url, body, jsonld: ld, type: 'article' }));
}

// Catégories
for (const [k, v] of Object.entries(cfg.categories)) {
  const list = articles.filter(a => a.category === k);
  const body = `<section class="wrap">
  <nav class="crumbs"><a href="/">Accueil</a> › ${v}</nav>
  <h1 class="page-title">${v}</h1>
  ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<p>Les premiers articles de cette rubrique arrivent très bientôt.</p>'}
</section>`;
  write(`categorie/${k}/index.html`, layout({ title: v, description: `Tous les articles de la rubrique ${v} : explications claires et chiffres vérifiés.`, canonical: `/categorie/${k}/`, body, noindex: list.length === 0 }));
}

// Pages fixes
for (const p of pages) {
  const body = `<article class="wrap narrow post"><h1>${esc(p.title)}</h1><div class="prose">${markdown(p.body)}</div></article>`;
  write(`${p.slug}/index.html`, layout({ title: p.title, description: p.description || p.title, canonical: `/${p.slug}/`, body }));
}

// 404
write('404.html', layout({ title: 'Page introuvable', description: 'Page introuvable', canonical: '/404.html', noindex: true,
  body: `<section class="wrap narrow post"><h1>Page introuvable</h1><p>Cette page n'existe pas ou a été déplacée. <a href="/">Retour à l'accueil</a>.</p></section>` }));

// Sitemap, robots, RSS, ads.txt
const urls = ['/', ...articles.map(a => a.url), ...Object.keys(cfg.categories).filter(k => articles.some(a => a.category === k)).map(k => `/categorie/${k}/`), ...pages.map(p => `/${p.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => {
  const a = articles.find(x => x.url === u);
  return `<url><loc>${cfg.url}${u}</loc>${a ? `<lastmod>${a.updated || a.date}</lastmod>` : `<lastmod>${TODAY}</lastmod>`}</url>`;
}).join('\n')}\n</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${cfg.url}/sitemap.xml\n`);
write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(cfg.name)}</title><link>${cfg.url}</link><description>${esc(cfg.tagline)}</description><language>fr</language>\n${
  articles.slice(0, 30).map(a => `<item><title>${esc(a.title)}</title><link>${cfg.url}${a.url}</link><guid>${cfg.url}${a.url}</guid><pubDate>${new Date(a.date + 'T07:00:00Z').toUTCString()}</pubDate><description>${esc(a.description)}</description></item>`).join('\n')}\n</channel></rss>`);
if (cfg.adsenseClient) write('ads.txt', `google.com, ${cfg.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);

console.log(`OK : ${articles.length} articles, ${pages.length} pages → dist/`);
