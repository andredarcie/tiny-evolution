/** Fixed 19×19 Go board. Cell size fills the available area. */
const GRID_COLS = 19;
const GRID_ROWS = 19;

export function getGridDimensions(width: number, height: number, topOffset = 0, bottomOffset = 0) {
  const availH = Math.max(0, height - topOffset - bottomOffset);
  const cellSize = Math.floor(Math.min(width / GRID_COLS, availH / GRID_ROWS));
  return { cols: GRID_COLS, rows: GRID_ROWS, cellSize };
}

export const GAME_CONFIG = {
  /** Ticks per second for the simulation */
  TICKS_PER_SECOND: 2,
  /** Initial entity count as fraction of total cells */
  INITIAL_FILL: 0.12,
  /** Min total organisms before replenishment kicks in */
  MIN_POPULATION: 120,
  /** How many level-0 colonies to inject on replenishment */
  REPLENISH_AMOUNT: 4,
  /** Hard cap for aggregated organisms represented on the board */
  MAX_POPULATION: 2400,
  /** Tween duration for entity movement (ms) */
  MOVE_TWEEN_MS: 100,
  /** Tween duration for merge animation (ms) */
  MERGE_TWEEN_MS: 180,
};
