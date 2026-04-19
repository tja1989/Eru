let startedAt: number | undefined;
let completedAt: number | undefined;

export function startColdStartMeter(): void {
  if (startedAt === undefined) {
    startedAt = Date.now();
  }
}

export function completeColdStartMeter(): void {
  if (completedAt === undefined && startedAt !== undefined) {
    completedAt = Date.now();
  }
}

export function getColdStartDuration(): number | undefined {
  if (startedAt === undefined || completedAt === undefined) return undefined;
  return completedAt - startedAt;
}

export function _resetColdStartMeterForTests(): void {
  startedAt = undefined;
  completedAt = undefined;
}
