import React, { useEffect, useRef, useState } from 'react';
import { createGojoSukunaEngine } from '../engine/gojoSukunaCanvas.js';
import engineSourceRaw from '../engine/gojoSukunaCanvas.js?raw';
import { soundEngine } from '../utils/sound';
import { Play, Pause, Copy, Check, RotateCw, Volume2, VolumeX, Code2 } from 'lucide-react';

type SceneMode = 'loop' | 'domain' | 'purple' | 'mahoraga';

const STANDALONE_HTML_WRAPPER = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Gojo vs Sukuna - Expansão de Domínio, Vazio Roxo e Mahoraga</title>
  <style>
    body { margin: 0; background: #07090e; display: grid; place-items: center; min-height: 100vh; font-family: sans-serif; color: #fff; }
    canvas { max-width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); }
    .controls { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    button { padding: 8px 14px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; cursor: pointer; }
  </style>
</head>
<body>
  <canvas id="jujutsuCanvas" width="960" height="480"></canvas>
  <div class="controls">
    <button onclick="engine.setMode('loop')">Loop Completo (GIF)</button>
    <button onclick="engine.setMode('domain')">Choque de Domínios</button>
    <button onclick="engine.setMode('purple')">Vazio Roxo</button>
    <button onclick="engine.setMode('mahoraga')">Mahoraga</button>
    <button onclick="engine.triggerAdaptation()">Girar Roda (Adaptação)</button>
  </div>
  <script type="module">
${engineSourceRaw.replace('export function createGojoSukunaEngine', 'function createGojoSukunaEngine')}

const canvas = document.getElementById('jujutsuCanvas');
window.engine = createGojoSukunaEngine(canvas, { mode: 'loop' });
  </script>
</body>
</html>`;

export const JujutsuCanvasView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ReturnType<typeof createGojoSukunaEngine> | null>(null);

  const [mode, setMode] = useState<SceneMode>('loop');
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(soundEngine.muted);
  const [phaseLabel, setPhaseLabel] = useState(
    'Expansão de Domínio: Vazio Ilimitado vs. Santuário Malevolente'
  );
  const [adaptCount, setAdaptCount] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    soundEngine.muted = muted;
  }, [muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createGojoSukunaEngine(canvas, {
      mode: 'loop',
      onPhaseChange: (label: string) => {
        setPhaseLabel(label);
        if (!soundEngine.muted) {
          if (label.includes('Vazio Roxo')) soundEngine.playParadox();
          else if (label.includes('Mahoraga')) soundEngine.playBossWarn();
          else soundEngine.playCast();
        }
      },
      onAdapt: (count: number) => {
        setAdaptCount(count);
        if (!soundEngine.muted) soundEngine.playParry();
      },
    });

    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleSelectMode = (nextMode: SceneMode) => {
    setMode(nextMode);
    engineRef.current?.setMode(nextMode);
    if (!playing) {
      setPlaying(true);
      engineRef.current?.setPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    const next = !playing;
    setPlaying(next);
    engineRef.current?.setPlaying(next);
  };

  const handleSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    engineRef.current?.setSpeed(nextSpeed);
  };

  const handleTriggerAdapt = () => {
    if (mode !== 'mahoraga' && mode !== 'loop') {
      handleSelectMode('mahoraga');
    }
    engineRef.current?.triggerAdaptation();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(STANDALONE_HTML_WRAPPER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowCode(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-[#131822] rounded-xl px-5 py-3.5">
        <div>
          <div className="text-xs text-slate-400">
            JavaScript Canvas 2D · 60 FPS · Adaptações da Roda:{' '}
            <span className="font-mono tabular-nums text-[#FBBF24]">{adaptCount}</span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-100 mt-0.5">
            {phaseLabel}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-[#1A202E] text-slate-100 hover:border-white/25 whitespace-nowrap shrink-0"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pausar' : 'Continuar'}
          </button>

          <button
            type="button"
            onClick={handleTriggerAdapt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/40 bg-[#1F180D] text-amber-200 hover:border-amber-400 whitespace-nowrap shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Girar Roda (Mahoraga)
          </button>

          <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-lg border border-white/10">
            {[0.5, 1, 1.5].map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => handleSpeed(sp)}
                className={`px-2 py-1 text-xs font-mono tabular-nums rounded-md transition-colors ${
                  speed === sp
                    ? 'bg-[#1A202E] text-[#F5E6C4]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-[#1A202E] text-slate-200 hover:border-white/25 whitespace-nowrap shrink-0"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#D4A853]" />}
            {muted ? 'Som Off' : 'Som On'}
          </button>

          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-[#1A202E] text-slate-200 hover:border-white/25 whitespace-nowrap shrink-0"
          >
            <Code2 className="w-3.5 h-3.5 text-[#C084FC]" />
            {showCode ? 'Ocultar Código' : 'Ver Código JS'}
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar JS'}
          </button>
        </div>
      </div>

      <div className="border border-white/10 bg-[#07090E] rounded-xl overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={960} height={480} className="w-full h-auto block" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { id: 'loop' as const, label: 'Loop GIF Completo', desc: 'Alterna automaticamente entre Domínios, Mahoraga e Vazio Roxo.' },
          { id: 'domain' as const, label: 'Choque de Domínios', desc: 'Vazio Ilimitado vs. Santuário Malevolente colidindo no centro.' },
          { id: 'purple' as const, label: 'Vazio Roxo (200%)', desc: 'Azul e Vermelho se fundem no feixe violeta devastador.' },
          { id: 'mahoraga' as const, label: 'Mahoraga · Adaptação', desc: 'Invocação com a Roda de 8 Raios girando a cada ataque.' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelectMode(item.id)}
            className={`p-4 rounded-xl border text-left transition-colors ${
              mode === item.id
                ? 'bg-[#1A202E] border-[#C084FC]'
                : 'bg-[#131822] border-white/10 hover:border-white/25'
            }`}
          >
            <div className="font-display text-sm font-bold text-slate-100">{item.label}</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
          </button>
        ))}
      </div>

      {showCode && (
        <div className="border border-white/10 bg-[#131822] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-display text-base font-bold text-[#F5E6C4]">
              Código Completo em HTML + JavaScript Puro
            </h3>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Tudo'}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-[#080A0F] border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto max-h-[360px]">
            <code>{STANDALONE_HTML_WRAPPER}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
