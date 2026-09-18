/** Only these modes can mount the launch game, including through old links. */
export function isLaunchGameMode(mode: unknown): boolean {
  return mode === undefined || mode === 'level' || mode === 'daily' || mode === 'endless';
}
