import type { Pokus } from '../types';

/** Tenká vrstva nad IPC můstkem z preload skriptu pro ukládání historie pokusů. */
export const progressStore = {
  async nacti(): Promise<Pokus[]> {
    return window.historie.nacti();
  },
  async pridej(pokus: Pokus): Promise<Pokus[]> {
    return window.historie.pridej(pokus);
  },
  async vymaz(): Promise<Pokus[]> {
    return window.historie.vymaz();
  },
};
