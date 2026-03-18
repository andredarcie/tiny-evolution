import { GameScene } from './scenes/GameScene';
import { HUD } from './HUD';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: GameScene;
  private lastTime = 0;
  private animId = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;

    const hud = new HUD(container);
    this.scene = new GameScene(hud);

    this.applySize();
    const topOffset = (document.getElementById('hud-chrono') as HTMLElement | null)?.offsetHeight ?? 55;
    this.scene.onResize(window.innerWidth, window.innerHeight, topOffset);

    window.addEventListener('resize', this.onWindowResize);
    this.animId = requestAnimationFrame(this.loop);
  }

  private applySize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width  = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width  = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private onWindowResize = (): void => {
    this.applySize();
    const topOffset = (document.getElementById('hud-chrono') as HTMLElement | null)?.offsetHeight ?? 55;
    this.scene.onResize(window.innerWidth, window.innerHeight, topOffset);
  };

  private loop = (timestamp: number): void => {
    const dt = this.lastTime ? Math.min(timestamp - this.lastTime, 50) : 0;
    this.lastTime = timestamp;

    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.scene.update(dt);
    this.scene.render(this.ctx);

    this.animId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onWindowResize);
  }
}
