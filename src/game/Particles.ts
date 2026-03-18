interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  elapsed: number;
  lifetime: number;
  color: string;
  radius: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  burst(x: number, y: number, color: string, count = 14): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        elapsed: 0,
        lifetime: 350 + Math.random() * 250,
        color,
        radius: 2 + Math.random() * 4,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.elapsed += dt;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vx *= 0.90;
      p.vy *= 0.90;
    }
    this.particles = this.particles.filter(p => p.elapsed < p.lifetime);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.elapsed / p.lifetime;
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }
}
