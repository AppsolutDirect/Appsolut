/**
 * Berechnet den Abstand (in px), um den der Eingabebereich über dem unteren Rand
 * der Layout-Fläche angehoben werden muss, damit er am unteren Rand der
 * tatsächlich sichtbaren Fläche klebt.
 *
 * `bottom = innerHeight - (visualViewport.offsetTop + visualViewport.height)`
 *
 * - Ohne eingeblendete Tastatur / ausgefahrene Browser-Leiste: 0 -> klebt am Rand.
 * - Mit eingeblendeter Tastatur: genau die Höhe der Tastatur.
 *
 * Negative Werte (sichtbare Fläche ragt über die Layout-Fläche hinaus) werden
 * auf 0 begrenzt, damit der Container nie unter den Rand rutscht.
 */
export function computeComposerBottomOffset(
  innerHeight: number,
  visualHeight: number,
  visualOffsetTop: number,
): number {
  return Math.max(0, Math.round(innerHeight - visualHeight - visualOffsetTop));
}
