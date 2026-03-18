export type EaseFn = (t: number) => number;

export const Ease = {
  linear:  (t: number) => t,
  sineOut: (t: number) => Math.sin(t * Math.PI * 0.5),
  quadOut: (t: number) => 1 - (1 - t) * (1 - t),
  quadIn:  (t: number) => t * t,
  backOut: (t: number) => {
    const c = 1.70158 + 1;
    return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  },
};

interface TweenTask {
  elapsed: number;
  duration: number;
  ease: EaseFn;
  update: (t: number) => void;
  onComplete?: () => void;
  done: boolean;
}

export class TweenManager {
  private tasks: TweenTask[] = [];

  add(
    duration: number,
    update: (t: number) => void,
    opts?: { ease?: EaseFn; onComplete?: () => void; delay?: number }
  ): void {
    this.tasks.push({
      elapsed: -(opts?.delay ?? 0),
      duration,
      ease: opts?.ease ?? Ease.linear,
      update,
      onComplete: opts?.onComplete,
      done: false,
    });
  }

  tick(dt: number): void {
    const snapshot = this.tasks.slice();
    for (const task of snapshot) {
      if (task.done) continue;
      task.elapsed += dt;
      if (task.elapsed < 0) continue;
      const raw = Math.min(task.elapsed / task.duration, 1);
      task.update(task.ease(raw));
      if (raw >= 1) {
        task.done = true;
        task.onComplete?.();
      }
    }
    this.tasks = this.tasks.filter(t => !t.done);
  }

  clear(): void {
    this.tasks = [];
  }
}
