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
    const { width, height } = this.getViewportSize();
    this.scene.onResize(width, height, topOffset);

    window.addEventListener('resize', this.onWindowResize);
    window.visualViewport?.addEventListener('resize', this.onWindowResize);
    this.animId = requestAnimationFrame(this.loop);
  }

  private getViewportSize(): { width: number; height: number } {
    const viewport = window.visualViewport;
    return {
      width: Math.round(viewport?.width ?? window.innerWidth),
      height: Math.round(viewport?.height ?? window.innerHeight),
    };
  }

  private applySize(): void {
    const dpr = window.devicePixelRatio || 1;
    const { width: w, height: h } = this.getViewportSize();
    document.documentElement.style.setProperty('--app-height', `${h}px`);
    document.documentElement.style.setProperty('--app-width', `${w}px`);
    this.canvas.width  = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width  = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private onWindowResize = (): void => {
    this.applySize();
    const topOffset = (document.getElementById('hud-chrono') as HTMLElement | null)?.offsetHeight ?? 55;
    const { width, height } = this.getViewportSize();
    this.scene.onResize(width, height, topOffset);
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
    window.visualViewport?.removeEventListener('resize', this.onWindowResize);
  }
}
