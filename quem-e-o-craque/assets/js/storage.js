/** localStorage com prefixo e proteção contra navegadores que bloqueiam o armazenamento. */
const NS = 'craque:';

export const store = {
  get(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(NS + key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
    } catch {
      /* armazenamento cheio ou bloqueado: o jogo segue sem salvar */
    }
  },
};

/** Lê um valor salvo com validade em dias. */
export function getCached(key, ttlDays) {
  const entry = store.get(key);
  return entry && Date.now() - entry.t < ttlDays * 864e5 ? entry.v : null;
}

export function setCached(key, value) {
  store.set(key, { t: Date.now(), v: value });
}
