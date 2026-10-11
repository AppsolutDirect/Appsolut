import type { MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { useEffect, useMemo, useState } from 'react';

export const meta: MetaFunction = () => [
  { title: 'Open-Source-Lizenzen – bolt.diy' },
  {
    name: 'description',
    content: 'Lizenzhinweise der Open-Source-Komponenten, die in dieser Anwendung verwendet werden.',
  },
];

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  homepage: string;
}

interface LicenseIndex {
  generatedAt: string;
  project: string;
  packageCount: number;
  licenseTextCount: number;
  packages: LicenseEntry[];
}

/** Obergrenze fuer die gerenderte Liste, damit die Seite auf Mobile fluessig bleibt. */
const MAX_VISIBLE = 400;

export default function LicensesRoute() {
  const [index, setIndex] = useState<LicenseIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch('/third-party-licenses.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<LicenseIndex>;
      })
      .then((data) => {
        if (!cancelled) {
          setIndex(data);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const packages = index?.packages ?? [];
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return packages;
    }

    return packages.filter((pkg) => `${pkg.name} ${pkg.version} ${pkg.license}`.toLowerCase().includes(needle));
  }, [index, query]);

  const visible = filtered.slice(0, MAX_VISIBLE);

  return (
    <div className="min-h-dvh bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
          >
            <span className="i-ph:arrow-left" />
            Zurück zur App
          </Link>
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Open-Source-Lizenzen</h1>
          <p className="text-sm text-bolt-elements-textSecondary">
            Diese Anwendung basiert auf <strong>bolt.diy</strong>, das unter der MIT-Lizenz veröffentlicht wurde. Nach
            der MIT-Lizenz müssen Copyright- und Lizenzhinweis mit der Software weitergegeben werden. Hier findest du
            alle Komponenten Dritter samt Lizenzangabe.
          </p>
          {index && (
            <p className="text-xs text-bolt-elements-textTertiary">
              {index.packageCount} Komponenten · {index.licenseTextCount} Lizenztexte · erzeugt am {index.generatedAt}
            </p>
          )}
        </header>

        <div className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-4 space-y-2">
          <div className="text-sm font-medium">Vollständige Lizenztexte</div>
          <p className="text-xs text-bolt-elements-textSecondary">
            Die vollständigen Lizenztexte aller Komponenten werden mit der Anwendung ausgeliefert.
          </p>
          <a
            href="/third-party-notices.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-bolt-elements-button-primary-background px-3 py-2 text-sm text-bolt-elements-button-primary-text hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
          >
            <span className="i-ph:file-text" />
            third-party-notices.txt öffnen
          </a>
        </div>

        <div className="space-y-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nach Paket, Version oder Lizenz suchen …"
            aria-label="Lizenzliste durchsuchen"
            className="w-full rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-3 py-2 text-sm text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />

          {error && (
            <div className="text-sm text-bolt-elements-icon-error">
              Lizenzliste konnte nicht geladen werden: {error}
            </div>
          )}

          {!index && !error && (
            <div className="text-sm text-bolt-elements-textSecondary">Lizenzliste wird geladen …</div>
          )}

          {index && filtered.length === 0 && (
            <div className="text-sm text-bolt-elements-textSecondary">Keine Komponente gefunden.</div>
          )}

          <ul className="divide-y divide-bolt-elements-borderColor rounded-lg border border-bolt-elements-borderColor overflow-hidden">
            {visible.map((pkg) => (
              <li
                key={`${pkg.name}@${pkg.version}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bg-bolt-elements-background-depth-2 px-3 py-2"
              >
                <span className="text-sm break-all">{pkg.name}</span>
                <span className="text-xs text-bolt-elements-textSecondary">
                  {pkg.version} · {pkg.license}
                </span>
              </li>
            ))}
          </ul>

          {filtered.length > visible.length && (
            <p className="text-xs text-bolt-elements-textTertiary">
              {filtered.length - visible.length} weitere Komponenten – bitte die Suche eingrenzen oder die vollständige
              Liste in <code>third-party-notices.txt</code> öffnen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
