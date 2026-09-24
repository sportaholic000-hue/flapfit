/** Camera ownership only. This does not change privacy choices or discard data. */
const owners = new Set<symbol>();
const listeners = new Set<() => void>();
export const isGameplayActive = () => owners.size > 0;
export function subscribeGameplayActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish() { for (const listener of listeners) listener(); }
export function holdGameplayActivity(): () => void {
  const owner = Symbol('camera-run');
  owners.add(owner);
  if (owners.size === 1) publish();
  return () => {
    if (owners.delete(owner) && owners.size === 0) publish();
  };
}
