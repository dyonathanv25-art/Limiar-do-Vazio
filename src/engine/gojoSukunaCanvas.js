// Motor de Animação Canvas 2D em JavaScript Puro
// Cena: Gojo Satoru vs. Ryomen Sukuna — Expansão de Domínio, Vazio Roxo e Mahoraga

export function createGojoSukunaEngine(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const state = {
    mode: options.mode || 'loop', // 'loop' | 'domain' | 'purple' | 'mahoraga'
    playing: true,
    speed: 1,
    time: 0,
    shake: 0,
    wheelAngle: 0,
    targetWheelAngle: 0,
    adaptCount: 0,
    lastAdaptTick: -1,
    particles: [],
    slashes: [],
    stars: Array.from({ length: 85 }, () => ({
      x: Math.random() * (W * 0.55),
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 18 + 8,
    })),
    onPhaseChange: options.onPhaseChange || null,
    onAdapt: options.onAdapt || null,
    currentLabel: '',
  };

  function spawnParticle(x, y, vx, vy, color, radius, life) {
    state.particles.push({ x, y, vx, vy, color, radius, life, maxLife: life });
  }

  function spawnSlash(x, y, angle, len, color) {
    state.slashes.push({
      x,
      y,
      angle,
      len,
      color,
      life: 0.28,
      maxLife: 0.28,
    });
  }

  function setLabel(label) {
    if (state.currentLabel !== label) {
      state.currentLabel = label;
      if (state.onPhaseChange) state.onPhaseChange(label);
    }
  }

  function triggerAdaptation() {
    state.targetWheelAngle += Math.PI / 4; // 45 graus (8 raios)
    state.adaptCount += 1;
    state.shake = Math.max(state.shake, 7);
    if (state.onAdapt) state.onAdapt(state.adaptCount);

    // Anel dourado de adaptação
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      spawnParticle(
        W * 0.72,
        H * 0.34,
        Math.cos(a) * 140,
        Math.sin(a) * 140,
        '#FBBF24',
        2.6,
        0.55
      );
    }
  }

  function getActivePhase() {
    if (state.mode !== 'loop') {
      return { phase: state.mode, t: state.time };
    }
    const cycle = state.time % 18;
    if (cycle < 6) return { phase: 'domain', t: cycle };
    if (cycle < 12) return { phase: 'mahoraga', t: cycle - 6 };
    return { phase: 'purple', t: cycle - 12 };
  }

  function drawGojo(x, y, pose, auraColor) {
    ctx.save();
    ctx.translate(x, y);

    // Aura energia amaldiçoada
    const grad = ctx.createRadialGradient(0, -30, 8, 0, -30, 78);
    grad.addColorStop(0, auraColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -30, 78, 0, Math.PI * 2);
    ctx.fill();

    // Corpo / Uniforme escuro
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-22, 46);
    ctx.lineTo(-16, -24);
    ctx.lineTo(16, -24);
    ctx.lineTo(22, 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gola alta
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-12, -34, 24, 14);

    // Cabeça
    ctx.fillStyle = '#F8E3D4';
    ctx.beginPath();
    ctx.arc(0, -48, 15, 0, Math.PI * 2);
    ctx.fill();

    // Olhos Seis Olhos (Six Eyes) brilhando em ciano
    ctx.fillStyle = '#38BDF8';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-5, -48, 2.3, 0, Math.PI * 2);
    ctx.arc(5, -48, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cabelo branco espetado do Gojo
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(-17, -50);
    ctx.lineTo(-22, -66);
    ctx.lineTo(-10, -63);
    ctx.lineTo(-8, -76);
    ctx.lineTo(0, -66);
    ctx.lineTo(8, -77);
    ctx.lineTo(12, -64);
    ctx.lineTo(23, -67);
    ctx.lineTo(17, -49);
    ctx.closePath();
    ctx.fill();

    // Braço / Sinal de Mão
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (pose === 'purple') {
      ctx.moveTo(12, -16);
      ctx.lineTo(38, -32);
    } else {
      ctx.moveTo(12, -18);
      ctx.lineTo(24, -40);
    }
    ctx.stroke();

    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#BAE6FD';
    ctx.textAlign = 'center';
    ctx.fillText('GOJO SATORU', 0, 66);
    ctx.restore();
  }

  function drawSukuna(x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Aura carmesim
    const grad = ctx.createRadialGradient(0, -30, 8, 0, -30, 82);
    grad.addColorStop(0, 'rgba(220, 38, 38, 0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -30, 82, 0, Math.PI * 2);
    ctx.fill();

    // Kimono / Manto
    ctx.fillStyle = '#18181B';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-24, 46);
    ctx.lineTo(-17, -24);
    ctx.lineTo(17, -24);
    ctx.lineTo(24, 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Faixa carmesim
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(-18, 6, 36, 9);

    // Cabeça
    ctx.fillStyle = '#F3D5C8';
    ctx.beginPath();
    ctx.arc(0, -48, 15, 0, Math.PI * 2);
    ctx.fill();

    // Marcas negras de Sukuna no rosto
    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, -55);
    ctx.lineTo(-5, -51);
    ctx.moveTo(8, -55);
    ctx.lineTo(5, -51);
    ctx.moveTo(-10, -42);
    ctx.lineTo(-6, -39);
    ctx.moveTo(10, -42);
    ctx.lineTo(6, -39);
    ctx.stroke();

    // Olhos vermelhos
    ctx.fillStyle = '#EF4444';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-5, -48, 2.2, 0, Math.PI * 2);
    ctx.arc(5, -48, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cabelo espetado rosado/escuro
    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.moveTo(-16, -51);
    ctx.lineTo(-19, -68);
    ctx.lineTo(-6, -63);
    ctx.lineTo(0, -75);
    ctx.lineTo(7, -63);
    ctx.lineTo(19, -68);
    ctx.lineTo(16, -51);
    ctx.closePath();
    ctx.fill();

    // Braços em sinal do Santuário
    ctx.strokeStyle = '#F3D5C8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.lineTo(-28, -32);
    ctx.moveTo(14, -18);
    ctx.lineTo(28, -32);
    ctx.stroke();

    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FCA5A5';
    ctx.textAlign = 'center';
    ctx.fillText('RYOMEN SUKUNA', 0, 66);
    ctx.restore();
  }

  function drawDharmaWheel(cx, cy, radius, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = '#FBBF24';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3.2;

    // Aro principal
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Centro
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();

    // 8 raios + pontas
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x1 = Math.cos(a) * (radius * 0.25);
      const y1 = Math.sin(a) * (radius * 0.25);
      const x2 = Math.cos(a) * (radius + 9);
      const y2 = Math.sin(a) * (radius + 9);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FDE68A';
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMahoraga(x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    const hover = Math.sin(t * 3) * 4;
    ctx.translate(0, hover);

    // Sombra de invocação no solo
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 62 - hover, 52, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo imponente pálido
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-34, 52);
    ctx.lineTo(-28, -36);
    ctx.lineTo(28, -36);
    ctx.lineTo(34, 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cabeça sem olhos com asas laterais
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.ellipse(0, -56, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Asas na cabeça
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(-14, -56);
    ctx.lineTo(-42, -74);
    ctx.lineTo(-28, -46);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(14, -56);
    ctx.lineTo(42, -74);
    ctx.lineTo(28, -46);
    ctx.closePath();
    ctx.fill();

    // Espada do Extermínio no braço esquerdo
    ctx.strokeStyle = '#FDE047';
    ctx.shadowColor = '#FACC15';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-30, -10);
    ctx.lineTo(-76, 16);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FDE68A';
    ctx.textAlign = 'center';
    ctx.fillText('MAHORAGA (ADAPTAÇÃO)', 0, 78 - hover);
    ctx.restore();

    // Roda de 8 Raios acima do Mahoraga
    drawDharmaWheel(x, y - 104 + hover, 26, state.wheelAngle);
  }

  function renderDomainClash(t) {
    setLabel('Expansão de Domínio: Vazio Ilimitado vs. Santuário Malevolente');

    const splitX = W * 0.5 + Math.sin(t * 4) * 14;

    // Lado Esquerdo: Vazio Ilimitado (Muryōkūsho)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, H);
    ctx.clip();

    const voidGrad = ctx.createRadialGradient(W * 0.22, H * 0.5, 20, W * 0.22, H * 0.5, W * 0.6);
    voidGrad.addColorStop(0, '#0F172A');
    voidGrad.addColorStop(0.5, '#070B19');
    voidGrad.addColorStop(1, '#020409');
    ctx.fillStyle = voidGrad;
    ctx.fillRect(0, 0, splitX, H);

    // Estrelas e anéis do infinito
    state.stars.forEach((s) => {
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + s.twinkle));
      ctx.fillStyle = `rgba(125, 211, 252, ${alpha})`;
      ctx.beginPath();
      ctx.arc((s.x + t * s.speed) % splitX, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let r = 1; r <= 3; r++) {
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.28 / r})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W * 0.24, H * 0.5, 85 * r + Math.sin(t * 2 + r) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Lado Direito: Santuário Malevolente (Fukuma Mizushi)
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, W - splitX, H);
    ctx.clip();

    const shrineGrad = ctx.createRadialGradient(W * 0.78, H * 0.5, 20, W * 0.78, H * 0.5, W * 0.6);
    shrineGrad.addColorStop(0, '#450A0A');
    shrineGrad.addColorStop(0.6, '#1A0507');
    shrineGrad.addColorStop(1, '#080203');
    ctx.fillStyle = shrineGrad;
    ctx.fillRect(splitX, 0, W - splitX, H);

    // Silhueta do Santuário ao fundo
    ctx.fillStyle = 'rgba(15, 5, 6, 0.9)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 2;
    const sx = W * 0.78;
    const sy = H * 0.56;
    // Telhado curvo Torii / Santuário
    ctx.beginPath();
    ctx.moveTo(sx - 130, sy - 65);
    ctx.quadraticCurveTo(sx, sy - 105, sx + 130, sy - 65);
    ctx.lineTo(sx + 100, sy - 48);
    ctx.lineTo(sx - 100, sy - 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(sx - 68, sy - 48, 18, 120);
    ctx.fillRect(sx + 50, sy - 48, 18, 120);
    ctx.restore();

    // Linha de choque entre os dois domínios
    ctx.save();
    ctx.strokeStyle = '#F8FAFC';
    ctx.shadowColor = '#A855F7';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let y = 0; y <= H; y += 16) {
      const jitter = Math.sin(y * 0.08 + t * 22) * 9;
      if (y === 0) ctx.moveTo(splitX + jitter, y);
      else ctx.lineTo(splitX + jitter, y);
    }
    ctx.stroke();
    ctx.restore();

    // Spawn partículas de choque e cortes do Santuário
    if (Math.random() < 0.45) {
      spawnSlash(
        splitX + Math.random() * 280,
        60 + Math.random() * (H - 120),
        (Math.random() - 0.5) * Math.PI,
        55 + Math.random() * 45,
        '#EF4444'
      );
      spawnParticle(
        splitX + (Math.random() - 0.5) * 16,
        Math.random() * H,
        (Math.random() - 0.5) * 90,
        (Math.random() - 0.5) * 90,
        Math.random() < 0.5 ? '#38BDF8' : '#EF4444',
        2.4,
        0.5
      );
    }

    drawGojo(W * 0.22, H * 0.62, 'domain', 'rgba(56, 189, 248, 0.55)');
    drawSukuna(W * 0.78, H * 0.62);
  }

  function renderHollowPurple(t) {
    const localT = t % 6;
    setLabel('Técnica Vazia: Vazio Roxo (200%)');

    // Fundo escuro com distorção violeta
    ctx.fillStyle = '#07040F';
    ctx.fillRect(0, 0, W, H);

    // Linhas de velocidade radiais
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.14)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + localT * 0.4;
      ctx.beginPath();
      ctx.moveTo(W * 0.24 + Math.cos(a) * 40, H * 0.5 + Math.sin(a) * 40);
      ctx.lineTo(W * 0.24 + Math.cos(a) * 700, H * 0.5 + Math.sin(a) * 700);
      ctx.stroke();
    }
    ctx.restore();

    drawGojo(W * 0.18, H * 0.62, 'purple', 'rgba(168, 85, 247, 0.55)');
    drawSukuna(W * 0.84, H * 0.62);

    const originX = W * 0.3;
    const originY = H * 0.52;

    if (localT < 2.2) {
      // Fase 1: Azul + Vermelho girando para colidir
      const progress = localT / 2.2;
      const orbitR = 75 * (1 - progress);
      const ang = localT * 7;

      // Azul (Ao)
      const bx = originX + Math.cos(ang) * orbitR;
      const by = originY + Math.sin(ang) * orbitR;
      ctx.fillStyle = '#38BDF8';
      ctx.shadowColor = '#0EA5E9';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(bx, by, 18, 0, Math.PI * 2);
      ctx.fill();

      // Vermelho (Aka)
      const rx = originX + Math.cos(ang + Math.PI) * orbitR;
      const ry = originY + Math.sin(ang + Math.PI) * orbitR;
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = '#DC2626';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(rx, ry, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Fase 2: Detonação e Feixe Vazio Roxo!
      const fireT = localT - 2.2;
      const beamX = Math.min(W * 1.1, originX + fireT * 420);
      state.shake = Math.max(state.shake, 5);

      // Feixe contínuo roxo
      const beamGrad = ctx.createLinearGradient(originX, originY - 58, originX, originY + 58);
      beamGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
      beamGrad.addColorStop(0.25, 'rgba(147, 51, 234, 0.85)');
      beamGrad.addColorStop(0.5, '#F5D0FE');
      beamGrad.addColorStop(0.75, 'rgba(147, 51, 234, 0.85)');
      beamGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(originX, originY - 58, Math.max(0, beamX - originX), 116);

      // Esfera principal do Vazio Roxo
      ctx.save();
      ctx.shadowColor = '#C084FC';
      ctx.shadowBlur = 35;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(beamX, originY, 44 + Math.sin(fireT * 20) * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(beamX, originY, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (Math.random() < 0.7) {
        spawnParticle(
          beamX,
          originY + (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 180,
          (Math.random() - 0.5) * 180,
          '#C084FC',
          3.2,
          0.45
        );
      }
    }
  }

  function renderMahoragaScene(t) {
    setLabel('Invocação de Mahoraga · Roda da Adaptação');

    // Fundo sombrio com tintas de sombra das Dez Sombras
    const bg = ctx.createRadialGradient(W * 0.72, H * 0.55, 30, W * 0.72, H * 0.55, W * 0.75);
    bg.addColorStop(0, '#271A0C');
    bg.addColorStop(0.5, '#120D14');
    bg.addColorStop(1, '#07080D');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Gatilho periódico de rotação da Roda (CLACK!)
    const adaptStep = Math.floor(t / 1.8);
    if (adaptStep !== state.lastAdaptTick) {
      state.lastAdaptTick = adaptStep;
      triggerAdaptation();
    }

    // Disparos azuis de Gojo sendo neutralizados pela adaptação
    const projX = W * 0.24 + ((t * 280) % (W * 0.45));
    ctx.save();
    ctx.fillStyle = '#38BDF8';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(projX, H * 0.52, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Escudo dourado de adaptação ao redor de Mahoraga
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W * 0.72, H * 0.55, 86 + Math.sin(t * 5) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawGojo(W * 0.2, H * 0.62, 'purple', 'rgba(56, 189, 248, 0.5)');
    drawSukuna(W * 0.87, H * 0.64);
    drawMahoraga(W * 0.68, H * 0.56, t);
  }

  let rafId = 0;
  let lastNow = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - lastNow) / 1000) * state.speed;
    lastNow = now;

    if (state.playing) {
      state.time += dt;
      state.wheelAngle += (state.targetWheelAngle - state.wheelAngle) * Math.min(1, dt * 10);
      state.shake = Math.max(0, state.shake - dt * 16);

      state.particles = state.particles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });

      state.slashes = state.slashes.filter((s) => {
        s.life -= dt;
        return s.life > 0;
      });
    }

    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate(
        (Math.random() - 0.5) * state.shake * 2,
        (Math.random() - 0.5) * state.shake * 2
      );
    }

    const active = getActivePhase();
    if (active.phase === 'domain') {
      renderDomainClash(active.t);
    } else if (active.phase === 'purple') {
      renderHollowPurple(active.t);
    } else {
      renderMahoragaScene(active.t);
    }

    // Desenhar cortes (Desmantelar/Clivar)
    state.slashes.forEach((s) => {
      const alpha = s.life / s.maxLife;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-s.len / 2, 0);
      ctx.lineTo(s.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    });

    // Desenhar partículas
    state.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    setMode(mode) {
      state.mode = mode;
      state.time = 0;
      state.lastAdaptTick = -1;
    },
    setPlaying(playing) {
      state.playing = playing;
    },
    setSpeed(speed) {
      state.speed = speed;
    },
    triggerAdaptation,
    destroy() {
      cancelAnimationFrame(rafId);
    },
  };
}
