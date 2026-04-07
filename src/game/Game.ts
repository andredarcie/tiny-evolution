import { TurnHUD } from './turns/TurnHUD';
import { TurnGameScene } from './turns/TurnGameScene';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: TurnGameScene;
  private animId = 0;
  private renderScale = 1;
  private readonly modalScrollableSelector = [
    '#info-modal-body',
    '#merge-modal-body',
    '#entity-modal-body',
    '.tree-modal-content',
    '.encyclopedia-content',
    '.encyclopedia-nav',
    '.colony-info-body',
  ].join(', ');

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.touchAction = 'none';
    container.appendChild(this.canvas);

    // Prevent page-level mobile gestures without blocking modal scrolling.
    document.addEventListener('touchmove', this.onDocumentTouchMove, { passive: false });

    this.ctx = this.canvas.getContext('2d')!;

    const hud = new TurnHUD(container, {
      onAdapt: () => this.scene.performAdapt(),
      onExpand: () => this.scene.startExpandMode(),
      onDecompose: () => this.scene.performDecompose(),
      onSeed: () => this.scene.startSeedMode(),
      onCancel: () => this.scene.cancelCurrentMode(),
      onCloseTerminalInfo: () => this.scene.dismissTerminalInfo(),
      onCloseMilestoneInfo: () => this.scene.dismissMilestoneInfo(),
      onOpenMilestoneNotification: () => this.scene.openMilestoneNotification(),
      onRestart: () => this.scene.restart(),
    });
    this.scene = new TurnGameScene(hud);

    this.applySize();
    const { width, height } = this.getViewportSize();
    this.scene.onResize(width, height);

    window.addEventListener('resize', this.onWindowResize);
    window.visualViewport?.addEventListener('resize', this.onWindowResize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    (window as typeof window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    }).render_game_to_text = () => JSON.stringify(this.scene.getDebugState());
    (window as typeof window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    }).advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let index = 0; index < steps; index += 1) {
        this.scene.update();
      }
    };
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
    const { width: w, height: h } = this.getViewportSize();
    const dpr = window.devicePixelRatio || 1;
    this.renderScale = Math.min(dpr, w < 980 ? 1.5 : 2);
    document.documentElement.style.setProperty('--app-height', `${h}px`);
    document.documentElement.style.setProperty('--app-width', `${w}px`);
    this.canvas.width  = Math.floor(w * this.renderScale);
    this.canvas.height = Math.floor(h * this.renderScale);
    this.canvas.style.width  = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private onWindowResize = (): void => {
    this.applySize();
    const { width, height } = this.getViewportSize();
    this.scene.onResize(width, height);
  };

  private onPointerDown = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.scene.handlePointerDown(event.clientX - rect.left, event.clientY - rect.top);
  };

  private onDocumentTouchMove = (event: TouchEvent): void => {
    const target = event.target;
    if (target instanceof Element && target.closest(this.modalScrollableSelector)) {
      return;
    }
    event.preventDefault();
  };

  private loop = (): void => {
    this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);

    this.scene.update();
    this.scene.render(this.ctx);

    this.animId = requestAnimationFrame(this.loop);
  };
  destroy(): void {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onWindowResize);
    window.visualViewport?.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('touchmove', this.onDocumentTouchMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    delete (window as typeof window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    }).render_game_to_text;
    delete (window as typeof window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    }).advanceTime;
  }
}
