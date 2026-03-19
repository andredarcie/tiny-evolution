import { Entity } from '../entities/Entity';
import { EvolutionSystem } from '../systems/EvolutionSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { getGridDimensions, GAME_CONFIG } from '../config';
import { TweenManager, Ease } from '../Tween';
import { ParticleSystem } from '../Particles';
import type { HUD } from '../HUD';
import { random, randomInt, setRandomSeed } from '../random';

interface EntityVisual {
  entity: Entity;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  alpha: number;
}

type TerrainTile = 'water' | 'land';

interface InteractionFlash {
  col: number;
  row: number;
  alpha: number;
  scale: number;
  color: string;
}

const DIRS = [
  { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
];

export class GameScene {
  private hud: HUD;
  private cols = 0;
  private rows = 0;
  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private logicalW = 0;
  private logicalH = 0;

  private grid: (Entity | null)[][] = [];
  private terrain: TerrainTile[][] = [];
  private terrainSeed = 0;
  private visuals = new Map<number, EntityVisual>();
  private evolution = new EvolutionSystem();
  private environment = new EnvironmentSystem();
  private tweens = new TweenManager();
  private particles = new ParticleSystem();
  private spreadTimers = new Map<number, number>();
  private interactionFlash: InteractionFlash | null = null;
  private entropy = 0.18;
  private collapseCooldown = 0;

  constructor(hud: HUD) {
    this.hud = hud;
    setRandomSeed(0x1f2e3d4c);
    this.terrainSeed = random() * 10_000;
    hud.setHistoryProvider(() => this.evolution.history);
  }

  private getStackedHudReserve(height: number): number {
    if (height <= 680) return 150;
    if (height <= 760) return 132;
    return 118;
  }

  onResize(w: number, h: number, topOffset = 0): void {
    this.logicalW = w;
    this.logicalH = h;

    const projected = getGridDimensions(w, h, topOffset);
    const projectedOffsetX = Math.floor((w - projected.cols * projected.cellSize) / 2);
    const side = projectedOffsetX > 140;
    const bottomOffset = side ? 0 : this.getStackedHudReserve(h);
    const dims = getGridDimensions(w, h, topOffset, bottomOffset);
    this.cols     = dims.cols;
    this.rows     = dims.rows;
    this.cellSize = dims.cellSize;
    this.offsetX  = Math.floor((w - this.cols * this.cellSize) / 2);
    this.offsetY  = topOffset + Math.floor((h - topOffset - bottomOffset - this.rows * this.cellSize) / 2);

    // Expose grid geometry to CSS for HUD positioning
    const gridW = this.cols * this.cellSize;
    const gridH = this.rows * this.cellSize;
    const el = document.documentElement;
    el.style.setProperty('--grid-x', `${this.offsetX}px`);
    el.style.setProperty('--grid-y', `${this.offsetY}px`);
    el.style.setProperty('--grid-w', `${gridW}px`);
    el.style.setProperty('--grid-h', `${gridH}px`);

    const overlay = document.getElementById('hud-overlay');
    if (overlay) {
      overlay.classList.toggle('layout-side',    side);
      overlay.classList.toggle('layout-stacked', !side);
    }

    // Collect surviving entities that still fit in the new grid
    const survivors: Entity[] = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const e = this.grid[r]?.[c];
        if (e?.isAlive && e.gridX < dims.cols && e.gridY < dims.rows)
          survivors.push(e);
      }

    this.visuals.clear();
    this.tweens.clear();
    this.spreadTimers.clear();
    this.particles.clear();
    this.grid = Array.from({ length: this.rows }, () => new Array<Entity | null>(this.cols).fill(null));
    this.terrain = this.generateTerrainMap();

    if (survivors.length > 0) {
      // Re-place existing entities at updated pixel positions
      for (const e of survivors) this.placeEntity(e, false);
    } else {
      // First load — start fresh
      this.terrainSeed = random() * 10_000;
      this.terrain = this.generateTerrainMap();
      this.evolution.reset();
      this.spawnInitial();
    }
    this.updateHUD();
  }

  update(dt: number): void {
    this.tweens.tick(dt);
    this.particles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalW;
    const h = this.logicalH;

    // Light background outside the grid
    ctx.fillStyle = '#d6d0c8';
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(ctx);
    this.drawEnvironmentDecor(ctx);
    this.drawInteractionFeedback(ctx);
    this.particles.draw(ctx);
    this.drawEntities(ctx);
  }

  handlePointer(x: number, y: number): void {
    const cell = this.cellFromPoint(x, y);
    if (!cell) return;

    const entity = this.grid[cell.row]?.[cell.col];
    if (!entity || !entity.isAlive) return;

    const clickScore = this.evaluateClickQuality(entity);
    this.showInteractionFeedback(cell.col, cell.row, clickScore >= 0 ? '#58c16c' : '#d35a4b');
    this.showEntityClickJuice(entity, clickScore);
    this.processInteractionTurn(entity, clickScore);
    this.updateHUD();
  }

  // ── Private: drawing ────────────────────────────────────────────────────────

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save(); // isolate all state changes inside this method
    const cs = this.cellSize;
    const l  = this.offsetX;
    const t  = this.offsetY;

    // 1. Terrain fills
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = l + c * cs;
        const y = t + r * cs;
        const terrain = this.terrain[r]?.[c] ?? 'water';
        ctx.fillStyle = terrain === 'land'
          ? ((r + c) % 2 === 0 ? '#d7cf9e' : '#c9be86')
          : ((r + c) % 2 === 0 ? '#bfdde2' : '#a7cbd5');
        ctx.fillRect(x, y, cs, cs);

        if (terrain === 'water') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.fillRect(x + cs * 0.14, y + cs * 0.16, cs * 0.42, cs * 0.08);
          ctx.fillRect(x + cs * 0.36, y + cs * 0.52, cs * 0.3, cs * 0.06);
        } else {
          ctx.fillStyle = 'rgba(101, 118, 58, 0.18)';
          ctx.fillRect(x + cs * 0.18, y + cs * 0.18, cs * 0.14, cs * 0.14);
          ctx.fillRect(x + cs * 0.58, y + cs * 0.56, cs * 0.12, cs * 0.12);
        }
      }
    }

    // 2. Grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(88, 92, 85, 0.28)';
    ctx.lineWidth = 1;
    const r = l + this.cols * cs;
    const b = t + this.rows * cs;
    ctx.beginPath();
    for (let c = 0; c <= this.cols; c++) {
      const x = l + c * cs;
      ctx.moveTo(x, t);
      ctx.lineTo(x, b);
    }
    for (let row = 0; row <= this.rows; row++) {
      const y = t + row * cs;
      ctx.moveTo(l, y);
      ctx.lineTo(r, y);
    }
    ctx.stroke();
    ctx.restore(); // grid lines restore
    ctx.restore(); // method-level restore
  }

  private drawEnvironmentDecor(ctx: CanvasRenderingContext2D): void {
    const profile = this.environment.getProfile(this.evolution.maxEraReached);
    const fontSize = Math.max(10, Math.floor(this.cellSize * 0.34));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px system-ui, sans-serif`;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col]) continue;
        const hash = (row * 31 + col * 17 + this.evolution.maxEraReached * 13) % 23;
        if (hash > 1) continue;

        const emoji = profile.ambientEmojis[(row + col + this.evolution.maxEraReached) % profile.ambientEmojis.length];
        const { x, y } = this.cellCenter(col, row);
        ctx.globalAlpha = hash === 0 ? 0.22 : 0.14;
        ctx.fillText(emoji, x, y);
      }
    }

    ctx.restore();
  }

  private drawEntities(ctx: CanvasRenderingContext2D): void {
    const fontSize = Math.floor(this.cellSize * 0.72);
    const emojiFont = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;

    for (const vis of this.visuals.values()) {
      if (vis.scale <= 0.01) continue;
      const drawX = Math.round(vis.x);
      const drawY = Math.round(vis.y);
      const drawScale = Math.round(vis.scale * 100) / 100;

      ctx.save();
      ctx.globalAlpha  = 1;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font         = `${fontSize}px ${emojiFont}`;
      ctx.fillStyle    = '#111111';
      ctx.imageSmoothingEnabled = false;
      ctx.shadowColor  = 'rgba(0,0,0,0.14)';
      ctx.shadowBlur   = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.translate(drawX, drawY);
      if (drawScale !== 1) ctx.scale(drawScale, drawScale);
      ctx.fillText(vis.entity.emoji, 0, 0);
      ctx.restore();
    }
  }

  private drawInteractionFeedback(ctx: CanvasRenderingContext2D): void {
    if (!this.interactionFlash || this.interactionFlash.alpha <= 0.01) return;

    const cs = this.cellSize;
    const x = this.offsetX + this.interactionFlash.col * cs;
    const y = this.offsetY + this.interactionFlash.row * cs;
    const inset = Math.max(2, cs * 0.08);

    ctx.save();
    ctx.globalAlpha = this.interactionFlash.alpha;
    ctx.strokeStyle = this.interactionFlash.color;
    ctx.lineWidth = Math.max(2, Math.floor(cs * 0.08));
    ctx.strokeRect(
      x + inset * this.interactionFlash.scale,
      y + inset * this.interactionFlash.scale,
      cs - inset * 2 * this.interactionFlash.scale,
      cs - inset * 2 * this.interactionFlash.scale
    );
    ctx.restore();
  }

  // ── Private: grid helpers ───────────────────────────────────────────────────

  private cellCenter(col: number, row: number) {
    return {
      x: this.offsetX + col * this.cellSize + this.cellSize / 2,
      y: this.offsetY + row * this.cellSize + this.cellSize * 0.74,
    };
  }

  private cellFromPoint(x: number, y: number): { col: number; row: number } | null {
    const localX = x - this.offsetX;
    const localY = y - this.offsetY;
    if (localX < 0 || localY < 0) return null;

    const col = Math.floor(localX / this.cellSize);
    const row = Math.floor(localY / this.cellSize);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return { col, row };
  }

  private findFreeCell(cx: number, cy: number): { x: number; y: number } | null {
    for (let radius = 0; radius <= 8; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && !this.grid[ny][nx]) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    return null;
  }

  // ── Private: entity lifecycle ────────────────────────────────────────────────

  private spawnInitial(): void {
    const count = Math.floor(this.cols * this.rows * GAME_CONFIG.INITIAL_FILL);
    const entities = this.evolution.spawnInitial(this.cols, this.rows, count);
    for (const e of entities) {
      const spawnCell = this.findTerrainCompatibleFreeCell(e, e.gridX, e.gridY);
      if (!spawnCell) continue;
      e.gridX = spawnCell.x;
      e.gridY = spawnCell.y;
      this.placeEntity(e, false);
    }
  }

  private placeEntity(entity: Entity, animated = false): void {
    this.grid[entity.gridY][entity.gridX] = entity;
    const { x, y } = this.cellCenter(entity.gridX, entity.gridY);
    const vis: EntityVisual = { entity, x, y, targetX: x, targetY: y, scale: 0, alpha: 1 };
    this.visuals.set(entity.id, vis);
    this.spreadTimers.set(entity.id, randomInt(entity.ticksPerSpread));

    if (animated) {
      this.tweens.add(220, t => {
        vis.scale = t;
        vis.alpha = 1;
      }, { ease: Ease.backOut });
    } else {
      vis.scale = this.getVisualScale(entity);
      vis.alpha = 1;
    }
  }

  private removeEntity(entity: Entity): void {
    entity.isAlive = false;
    if (this.grid[entity.gridY]?.[entity.gridX] === entity) {
      this.grid[entity.gridY][entity.gridX] = null;
    }
    this.spreadTimers.delete(entity.id);
    this.visuals.delete(entity.id);
  }

  // ── Private: simulation ──────────────────────────────────────────────────────

  private trySpread(entity: Entity, currentEra: number): void {
    if (!this.shouldSpread(entity)) return;

    const freeTargets = DIRS
      .map(({ dx, dy }) => ({ x: entity.gridX + dx, y: entity.gridY + dy }))
      .filter(({ x, y }) => x >= 0 && x < this.cols && y >= 0 && y < this.rows)
      .filter(({ x, y }) => !this.grid[y][x])
      .filter(({ x, y }) => this.canOccupyTerrain(entity, this.terrain[y]?.[x] ?? 'water'))
      .sort((a, b) => this.getSpreadTargetScore(entity, b.x, b.y) - this.getSpreadTargetScore(entity, a.x, a.y));

    if (freeTargets.length > 0) {
      const target = freeTargets[0];
      this.spawnColonyFrom(entity, target.x, target.y);
      return;
    }

    const occupiedTargets = DIRS
      .map(({ dx, dy }) => ({ x: entity.gridX + dx, y: entity.gridY + dy }))
      .filter(({ x, y }) => x >= 0 && x < this.cols && y >= 0 && y < this.rows)
      .map(({ x, y }) => this.grid[y][x])
      .filter((occupant): occupant is Entity => Boolean(occupant?.isAlive))
      .sort((a, b) => this.getCompetitionPriority(a, currentEra) - this.getCompetitionPriority(b, currentEra));

    if (occupiedTargets.length > 0) {
      this.resolveCompetition(entity, occupiedTargets[0], currentEra);
    }
  }

  private processInteractionTurn(entity: Entity, clickScore: number): void {
    const currentEra = this.evolution.maxEraReached;
    this.applyClickConsequences(entity, clickScore);
    if (!entity.isAlive) {
      this.removeEntity(entity);
      this.updateEntropyFromCurrentState();
      return;
    }

    const steps = this.getInteractionStepCount(currentEra);
    const protectedClick = clickScore >= 0;

    for (let i = 0; i < steps; i++) {
      if (!entity.isAlive) break;
      this.processEntityStep(entity, protectedClick);
    }

    const neighbors = this.getNeighborEntities(entity.gridX, entity.gridY);
    const neighborSteps = currentEra <= 4 ? 4 : 5;
    for (const neighbor of neighbors) {
      if (!neighbor.isAlive) continue;
      const neighborCompatible =
        Math.abs(entity.level - neighbor.level) <= 1 &&
        (neighbor.lineage === entity.lineage || neighbor.lineage === 'primordial' || entity.lineage === 'primordial');

      if (protectedClick && !neighborCompatible) continue;
      if (!protectedClick && neighborCompatible) continue;

      for (let i = 0; i < neighborSteps; i++) {
        if (!neighbor.isAlive) break;
        this.processEntityStep(neighbor, protectedClick && neighborCompatible);
      }
    }

    this.updateEntropyFromCurrentState();
    this.replenishPopulationIfNeeded();
  }

  private processEntityStep(entity: Entity, protectedFromBadOutcome = false): void {
    const currentEra = this.evolution.maxEraReached;
    const environmentProfile = this.environment.getProfile(currentEra);
    const basePressure = this.environment.evaluateEntity(entity, currentEra);
    const boostedPressure = protectedFromBadOutcome ? {
      ...basePressure,
      ageMultiplier: Math.min(1.8, basePressure.ageMultiplier * 1.08),
      deathRisk: Math.max(0, basePressure.deathRisk * 0.28),
      reproductionModifier: Math.min(1.4, basePressure.reproductionModifier * 1.18),
    } : basePressure;

    entity.tick({
      ...boostedPressure,
      deathRisk: Math.min(0.25, boostedPressure.deathRisk + (protectedFromBadOutcome ? this.getEntropyDeathRisk() * 0.2 : this.getEntropyDeathRisk())),
    });
    if (!entity.isAlive) {
      this.removeEntity(entity);
      return;
    }

    this.updatePopulationDynamics(entity, boostedPressure, environmentProfile);
    if (protectedFromBadOutcome) {
      entity.resource = Math.min(1, entity.resource + 0.05);
      entity.population = Math.max(entity.population, 1.2);
    }
    this.syncVisual(entity);
    if (!entity.isAlive) {
      this.removeEntity(entity);
      return;
    }

    const timer = (this.spreadTimers.get(entity.id) ?? 1) - 1;
    this.spreadTimers.set(entity.id, timer);
    if (timer <= 0) {
      this.spreadTimers.set(entity.id, entity.ticksPerSpread);
      this.trySpread(entity, currentEra);
    }

    this.tryEvolutionOpportunity(entity, currentEra);
  }

  private tryMergeEntities(a: Entity, b: Entity, currentEra: number): void {
    const cx = Math.floor((a.gridX + b.gridX) / 2);
    const cy = Math.floor((a.gridY + b.gridY) / 2);

    // Respect hard population cap — no child if already at max
    if (this.getTotalPopulation() >= GAME_CONFIG.MAX_POPULATION) return;

    // Need a free cell for the child; parents stay in place
    const previewChild = Entity.combine(a, b, cx, cy);
    if (!previewChild) return;
    const spawnCell = this.findTerrainCompatibleFreeCell(previewChild, cx, cy);
    if (!spawnCell) return;

    const result = this.evolution.tryMerge(
      a,
      b,
      cx,
      cy,
      this.getPairEvolutionReadiness(a, b, currentEra)
    );
    if (!result) return;

    result.child.gridX = spawnCell.x;
    result.child.gridY = spawnCell.y;

    // Parents remain alive and on the grid — pulse animation only
    for (const id of [a.id, b.id]) {
      const vis = this.visuals.get(id);
      if (!vis) continue;
      const base = vis.scale;
      this.tweens.add(220, t => {
        vis.scale = base + Math.sin(t * Math.PI) * 0.55;
      }, { ease: Ease.sineOut });
    }

    // Particle burst at midpoint, then spawn child
    const mergeCenter = this.cellCenter(cx, cy);
    const hex = result.child.color.toString(16).padStart(6, '0');
    this.particles.burst(mergeCenter.x, mergeCenter.y, `#${hex}`);
    this.placeEntity(result.child, true);

    if (result.newEraReached) this.hud.showEraBanner(result.eraName);
    this.updateHUD();
  }

  private replenishPopulationIfNeeded(): void {
    if (this.getTotalPopulation() >= GAME_CONFIG.MIN_POPULATION) return;
    if (this.getOccupiedRatio() >= 0.42) return;

    const recruits = this.evolution.spawnReplenishment(this.cols, this.rows, GAME_CONFIG.REPLENISH_AMOUNT);
    for (const entity of recruits) {
      const spawnCell = this.findTerrainCompatibleFreeCell(entity, entity.gridX, entity.gridY);
      if (!spawnCell) continue;
      entity.gridX = spawnCell.x;
      entity.gridY = spawnCell.y;
      this.placeEntity(entity, true);
    }
  }

  private updateEntropy(
    population: number,
    avgLevel: number,
    avgResilience: number,
    hostility: number,
    reproductionBias: number
  ): void {
    const popPressure = population / GAME_CONFIG.MAX_POPULATION;
    const complexityPressure = avgLevel / Math.max(1, this.evolution.maxEraReached || 1, 16);
    const eraPressure = this.evolution.maxEraReached / 16;
    const resilienceRelief = avgResilience * 0.22;
    const stabilityRelief = reproductionBias * 0.08;
    const targetEntropy = Math.max(
      0.04,
      Math.min(
        0.98,
        0.08 + popPressure * 0.34 + complexityPressure * 0.22 + eraPressure * 0.16 + hostility * 0.35 - resilienceRelief - stabilityRelief
      )
    );

    this.entropy += (targetEntropy - this.entropy) * 0.18;
    this.entropy = Math.max(0.04, Math.min(0.98, this.entropy));
    if (this.collapseCooldown > 0) this.collapseCooldown--;
  }

  private getEntropyDeathRisk(): number {
    return Math.max(0, (this.entropy - 0.35) * 0.028);
  }

  private getEntropyReproductionModifier(): number {
    return Math.max(0.35, 1 - Math.max(0, this.entropy - 0.28) * 0.9);
  }

  private updateEntropyFromCurrentState(): void {
    const entities = Array.from(this.visuals.values(), vis => vis.entity);
    const profile = this.environment.getProfile(this.evolution.maxEraReached);
    let totalPopulation = 0;
    let totalLevel = 0;
    let totalResilience = 0;
    for (const entity of entities) {
      totalPopulation += Math.max(1, Math.round(entity.population));
      totalLevel += entity.level;
      totalResilience += entity.genes.resilience;
    }
    const avgLevel = entities.length > 0 ? totalLevel / entities.length : 0;
    const avgResilience = entities.length > 0 ? totalResilience / entities.length : 0;
    this.updateEntropy(totalPopulation, avgLevel, avgResilience, profile.hostility, profile.reproductionBias);
  }



  private updateHUD(): void {
    let pop = 0;
    const counts = new Map<string, number>();
    const environmentProfile = this.environment.getProfile(this.evolution.maxEraReached);
    const environmentName = environmentProfile.name;
    for (const vis of this.visuals.values()) {
      const entity = vis.entity;
      const localPopulation = Math.max(1, Math.round(entity.population));
      pop += localPopulation;
      counts.set(entity.name, (counts.get(entity.name) ?? 0) + localPopulation);
    }
    this.hud.update(this.evolution.getStats(pop, environmentName, this.entropy), counts, environmentProfile);
  }
  private updatePopulationDynamics(entity: Entity, pressure: ReturnType<EnvironmentSystem['evaluateEntity']>, environmentProfile: ReturnType<EnvironmentSystem['getProfile']>): void {
    const terrain = this.terrain[entity.gridY]?.[entity.gridX] ?? 'water';
    const terrainSuitability = this.getTerrainSuitability(entity, terrain);
    const earlyEraGrowthBrake = this.getEarlyEraGrowthBrake();
    const carryingCapacity = this.getCarryingCapacity(entity, environmentProfile) * (0.45 + terrainSuitability * 0.8);
    const regen = 0.16 * (1 - environmentProfile.hostility * 0.45) * (0.5 + terrainSuitability * 0.8);
    const consumption = Math.max(0.05, entity.population * (0.012 + entity.genes.size * 0.006));
    entity.resource = Math.max(0, Math.min(1, entity.resource + regen - consumption));

    const resourceFactor = 0.3 + entity.resource * 0.7;
    const crowding = Math.min(1.4, entity.population / carryingCapacity);
    const occupancyPenalty = this.getOccupiedRatio() * 0.18;
    const growthRate = (0.06 + entity.genes.fertility * 0.12) * pressure.reproductionModifier * this.getEntropyReproductionModifier() * (0.35 + terrainSuitability * 0.9) * earlyEraGrowthBrake;
    const lossRate = 0.035 + Math.max(0, crowding - 1) * 0.24 + Math.max(0, 0.45 - entity.resource) * 0.28 + this.getEntropyDeathRisk() * 2.8 + occupancyPenalty + Math.max(0, 0.72 - terrainSuitability) * 0.24;
    const growth = entity.population * growthRate * resourceFactor * Math.max(0, 1 - crowding * 0.75);
    const losses = entity.population * lossRate;

    entity.population = Math.max(0, Math.min(carryingCapacity * 1.15, entity.population + growth - losses));

    if (entity.population < 0.75) {
      entity.isAlive = false;
    }
  }

  private shouldSpread(entity: Entity): boolean {
    const occupiedRatio = this.getOccupiedRatio();
    if (occupiedRatio >= 0.68) return false;
    const spreadThresholdMultiplier = this.evolution.maxEraReached <= 4 ? 0.9 : this.evolution.maxEraReached <= 7 ? 0.78 : 0.64;
    return entity.population >= Math.max(10, entity.baseCarryingCapacity * spreadThresholdMultiplier);
  }

  private spawnColonyFrom(parent: Entity, nx: number, ny: number): void {
    const colonySize = Math.max(2, Math.round(parent.population * (0.1 + parent.genes.fertility * 0.08)));
    if (parent.population - colonySize < 3) return;

    const child = new Entity(
      {
        level: parent.level,
        emoji: parent.emoji,
        name: parent.name,
        englishName: '',
        era: parent.era,
        englishEra: '',
        color: parent.color,
        lineage: parent.lineage,
        baseGenes: parent.genes,
      },
      nx,
      ny,
      parent.genes,
      parent.generation
    );
    child.population = colonySize;
    child.resource = 0.34 + this.getTerrainSuitability(child, this.terrain[ny]?.[nx] ?? 'water') * 0.3;
    parent.population -= colonySize;
    this.placeEntity(child, true);
    this.syncVisual(parent);
  }

  private resolveCompetition(attacker: Entity, defender: Entity, currentEra: number): void {
    const attackPressure = this.environment.evaluateEntity(attacker, currentEra);
    const defendPressure = this.environment.evaluateEntity(defender, currentEra);
    const attackTerrain = this.getTerrainSuitability(attacker, this.terrain[attacker.gridY]?.[attacker.gridX] ?? 'water');
    const defendTerrain = this.getTerrainSuitability(defender, this.terrain[defender.gridY]?.[defender.gridX] ?? 'water');
    const attackScore = attacker.level * 0.16 + attackPressure.fitness * 1.4 + attackTerrain * 0.8 + attacker.population / Math.max(1, this.getCarryingCapacity(attacker, this.environment.getProfile(currentEra)));
    const defendScore = defender.level * 0.16 + defendPressure.fitness * 1.5 + defendTerrain * 0.8 + defender.population / Math.max(1, this.getCarryingCapacity(defender, this.environment.getProfile(currentEra)));
    const swing = attackScore - defendScore;

    if (Math.abs(swing) < 0.12 && Math.abs(attacker.level - defender.level) <= 1) {
      this.tryMergeEntities(attacker, defender, currentEra);
      return;
    }

    const pressure = Math.max(1, Math.round((Math.abs(swing) * 2.4 + 0.8) * Math.max(1, attacker.population * 0.12)));
    if (swing > 0) {
      defender.population -= pressure;
      attacker.population = Math.max(1, attacker.population - Math.max(1, Math.round(pressure * 0.25)));
      if (defender.population < 0.75) {
        const nx = defender.gridX;
        const ny = defender.gridY;
        this.removeEntity(defender);
        this.spawnColonyFrom(attacker, nx, ny);
      } else {
        this.syncVisual(defender);
      }
    } else {
      attacker.population -= pressure;
      defender.population = Math.max(1, defender.population - Math.max(0, Math.round(pressure * 0.15)));
      if (attacker.population < 0.75) {
        this.removeEntity(attacker);
      } else {
        this.syncVisual(attacker);
      }
      this.syncVisual(defender);
    }
  }

  private tryEvolutionOpportunity(entity: Entity, currentEra: number): void {
    const candidates = this.getNeighborEntities(entity.gridX, entity.gridY)
      .filter(neighbor => this.isEvolutionPairReady(entity, neighbor, currentEra))
      .sort((a, b) => this.getEvolutionPriority(entity, b) - this.getEvolutionPriority(entity, a));

    if (candidates.length === 0) return;
    this.tryMergeEntities(entity, candidates[0], currentEra);
  }

  private getCarryingCapacity(entity: Entity, environmentProfile: ReturnType<EnvironmentSystem['getProfile']>): number {
    return Math.max(6, Math.round(entity.baseCarryingCapacity * (1.08 - environmentProfile.hostility * 0.35 + entity.genes.resilience * 0.12)));
  }

  private getVisualScale(entity: Entity): number {
    const density = Math.min(1, entity.population / Math.max(1, entity.baseCarryingCapacity));
    return 0.72 + density * 0.5 + entity.genes.size * 0.12;
  }

  private getNeighborEntities(col: number, row: number): Entity[] {
    const neighbors: Entity[] = [];
    for (const { dx, dy } of DIRS) {
      const nx = col + dx;
      const ny = row + dy;
      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
      const entity = this.grid[ny][nx];
      if (entity) neighbors.push(entity);
    }
    return neighbors;
  }

  private getInteractionStepCount(currentEra: number): number {
    if (currentEra <= 1) return 12;
    if (currentEra <= 4) return 9;
    if (currentEra <= 8) return 7;
    return 5;
  }

  private evaluateClickQuality(entity: Entity): number {
    const terrain = this.terrain[entity.gridY]?.[entity.gridX] ?? 'water';
    const terrainSuitability = this.getTerrainSuitability(entity, terrain);
    const neighbors = this.getNeighborEntities(entity.gridX, entity.gridY);
    let compatibleSupport = 0;
    let hostilePressure = 0;

    for (const neighbor of neighbors) {
      if (!neighbor.isAlive) continue;
      const compatibleLevel = Math.abs(entity.level - neighbor.level) <= 1;
      const compatibleLineage =
        neighbor.lineage === entity.lineage ||
        neighbor.lineage === 'primordial' ||
        entity.lineage === 'primordial';

      if (compatibleLevel && compatibleLineage) {
        compatibleSupport += 1;
      } else {
        hostilePressure += 1 + Math.max(0, neighbor.level - entity.level) * 0.5;
      }
    }

    const carryingCapacity = Math.max(1, entity.baseCarryingCapacity);
    const hasGoodTerrain = terrainSuitability >= 0.72;
    const canStillGrow = entity.population <= carryingCapacity * 0.96;
    const hasSupport = compatibleSupport > 0;
    const isolated = neighbors.length === 0;
    const overwhelmed = hostilePressure > compatibleSupport + 0.5;

    if (hasGoodTerrain && hasSupport && canStillGrow) return 2;
    if (hasGoodTerrain && !isolated && !overwhelmed && canStillGrow) return 1;
    if (!hasGoodTerrain && isolated) return -2;
    if (overwhelmed || !canStillGrow) return -1;
    return 0;
  }

  private applyClickConsequences(entity: Entity, clickScore: number): void {
    if (clickScore >= 0) {
      entity.resource = Math.min(1, entity.resource + 0.38 + clickScore * 0.22);
      entity.population += Math.max(4, 5 + clickScore * 5.8);
      return;
    }

    const penalty = Math.abs(clickScore);
    entity.resource = Math.max(0, entity.resource - (0.03 + penalty * 0.05));
    entity.population = Math.max(0, entity.population - (0.45 + penalty * 0.9));
    if (entity.population < 0.75) {
      entity.isAlive = false;
    }
  }

  private syncVisual(entity: Entity): void {
    const vis = this.visuals.get(entity.id);
    if (!vis) return;
    vis.x = vis.targetX;
    vis.y = vis.targetY;
    vis.scale = this.getVisualScale(entity);
    vis.alpha = 1;
  }

  private showInteractionFeedback(col: number, row: number, color: string): void {
    this.interactionFlash = { col, row, alpha: 0.95, scale: 0.35, color };
    this.tweens.add(180, t => {
      if (!this.interactionFlash) return;
      this.interactionFlash.alpha = 0.95 * (1 - t);
      this.interactionFlash.scale = 0.35 + t * 0.55;
    }, {
      ease: Ease.quadOut,
      onComplete: () => {
        this.interactionFlash = null;
      },
    });
  }

  private showEntityClickJuice(entity: Entity, clickScore: number): void {
    const vis = this.visuals.get(entity.id);
    if (!vis) return;

    const baseScale = this.getVisualScale(entity);
    vis.scale = baseScale * 0.92;

    this.tweens.add(150, t => {
      const punch = t < 0.45
        ? 0.92 + (t / 0.45) * 0.34
        : 1.26 - ((t - 0.45) / 0.55) * 0.26;
      vis.scale = baseScale * punch;
    }, {
      ease: Ease.quadOut,
      onComplete: () => {
        vis.scale = this.getVisualScale(entity);
      },
    });

    this.particles.burst(vis.x, vis.y - this.cellSize * 0.18, clickScore >= 0 ? '#58c16c' : '#d35a4b', 8);
  }

  private getTotalPopulation(): number {
    let total = 0;
    for (const vis of this.visuals.values()) {
      total += Math.max(1, Math.round(vis.entity.population));
    }
    return total;
  }

  private getOccupiedRatio(): number {
    return this.visuals.size / Math.max(1, this.cols * this.rows);
  }

  private getEarlyEraGrowthBrake(): number {
    const era = this.evolution.maxEraReached;
    if (era <= 2) return 0.42;
    if (era <= 4) return 0.56;
    if (era <= 7) return 0.74;
    return 1;
  }

  private getEvolutionThreshold(currentEra: number, entity: Entity): number {
    const multiplier = currentEra <= 4 ? 0.68 : currentEra <= 7 ? 0.56 : 0.42;
    return Math.max(8, entity.baseCarryingCapacity * multiplier);
  }

  private getPairEvolutionReadiness(a: Entity, b: Entity, currentEra: number): number {
    if (!this.isEvolutionPairReady(a, b, currentEra)) return 0;
    return 1;
  }

  private isEvolutionPairReady(entity: Entity, neighbor: Entity, currentEra: number): boolean {
    if (!neighbor.isAlive) return false;
    if (Math.abs(entity.level - neighbor.level) > 1) return false;
    if (entity.population < this.getEvolutionThreshold(currentEra, entity)) return false;
    if (neighbor.population < this.getEvolutionThreshold(currentEra, neighbor)) return false;

    const sameBranch =
      entity.lineage === neighbor.lineage ||
      entity.lineage === 'primordial' ||
      neighbor.lineage === 'primordial';
    if (!sameBranch) return false;

    const ownTerrain = this.terrain[entity.gridY]?.[entity.gridX] ?? 'water';
    const neighborTerrain = this.terrain[neighbor.gridY]?.[neighbor.gridX] ?? 'water';
    if (!this.canOccupyTerrain(entity, ownTerrain) || !this.canOccupyTerrain(neighbor, neighborTerrain)) return false;

    return true;
  }

  private getEvolutionPriority(entity: Entity, neighbor: Entity): number {
    return neighbor.population + this.getTerrainSuitability(neighbor, this.terrain[neighbor.gridY]?.[neighbor.gridX] ?? 'water') * 20 - Math.abs(entity.level - neighbor.level) * 8;
  }

  private getSpreadTargetScore(entity: Entity, x: number, y: number): number {
    const terrain = this.terrain[y]?.[x] ?? 'water';
    const terrainSuitability = this.getTerrainSuitability(entity, terrain);
    const support = this.getNeighborEntities(x, y)
      .filter(neighbor => neighbor.lineage === entity.lineage || neighbor.lineage === 'primordial' || entity.lineage === 'primordial')
      .length;
    return terrainSuitability * 10 + support;
  }

  private getCompetitionPriority(target: Entity, currentEra: number): number {
    const profile = this.environment.getProfile(currentEra);
    const terrainSuitability = this.getTerrainSuitability(target, this.terrain[target.gridY]?.[target.gridX] ?? 'water');
    return target.population + target.level * 2 + terrainSuitability * 6 + profile.hostility;
  }

  private findTerrainCompatibleFreeCell(entity: Entity, cx: number, cy: number): { x: number; y: number } | null {
    for (let radius = 0; radius <= 8; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
          if (this.grid[ny][nx]) continue;
          if (!this.canOccupyTerrain(entity, this.terrain[ny]?.[nx] ?? 'water')) continue;
          return { x: nx, y: ny };
        }
      }
    }
    return this.findFreeCell(cx, cy);
  }

  private canOccupyTerrain(entity: Entity, terrain: TerrainTile): boolean {
    return this.getTerrainSuitability(entity, terrain) >= 0.45;
  }

  private getTerrainSuitability(entity: Entity, terrain: TerrainTile): number {
    if (entity.level <= 4) return terrain === 'water' ? 1 : 0.62;

    if (entity.lineage === 'marine' || entity.lineage === 'mollusk') {
      return terrain === 'water' ? 1 : 0.22;
    }

    if (entity.lineage === 'plant') {
      return terrain === 'land' ? 1 : 0.18;
    }

    if (entity.lineage === 'arthropod') {
      return terrain === 'land' ? 0.94 : 0.3;
    }

    if (entity.lineage === 'vertebrate') {
      if (entity.level <= 10) return terrain === 'water' ? 0.96 : 0.34;
      if (entity.level === 11) return terrain === 'land' ? 0.76 : 0.72;
      return terrain === 'land' ? 1 : 0.22;
    }

    return terrain === 'water' ? 0.75 : 0.65;
  }

  private generateTerrainMap(): TerrainTile[][] {
    const map: TerrainTile[][] = [];

    for (let row = 0; row < this.rows; row++) {
      const terrainRow: TerrainTile[] = [];
      for (let col = 0; col < this.cols; col++) {
        const edgeDistance = Math.min(col, row, this.cols - 1 - col, this.rows - 1 - row);
        const dx = (col - this.cols / 2) / Math.max(1, this.cols / 2);
        const dy = (row - this.rows / 2) / Math.max(1, this.rows / 2);
        const radialBias = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy));
        const noise =
          Math.sin((col + 1 + this.terrainSeed * 0.017) * 0.78) * 0.22 +
          Math.cos((row + 2 + this.terrainSeed * 0.013) * 0.66) * 0.18 +
          Math.sin((col + row + this.terrainSeed * 0.021) * 0.4) * 0.16 +
          this.seededNoise(col, row) * 0.24;
        const score = radialBias * 0.62 + noise + edgeDistance * 0.012;
        terrainRow.push(score > 0.52 ? 'land' : 'water');
      }
      map.push(terrainRow);
    }

    return map;
  }

  private seededNoise(col: number, row: number): number {
    const value = Math.sin((col + 1) * 127.1 + (row + 1) * 311.7 + this.terrainSeed * 74.7) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
  }
}















