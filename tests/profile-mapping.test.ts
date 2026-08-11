import { describe, expect, it } from 'vitest';
import { parseCsvList, toPositiveIntOrFallback } from '../src/utils/profileMapping';

describe('profile mapping', () => {
  it('parseCsvList remove vazios e espaços', () => {
    expect(parseCsvList('halteres,  barra ,, banco ')).toEqual(['halteres', 'barra', 'banco']);
  });

  it('toPositiveIntOrFallback usa fallback para inválidos', () => {
    expect(toPositiveIntOrFallback('', 60)).toBe(60);
    expect(toPositiveIntOrFallback(0, 60)).toBe(60);
    expect(toPositiveIntOrFallback('45', 60)).toBe(45);
  });
});
