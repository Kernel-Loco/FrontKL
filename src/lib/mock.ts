/** Simula la latencia de red mientras no hay backend. */
export function mockDelay(ms = 700): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
