#!/usr/bin/env node
/**
 * Erzeugt die Open-Source-Lizenzhinweise des Projekts.
 *
 * Hintergrund: bolt.diy (und damit dieses Repository) steht unter der MIT-Lizenz.
 * Deren Bedingung ist, dass Copyright- und Lizenzhinweis in allen Kopien bzw.
 * wesentlichen Teilen der Software enthalten bleiben. Dieses Script sammelt
 * deshalb die Lizenztexte aller Produktions-Abhaengigkeiten und schreibt sie in
 * Dateien, die mit der App ausgeliefert werden.
 *
 * Ergebnis:
 *   - THIRD_PARTY_NOTICES.md          (kanonische, lesbare Fassung)
 *   - public/third-party-notices.txt  (Fassung, die mit dem Build ausgeliefert wird)
 *   - public/third-party-licenses.json (kompakte Liste fuer den Lizenz-Screen)
 *
 * Aufruf:  pnpm run licenses:generate
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Dateinamen, die in einem Paket einen Lizenztext enthalten koennen. */
const LICENSE_FILE_CANDIDATES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENSE-MIT',
  'LICENSE-APACHE',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt',
  'NOTICE',
  'NOTICE.md',
  'NOTICE.txt',
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Liest die Produktions-Abhaengigkeiten inkl. ihrer Installationspfade von pnpm. */
function loadProductionPackages() {
  const args = ['licenses', 'list', '--prod', '--json'];

  // Je nach Umgebung liegt pnpm direkt im PATH oder nur ueber corepack vor.
  const attempts = [
    { command: 'pnpm', args },
    { command: 'corepack', args: ['pnpm', ...args] },
  ];

  let result;

  for (const attempt of attempts) {
    result = spawnSync(attempt.command, attempt.args, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
    });

    if (!result.error && result.status === 0 && result.stdout?.trim()) {
      break;
    }
  }

  if (result.error) {
    throw new Error(
      `pnpm konnte nicht ausgefuehrt werden (${result.error.message}). Bitte das Script ueber 'pnpm run licenses:generate' starten.`,
    );
  }

  if (result.status !== 0) {
    throw new Error(`'pnpm licenses list' ist fehlgeschlagen: ${result.stderr || result.stdout}`);
  }

  const groups = JSON.parse(result.stdout || '{}');
  const packages = new Map();

  for (const [licenseId, entries] of Object.entries(groups)) {
    for (const entry of entries) {
      for (const installPath of entry.paths ?? []) {
        const packageJsonPath = path.join(installPath, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
          continue;
        }

        const manifest = readJson(packageJsonPath);
        const key = `${manifest.name}@${manifest.version}`;

        if (packages.has(key)) {
          continue;
        }

        packages.set(key, {
          name: manifest.name,
          version: manifest.version,
          license: manifest.license || licenseId,
          homepage: entry.homepage || manifest.homepage || '',
          path: installPath,
        });
      }
    }
  }

  return [...packages.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

/** Sucht den Lizenztext eines installierten Pakets. */
function readLicenseText(pkg) {
  for (const candidate of LICENSE_FILE_CANDIDATES) {
    const file = path.join(pkg.path, candidate);

    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim();

      if (text.length > 0) {
        return text;
      }
    }
  }

  return '';
}

/** Gruppiert Pakete nach identischem Lizenztext, damit Texte nicht mehrfach erscheinen. */
function groupByLicenseText(packages) {
  const groups = new Map();
  const withoutText = [];

  for (const pkg of packages) {
    const text = readLicenseText(pkg);

    if (!text) {
      withoutText.push(pkg);
      continue;
    }

    if (!groups.has(text)) {
      groups.set(text, { text, license: pkg.license, packages: [] });
    }

    groups.get(text).packages.push(pkg);
  }

  const sorted = [...groups.values()].sort((a, b) => {
    if (a.packages.length !== b.packages.length) {
      return b.packages.length - a.packages.length;
    }

    return a.packages[0].name.localeCompare(b.packages[0].name);
  });

  return { groups: sorted, withoutText };
}

function packageLabel(pkg) {
  return `${pkg.name}@${pkg.version}`;
}

function renderMarkdown({ generatedAt, upstreamNotice, packages, groups, withoutText }) {
  const lines = [];

  lines.push('# Third-Party Notices', '');
  lines.push(
    `Diese Datei wurde automatisch erzeugt (${generatedAt}) und listet die Lizenzhinweise aller`,
    'Produktions-Abhaengigkeiten dieses Projekts.',
    '',
  );
  lines.push('## Lizenz des Basisprojekts (Upstream)', '');
  lines.push('```text', upstreamNotice, '```', '');
  lines.push(`## Komponenten (${packages.length})`, '');
  lines.push('| Paket | Lizenz |', '| --- | --- |');

  for (const pkg of packages) {
    lines.push(`| \`${packageLabel(pkg)}\` | ${pkg.license} |`);
  }

  lines.push('', `## Lizenztexte (${groups.length})`, '');

  groups.forEach((group, index) => {
    lines.push(`### ${index + 1}. ${group.license}`, '');
    lines.push('Gilt fuer:', '');

    for (const pkg of group.packages) {
      lines.push(`- \`${packageLabel(pkg)}\``);
    }

    lines.push('', '```text', group.text, '```', '');
  });

  if (withoutText.length > 0) {
    lines.push('## Komponenten ohne mitgelieferten Lizenztext', '');
    lines.push(
      'Fuer die folgenden Pakete enthielt das Paket keine Lizenzdatei; es gilt die im',
      'Paket-Manifest angegebene Lizenz.',
      '',
    );

    for (const pkg of withoutText) {
      lines.push(`- \`${packageLabel(pkg)}\` – ${pkg.license}`);
    }

    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

function renderPlainText({ generatedAt, upstreamNotice, packages, groups, withoutText }) {
  const divider = '='.repeat(80);
  const lines = [];

  lines.push(divider);
  lines.push('THIRD-PARTY SOFTWARE NOTICES');
  lines.push(divider);
  lines.push('');
  lines.push('Diese Datei wurde automatisch erzeugt und listet die Lizenzhinweise aller');
  lines.push(`Produktions-Abhaengigkeiten dieses Projekts. Erzeugt am: ${generatedAt}`);
  lines.push('');
  lines.push('Diese Anwendung basiert auf bolt.diy, das unter der MIT-Lizenz steht:');
  lines.push('');
  lines.push(upstreamNotice);
  lines.push('');
  lines.push(divider);
  lines.push(`KOMPONENTEN (${packages.length})`);
  lines.push(divider);
  lines.push('');

  for (const pkg of packages) {
    lines.push(`${pkg.name}@${pkg.version} (${pkg.license})`);
  }

  lines.push('');
  lines.push(divider);
  lines.push(`LIZENZTEXTE (${groups.length})`);
  lines.push(divider);

  groups.forEach((group, index) => {
    lines.push('');
    lines.push(`--- ${index + 1}. ${group.license} ${'-'.repeat(Math.max(0, 60 - group.license.length))}`);
    lines.push('');
    lines.push('Gilt fuer:');

    for (const pkg of group.packages) {
      lines.push(`  ${packageLabel(pkg)}`);
    }

    lines.push('');
    lines.push(group.text);
    lines.push('');
  });

  if (withoutText.length > 0) {
    lines.push('');
    lines.push(divider);
    lines.push('KOMPONENTEN OHNE MITGELIEFERTEN LIZENZTEXT');
    lines.push(divider);
    lines.push('');

    for (const pkg of withoutText) {
      lines.push(`${packageLabel(pkg)} - ${pkg.license}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const manifest = readJson(path.join(ROOT, 'package.json'));
  const upstreamNotice = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8').trim();
  const generatedAt = new Date().toISOString().slice(0, 10);

  const packages = loadProductionPackages();
  const { groups, withoutText } = groupByLicenseText(packages);

  const data = {
    project: manifest.name,
    generatedAt,
    upstreamNotice,
    packages,
    groups,
    withoutText,
  };

  const markdown = renderMarkdown(data);
  const plainText = renderPlainText(data);

  const index = {
    generatedAt,
    project: manifest.name,
    packageCount: packages.length,
    licenseTextCount: groups.length,
    packages: packages.map((pkg) => ({
      name: pkg.name,
      version: pkg.version,
      license: String(pkg.license),
      homepage: pkg.homepage,
    })),
  };

  fs.writeFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'), markdown);
  fs.writeFileSync(path.join(ROOT, 'public', 'third-party-notices.txt'), plainText);
  fs.writeFileSync(path.join(ROOT, 'public', 'third-party-licenses.json'), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`  ✅ ${packages.length} Pakete, ${groups.length} eindeutige Lizenztexte`);
  console.log('     - THIRD_PARTY_NOTICES.md');
  console.log('     - public/third-party-notices.txt');
  console.log('     - public/third-party-licenses.json');
}

main();
