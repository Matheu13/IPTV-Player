import React, { useEffect, useRef } from 'react';

interface SportsCanvasStreamProps {
  slotIndex: number;
  channelName: string;
  isFocused: boolean;
  resolution: string;
  bitrateKbps: number;
  fps: number;
}

export const SportsCanvasStream: React.FC<SportsCanvasStreamProps> = ({
  slotIndex,
  channelName,
  isFocused,
  resolution,
  bitrateKbps,
  fps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frameCount = 0;
    const startTime = Date.now();

    // Sport-specific properties based on slot index
    const sportTypes = [
      { name: 'FOOTBALL (PREMIER LEAGUE)', home: 'ARS', away: 'CHE', scoreH: 2, scoreA: 1, colorA: '#dc2626', colorB: '#2563eb' },
      { name: 'FOOTBALL (CHAMPIONS LEAGUE)', home: 'RMA', away: 'MCY', scoreH: 3, scoreA: 3, colorA: '#facc15', colorB: '#0284c7' },
      { name: 'BASKETBALL (NBA LIVE)', home: 'LAL', away: 'GSW', scoreH: 104, scoreA: 98, colorA: '#9333ea', colorB: '#eab308' },
      { name: 'TENNIS (GRAND SLAM)', home: 'ALCARAZ', away: 'SINNER', scoreH: '2 (6)', scoreA: '1 (4)', colorA: '#16a34a', colorB: '#ea580c' },
    ];

    const sport = sportTypes[slotIndex % sportTypes.length];

    const render = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      const elapsedSec = (Date.now() - startTime) / 1000;
      const gameMinutes = Math.floor(45 + (elapsedSec % 45));
      const gameSeconds = Math.floor((elapsedSec * 60) % 60);

      // 1. Draw Sport Field / Court Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      if (slotIndex % 4 === 0 || slotIndex % 4 === 1) {
        // Football Pitch
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, w, h);

        // Grass stripes
        ctx.fillStyle = '#065f46';
        const stripeW = w / 8;
        for (let i = 0; i < 8; i += 2) {
          ctx.fillRect(i * stripeW, 0, stripeW, h);
        }

        // Pitch Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        // Outer box
        ctx.strokeRect(15, 15, w - 30, h - 30);
        // Center line
        ctx.beginPath();
        ctx.moveTo(w / 2, 15);
        ctx.lineTo(w / 2, h - 15);
        ctx.stroke();
        // Center circle
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.18, 0, Math.PI * 2);
        ctx.stroke();

        // Moving Football
        const ballX = w / 2 + Math.sin(elapsedSec * 1.8 + slotIndex) * (w * 0.35);
        const ballY = h / 2 + Math.cos(elapsedSec * 2.3 + slotIndex) * (h * 0.28);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Player dots
        const p1X = ballX - 12 * Math.sin(elapsedSec * 2);
        const p1Y = ballY - 8 * Math.cos(elapsedSec * 2);
        ctx.fillStyle = sport.colorA;
        ctx.beginPath();
        ctx.arc(p1X, p1Y, 5, 0, Math.PI * 2);
        ctx.fill();

        const p2X = ballX + 14 * Math.cos(elapsedSec * 2);
        const p2Y = ballY + 10 * Math.sin(elapsedSec * 2);
        ctx.fillStyle = sport.colorB;
        ctx.beginPath();
        ctx.arc(p2X, p2Y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (slotIndex % 4 === 2) {
        // Basketball Court
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(15, 15, w - 30, h - 30);
        ctx.beginPath();
        ctx.moveTo(w / 2, 15);
        ctx.lineTo(w / 2, h - 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 25, 0, Math.PI * 2);
        ctx.stroke();

        // Basketball arc
        const bX = w / 2 + Math.sin(elapsedSec * 2.5) * (w * 0.3);
        const bY = h / 2 + Math.abs(Math.sin(elapsedSec * 4)) * -25 + 10;
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(bX, bY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Tennis Court (Blue hard court)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(20, 20, w - 40, h - 40);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(20, 20, w - 40, h - 40);
        ctx.beginPath();
        ctx.moveTo(20, h / 2);
        ctx.lineTo(w - 20, h / 2);
        ctx.stroke();

        // Tennis ball
        const tX = w / 2 + Math.sin(elapsedSec * 3) * (w * 0.35);
        const tY = h / 2 + Math.sin(elapsedSec * 6) * 20;
        ctx.fillStyle = '#ccff00';
        ctx.beginPath();
        ctx.arc(tX, tY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Scanline overlay effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // 3. Live Scoreboard Top Bar
      const bannerH = 22;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(8, 8, w - 16, bannerH);
      ctx.strokeStyle = isFocused ? '#6366f1' : '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, w - 16, bannerH);

      // Score text
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${sport.home} ${sport.scoreH} - ${sport.scoreA} ${sport.away}`, 14, 22);

      // Clock
      const timeStr = `${String(gameMinutes).padStart(2, '0')}:${String(gameSeconds).padStart(2, '0')}`;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(timeStr, w - 60, 22);

      // 4. Live Badge & Channel Watermark
      ctx.fillStyle = isFocused ? '#10b981' : '#64748b';
      ctx.beginPath();
      ctx.arc(w - 70, 20, 3, 0, Math.PI * 2);
      ctx.fill();

      // Audio waveform animation when focused
      if (isFocused) {
        ctx.fillStyle = '#10b981';
        for (let i = 0; i < 5; i++) {
          const barH = 3 + Math.sin(elapsedSec * 8 + i) * 5;
          ctx.fillRect(w - 110 + i * 4, 22 - barH, 2.5, barH);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [slotIndex, isFocused]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden rounded">
      <canvas
        ref={canvasRef}
        width={480}
        height={270}
        className="w-full h-full object-cover block"
      />
    </div>
  );
};
