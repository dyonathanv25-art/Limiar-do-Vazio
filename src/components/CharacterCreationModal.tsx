import React, { useState } from 'react';
import { BaseClassId } from '../types/game';
import { BASE_CLASSES } from '../data/classes';
import { SKINS } from '../data/skins';
import { getAbilityById } from '../data/abilities';
import { Swords, Sparkles } from 'lucide-react';

interface CharacterCreationModalProps {
  onCreateCharacter: (
    name: string,
    baseClassId: BaseClassId,
    sandboxMode: boolean,
    skinId: string
  ) => void;
  onCancel?: () => void;
}

export const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({
  onCreateCharacter,
  onCancel,
}) => {
  const [name, setName] = useState('Kaelen');
  const [selectedClassId, setSelectedClassId] = useState<BaseClassId>('guerreiro');
  const [sandboxMode, setSandboxMode] = useState(false);
  const [selectedSkinId, setSelectedSkinId] = useState<string>('viajante_ferro');

  const selectedClass =
    BASE_CLASSES.find((c) => c.id === selectedClassId) ?? BASE_CLASSES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Viajante';
    onCreateCharacter(cleanName, selectedClassId, sandboxMode, selectedSkinId);
  };

  return (
    <div className="max-w-4xl mx-auto border border-white/10 bg-[#131822] rounded-xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#D4A853]">
            Criação de Personagem · Nível 1 · Aeldrin
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
            Desperte Seu Viajante Marcado
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Comece do zero no Nível 1 enfrentando monstros iniciais, ganhe XP para distribuir pontos em seus atributos e desbloqueie novas habilidades e subclasses conforme evolui.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-white/10"
          >
            Voltar ao Jogo
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name & Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="char-name" className="block text-xs font-medium text-slate-300">
              Nome do Personagem
            </label>
            <input
              id="char-name"
              type="text"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome do herói..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-white/15 text-sm text-slate-100 focus:outline-none focus:border-[#D4A853]"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-300">Modo de Progressão</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSandboxMode(false)}
                className={`px-3 py-2.5 text-xs font-medium rounded-xl border text-left transition-colors ${
                  !sandboxMode
                    ? 'bg-[#1A202E] border-[#D4A853] text-[#F5E6C4]'
                    : 'bg-[#0B0E14] border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">Do Zero (Nv. 1)</div>
                <div className="text-[11px] opacity-80">Desbloquear tudo jogando</div>
              </button>
              <button
                type="button"
                onClick={() => setSandboxMode(true)}
                className={`px-3 py-2.5 text-xs font-medium rounded-xl border text-left transition-colors ${
                  sandboxMode
                    ? 'bg-[#1C122B] border-[#C084FC] text-[#F3E8FF]'
                    : 'bg-[#0B0E14] border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">Modo Livre</div>
                <div className="text-[11px] opacity-80">Testar todas 300 skills</div>
              </button>
            </div>
          </div>
        </div>

        {/* 5 Base Classes */}
        <div className="space-y-2.5">
          <span className="block text-xs font-medium text-slate-300">
            Escolha Sua Classe Inicial (5 Clássicas)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {BASE_CLASSES.map((bc) => {
              const active = bc.id === selectedClassId;
              return (
                <button
                  key={bc.id}
                  type="button"
                  onClick={() => setSelectedClassId(bc.id)}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    active
                      ? 'bg-[#1A202E] border-[#D4A853]'
                      : 'bg-[#0B0E14] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-slate-100">
                      {bc.name}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: bc.accentColor }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{bc.title}</div>
                  <div className="text-[11px] text-[#D4A853] mt-1.5">{bc.resource}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Class Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-xl bg-[#0B0E14] border border-white/10">
          <div className="space-y-3">
            <h3 className="font-display text-lg font-bold text-[#F5E6C4]">
              {selectedClass.name} · {selectedClass.role}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedClass.description}</p>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 font-mono tabular-nums text-xs">
              <div>
                <div className="text-slate-500 text-[10px]">FOR</div>
                <div className="text-slate-100 font-semibold">{selectedClass.starterStats.str}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">INT</div>
                <div className="text-slate-100 font-semibold">{selectedClass.starterStats.int}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">AGI</div>
                <div className="text-slate-100 font-semibold">{selectedClass.starterStats.agi}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">VIT</div>
                <div className="text-slate-100 font-semibold">{selectedClass.starterStats.vit}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4A853]">
              <Sparkles className="w-3.5 h-3.5" />
              Habilidades Iniciais (Nível 1)
            </div>
            <div className="space-y-2">
              {selectedClass.starterSkillIds.map((sid) => {
                const ab = getAbilityById(sid);
                if (!ab) return null;
                return (
                  <div
                    key={sid}
                    className="p-2.5 rounded-lg bg-[#131822] border border-white/10 text-xs"
                  >
                    <div className="font-semibold text-slate-100">{ab.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{ab.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Starting 3D Skin Selector */}
        <div className="space-y-2.5">
          <span className="block text-xs font-medium text-slate-300">
            Skin Inicial em 3D {sandboxMode ? '(Todas liberadas no Modo Livre)' : '(Mais skins desbloqueiam com Nível e Ouro)'}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SKINS.slice(0, sandboxMode ? SKINS.length : 4).map((sk) => {
              const locked = !sandboxMode && sk.unlockLevel > 1;
              const chosen = selectedSkinId === sk.id;
              return (
                <button
                  key={sk.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedSkinId(sk.id)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    chosen
                      ? 'bg-[#1A202E] border-[#D4A853]'
                      : locked
                        ? 'bg-[#0B0E14]/50 border-white/5 text-slate-600 cursor-not-allowed'
                        : 'bg-[#0B0E14] border-white/10 hover:border-white/25 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: sk.primaryColor }} />
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: sk.trimColor }} />
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: sk.glowColor }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-100 truncate">{sk.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {locked ? `Desbloqueia Nv. ${sk.unlockLevel}` : 'Disponível'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            {sandboxMode ? 'Entrar na Arena 3D (Modo Livre)' : 'Começar Jornada no Nível 1'}
          </button>
        </div>
      </form>
    </div>
  );
};
