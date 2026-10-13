import { describe, expect, it } from 'vitest';
import { computeComposerBottomOffset } from './composerAnchor';

describe('computeComposerBottomOffset', () => {
  it('klebt am unteren Rand, wenn keine Tastatur eingeblendet ist', () => {
    expect(computeComposerBottomOffset(800, 800, 0)).toBe(0);
  });

  it('hebt den Bereich bei eingeblendeter Tastatur genau um die Tastaturhöhe an', () => {
    expect(computeComposerBottomOffset(800, 500, 0)).toBe(300);
  });

  it('berücksichtigt einen Versatz der sichtbaren Fläche', () => {
    expect(computeComposerBottomOffset(800, 600, 100)).toBe(100);
  });

  it('rutscht nie unter den unteren Rand (negative Werte werden begrenzt)', () => {
    expect(computeComposerBottomOffset(800, 800, 50)).toBe(0);
  });

  it('rundet auf ganze Pixel', () => {
    expect(computeComposerBottomOffset(800.4, 500.2, 0)).toBe(300);
  });
});
