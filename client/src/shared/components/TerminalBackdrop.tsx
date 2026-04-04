import { useEffect, useRef } from 'react';

/**
 * Subtle falling 0/1 columns — low opacity so content stays readable.
 */
export function TerminalBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const c = canvasRef.current;
      if (c) {
        const x = c.getContext('2d');
        if (x) {
          c.width = window.innerWidth;
          c.height = window.innerHeight;
          x.fillStyle = 'rgba(34, 197, 94, 0.03)';
          x.fillRect(0, 0, c.width, c.height);
        }
      }
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const fontSize = 13;
    let w = 0;
    let h = 0;
    let dpr = 1;
    /** Y position (px) for each column */
    let y: number[] = [];
    let speed: number[] = [];

    const initColumns = () => {
      const cols = Math.ceil(w / fontSize) + 2;
      y = Array.from({ length: cols }, () => Math.random() * h * 0.5);
      speed = Array.from({ length: cols }, () => 0.4 + Math.random() * 1.2);
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initColumns();
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = 'rgba(3, 8, 6, 0.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `500 ${fontSize}px ui-monospace, "JetBrains Mono", "Cascadia Code", monospace`;

      for (let i = 0; i < y.length; i++) {
        const bit = Math.random() > 0.5 ? '1' : '0';
        const isRed = Math.random() < 0.04;
        const alpha = isRed ? 0.2 + Math.random() * 0.18 : 0.07 + Math.random() * 0.12;
        ctx.fillStyle = isRed ? `rgba(248, 113, 113, ${alpha})` : `rgba(74, 222, 128, ${alpha})`;
        ctx.fillText(bit, i * fontSize, y[i]);
        y[i] += speed[i];
        if (y[i] > h + 40) {
          y[i] = -20 - Math.random() * 120;
          speed[i] = 0.4 + Math.random() * 1.2;
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
