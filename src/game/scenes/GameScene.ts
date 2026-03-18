import { Entity } from '../entities/Entity';
import { EvolutionSystem } from '../systems/EvolutionSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { getGridDimensions, GAME_CONFIG } from '../config';
import { TweenManager, Ease } from '../Tween';
import { ParticleSystem } from '../Particles';
import type { HUD } from '../HUD';

interface EntityVisual {
  entity: Entity;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  alpha: number;
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
  private visuals = new Map<number, EntityVisual>();
  private evolution = new EvolutionSystem();
  private environment = new EnvironmentSystem();
  private tweens = new TweenManager();
  private particles = new ParticleSystem();
  private moveTimers = new Map<number, number>();
  private entropy = 0.18;
  private collapseCooldown = 0;

  private tickAccum = 0;
  private readonly TICK_MS = 1000 / GAME_CONFIG.TICKS_PER_SECOND;

  constructor(hud: HUD) {
    this.hud = hud;
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
    this.moveTimers.clear();
    this.particles.clear();
    this.grid = Array.from({ length: this.rows }, () => new Array<Entity | null>(this.cols).fill(null));

    if (survivors.length > 0) {
      // Re-place existing entities at updated pixel positions
      for (const e of survivors) this.placeEntity(e, false);
    } else {
      // First load — start fresh
      this.evolution.reset();
      this.spawnInitial();
    }
    this.updateHUD();
  }

  update(dt: number): void {
    this.tweens.tick(dt);
    this.particles.update(dt);

    // Smooth position interpolation for all visuals
    const lerpFactor = 1 - Math.pow(0.001, dt / 1000);
    for (const vis of this.visuals.values()) {
      vis.x += (vis.targetX - vis.x) * lerpFactor;
      vis.y += (vis.targetY - vis.y) * lerpFactor;
    }

    // Simulation ticks
    this.tickAccum += dt;
    if (this.tickAccum >= this.TICK_MS) {
      this.tickAccum -= this.TICK_MS;
      this.simulationStep();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = this.logicalW;
    const h = this.logicalH;

    // Light background outside the grid
    ctx.fillStyle = '#d6d0c8';
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(ctx);
    this.drawEnvironmentDecor(ctx);
    this.particles.draw(ctx);
    this.drawEntities(ctx);
  }

  // ── Private: drawing ────────────────────────────────────────────────────────

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save(); // isolate all state changes inside this method
    const cs = this.cellSize;
    const l  = this.offsetX;
    const t  = this.offsetY;

    // 1. Tile fills — simple checkerboard
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = l + c * cs;
        const y = t + r * cs;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f8f5f0' : '#ede9e2';
        ctx.fillRect(x, y, cs, cs);
      }
    }

    // 2. Grid lines — visible warm borders
    ctx.save();
    ctx.strokeStyle = '#b8b0a4';
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

    for (const vis of this.visuals.values()) {
      if (vis.alpha <= 0.01 || vis.scale <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha  = Math.min(vis.alpha, 1);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = `${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle    = '#111111';
      ctx.shadowColor  = 'rgba(0,0,0,0.30)';
      ctx.shadowBlur   = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.translate(vis.x, vis.y);
      if (vis.scale !== 1) ctx.scale(vis.scale, vis.scale);
      ctx.fillText(vis.entity.emoji, 0, 0);
      ctx.restore();
    }
  }

  // ── Private: grid helpers ───────────────────────────────────────────────────

  private cellCenter(col: number, row: number) {
    return {
      x: this.offsetX + col * this.cellSize + this.cellSize / 2,
      y: this.offsetY + row * this.cellSize + this.cellSize / 2,
    };
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
      if (!this.grid[e.gridY][e.gridX]) this.placeEntity(e, true);
    }
  }

  private placeEntity(entity: Entity, animated = false): void {
    this.grid[entity.gridY][entity.gridX] = entity;
    const { x, y } = this.cellCenter(entity.gridX, entity.gridY);
    const vis: EntityVisual = { entity, x, y, targetX: x, targetY: y, scale: 0, alpha: 0 };
    this.visuals.set(entity.id, vis);
    this.moveTimers.set(entity.id, Math.floor(Math.random() * entity.ticksPerMove));

    if (animated) {
      this.tweens.add(220, t => {
        vis.scale = t;
        vis.alpha = t;
      }, { ease: Ease.backOut });
    } else {
      vis.scale = 1;
      vis.alpha = 1;
    }
  }

  private removeEntity(entity: Entity): void {
    entity.isAlive = false;
    if (this.grid[entity.gridY]?.[entity.gridX] === entity) {
      this.grid[entity.gridY][entity.gridX] = null;
    }
    this.moveTimers.delete(entity.id);
    this.visuals.delete(entity.id);
  }

  // ── Private: simulation ──────────────────────────────────────────────────────

  private simulationStep(): void {
    const currentEra = this.evolution.maxEraReached;
    const entities: Entity[] = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const e = this.grid[r][c];
        if (e) entities.push(e);
      }

    const environmentProfile = this.environment.getProfile(currentEra);
    const avgLevel = entities.length > 0 ? entities.reduce((sum, entity) => sum + entity.level, 0) / entities.length : 0;
    const avgResilience = entities.length > 0 ? entities.reduce((sum, entity) => sum + entity.genes.resilience, 0) / entities.length : 0;
    this.updateEntropy(entities.length, avgLevel, avgResilience, environmentProfile.hostility, environmentProfile.reproductionBias);

    for (const entity of entities) {
      if (!entity.isAlive) { this.removeEntity(entity); continue; }
      const basePressure = this.environment.evaluateEntity(entity, currentEra);
      entity.tick({
        ...basePressure,
        deathRisk: Math.min(0.25, basePressure.deathRisk + this.getEntropyDeathRisk()),
      });
      if (!entity.isAlive) { this.removeEntity(entity); continue; }

      const timer = (this.moveTimers.get(entity.id) ?? 1) - 1;
      this.moveTimers.set(entity.id, timer);
      if (timer <= 0) {
        this.moveTimers.set(entity.id, entity.ticksPerMove);
        this.tryMove(entity, currentEra);
      }
    }

    this.maybeTriggerEntropyCollapse(entities);
    this.replenishPopulationIfNeeded();
    this.updateHUD();
  }

  private tryMove(entity: Entity, currentEra: number): void {
    const dirs = [...DIRS].sort(() => Math.random() - 0.5);
    for (const { dx, dy } of dirs) {
      const nx = entity.gridX + dx;
      const ny = entity.gridY + dy;
      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;

      const occupant = this.grid[ny][nx];
      if (!occupant) {
        this.moveEntityTo(entity, nx, ny);
        return;
      }

      if (entity.level > occupant.level) {
        this.removeEntity(occupant);
        this.moveEntityTo(entity, nx, ny);
      } else if (entity.level < occupant.level) {
        this.removeEntity(entity);
      } else {
        this.tryMergeEntities(entity, occupant, currentEra);
      }
      return;
    }
  }

  private moveEntityTo(entity: Entity, nx: number, ny: number): void {
    this.grid[entity.gridY][entity.gridX] = null;
    entity.gridX = nx;
    entity.gridY = ny;
    this.grid[ny][nx] = entity;

    const vis = this.visuals.get(entity.id);
    if (!vis) return;
    const { x, y } = this.cellCenter(nx, ny);
    vis.targetX = x;
    vis.targetY = y;
  }

  private tryMergeEntities(a: Entity, b: Entity, currentEra: number): void {
    const cx = Math.floor((a.gridX + b.gridX) / 2);
    const cy = Math.floor((a.gridY + b.gridY) / 2);

    // Respect hard population cap — no child if already at max
    if (this.visuals.size >= GAME_CONFIG.MAX_POPULATION) return;

    // Need a free cell for the child; parents stay in place
    const spawnCell = this.findFreeCell(cx, cy);
    if (!spawnCell) return;

    const pressure = this.environment.evaluatePair(a, b, currentEra);
    const result = this.evolution.tryMerge(a, b, cx, cy, pressure.reproductionModifier * this.getEntropyReproductionModifier());
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
    if (this.visuals.size >= GAME_CONFIG.MIN_POPULATION) return;

    const recruits = this.evolution.spawnReplenishment(this.cols, this.rows, GAME_CONFIG.REPLENISH_AMOUNT);
    for (const entity of recruits) {
      if (this.grid[entity.gridY][entity.gridX]) continue;
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

  private maybeTriggerEntropyCollapse(entities: Entity[]): void {
    if (this.entropy < 0.78 || this.collapseCooldown > 0 || entities.length < 8) return;
    if (Math.random() > (this.entropy - 0.74) * 0.6) return;

    const victims = entities
      .filter(entity => entity.isAlive)
      .sort((a, b) => (a.genes.resilience + a.level * 0.02) - (b.genes.resilience + b.level * 0.02))
      .slice(0, Math.max(3, Math.min(8, Math.floor(entities.length * (0.04 + this.entropy * 0.04)))));

    for (const victim of victims) {
      const center = this.cellCenter(victim.gridX, victim.gridY);
      this.particles.burst(center.x, center.y, '#7a2f1f', 10);
      this.removeEntity(victim);
    }

    this.entropy = Math.min(0.98, this.entropy + 0.06);
    this.collapseCooldown = 10;
  }

  private updateHUD(): void {
    let pop = 0;
    const counts = new Map<string, number>();
    const environmentProfile = this.environment.getProfile(this.evolution.maxEraReached);
    const environmentName = environmentProfile.name;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const e = this.grid[r][c];
        if (e) { pop++; counts.set(e.name, (counts.get(e.name) ?? 0) + 1); }
      }
    this.hud.update(this.evolution.getStats(pop, environmentName, this.entropy), counts, environmentProfile);
  }
}
