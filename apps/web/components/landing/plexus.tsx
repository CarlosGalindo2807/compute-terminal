'use client';

// Animated network background ("plexus") that lives behind the hero on /.
// Ported from the Claude Design prototype script. Reads its colours from
// the active Aurum theme via CSS variables, so a light/dark mode flip on
// <html data-mode="…"> repaints without re-instantiating the canvas.
//
// Pointer interaction: nodes within R_INFLUENCE of the cursor get pushed
// away + swirled tangentially, with link colour shifting toward the glow.
// Pointer trap is disabled below the hero (body.scrolled class) so it
// doesn't intercept clicks in the sections below.

import { useEffect, useRef } from 'react';

type Palette = { node: string; link: string; glow: string; bg: string };
type Node = { x: number; y: number; vx: number; vy: number; r: number; bright: boolean };

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function readPalette(): Palette {
  return {
    node: readVar('--net-node') || 'rgba(255,255,255,0.9)',
    link: readVar('--net-link') || 'rgba(255,255,255,0.5)',
    glow: readVar('--net-glow') || 'rgba(217,180,106,0.85)',
    bg: readVar('--bg') || '#000',
  };
}

function parse(c: string): [number, number, number, number] {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [255, 255, 255, 1];
  const p = m[1]!.split(',').map((s) => parseFloat(s.trim()));
  if (p.length === 3) p.push(1);
  return [p[0]!, p[1]!, p[2]!, p[3]!];
}

function withAlpha(c: string, a: number): string {
  const [r, g, b] = parse(c);
  return `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
}

function mixWithGlow(base: string, glow: string, t: number, alpha: number): string {
  const a = parse(base);
  const b = parse(glow);
  const r = a[0] + (b[0] - a[0]) * t;
  const g = a[1] + (b[1] - a[1]) * t;
  const bl = a[2] + (b[2] - a[2]) * t;
  return `rgba(${r | 0},${g | 0},${bl | 0},${alpha.toFixed(3)})`;
}

export function Plexus() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const pointer = { x: -9999, y: -9999, active: false };
    let palette = readPalette();
    let nodes: Node[] = [];
    let rafId = 0;

    function seed() {
      const area = W * H;
      const count = Math.max(80, Math.min(220, Math.floor(area / 9000)));
      nodes = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.2 + 0.4,
        bright: Math.random() < 0.07,
      }));
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * DPR;
      canvas!.height = H * DPR;
      canvas!.style.width = W + 'px';
      canvas!.style.height = H + 'px';
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      seed();
    }

    const R_INFLUENCE = 180;
    const MAX_LINK_DIST = 130;

    function step() {
      ctx!.fillStyle = palette.bg;
      ctx!.globalAlpha = 1;
      ctx!.fillRect(0, 0, W, H);

      // top-centre volumetric glow
      const grad = ctx!.createRadialGradient(W * 0.5, -80, 20, W * 0.5, -80, Math.max(W, H) * 0.9);
      const lowAlphaGlow = palette.glow.replace(/rgba?\(([^)]+)\)/, (_, inner: string) => {
        const parts = inner.split(',').map((s: string) => s.trim());
        if (parts.length === 4) return `rgba(${parts[0]},${parts[1]},${parts[2]},0.06)`;
        return 'rgba(255,255,255,0.06)';
      });
      grad.addColorStop(0, lowAlphaGlow);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, W, H);

      // bottom fade
      const mist = ctx!.createLinearGradient(0, H * 0.55, 0, H);
      mist.addColorStop(0, 'rgba(0,0,0,0)');
      mist.addColorStop(1, palette.bg);
      ctx!.fillStyle = mist;
      ctx!.fillRect(0, H * 0.55, W, H * 0.45);

      const px = pointer.x;
      const py = pointer.y;

      // move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -10) n.x = W + 10;
        else if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10;
        else if (n.y > H + 10) n.y = -10;

        if (pointer.active) {
          const dx = n.x - px;
          const dy = n.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < R_INFLUENCE * R_INFLUENCE) {
            const d = Math.sqrt(d2) + 0.001;
            const f = 1 - d / R_INFLUENCE;
            n.x += (dx / d) * f * 1.6;
            n.y += (dy / d) * f * 1.6;
            n.x += -(dy / d) * f * 0.6;
            n.y += (dx / d) * f * 0.6;
          }
        }
        n.vx *= 0.997;
        n.vy *= 0.997;
      }

      // draw links
      const linkBase = palette.link;
      ctx!.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_LINK_DIST * MAX_LINK_DIST) {
            const d = Math.sqrt(d2);
            const t = 1 - d / MAX_LINK_DIST;
            let near = 0;
            if (pointer.active) {
              const mx = (a.x + b.x) * 0.5 - px;
              const my = (a.y + b.y) * 0.5 - py;
              const md2 = mx * mx + my * my;
              if (md2 < R_INFLUENCE * R_INFLUENCE) near = 1 - Math.sqrt(md2) / R_INFLUENCE;
            }
            const alpha = Math.min(1, t * 0.55 + near * 0.45);
            ctx!.strokeStyle =
              near > 0.05 ? mixWithGlow(linkBase, palette.glow, near * 0.85, alpha) : withAlpha(linkBase, alpha);
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // draw nodes
      for (const n of nodes) {
        let glowFactor = 0;
        if (pointer.active) {
          const dx = n.x - px;
          const dy = n.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < R_INFLUENCE * R_INFLUENCE) glowFactor = 1 - Math.sqrt(d2) / R_INFLUENCE;
        }
        const r = n.r * (n.bright ? 2.2 : 1) * (1 + glowFactor * 1.6);
        if (n.bright || glowFactor > 0.1) {
          const halo = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 6);
          halo.addColorStop(0, withAlpha(palette.glow, 0.85));
          halo.addColorStop(1, withAlpha(palette.glow, 0));
          ctx!.fillStyle = halo;
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, r * 6, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = withAlpha(palette.node, Math.min(1, 0.55 + glowFactor * 0.6));
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      rafId = requestAnimationFrame(step);
    }

    function onMove(e: MouseEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }
    function onLeave() {
      pointer.active = false;
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      pointer.x = t.clientX;
      pointer.y = t.clientY;
      pointer.active = true;
    }
    function onTouchEnd() {
      pointer.active = false;
    }
    function onScroll() {
      document.body.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6);
    }

    // Repaint palette when <html data-mode> changes (theme toggle)
    const mo = new MutationObserver(() => {
      palette = readPalette();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme'] });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });

    resize();
    step();

    return () => {
      cancelAnimationFrame(rafId);
      mo.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      <canvas id="plexus" ref={canvasRef} aria-hidden />
      <div className="hero-canvas-trap" />
    </>
  );
}
