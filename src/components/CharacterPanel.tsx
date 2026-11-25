import React from 'react';
import {
  BaseClassInfo,
  CharacterAttributes,
  CharacterProfile,
  SubclassInfo,
} from '../types/game';
import { computeDerivedStats, getXpForNextLevel } from '../utils/progression';
import { Plus, RotateCcw, Sparkles, Lock, Unlock } from 'lucide-react';

interface CharacterPanelProps {
  character: CharacterProfile;
  baseClass: BaseClassInfo;
  subclass: SubclassInfo | null;
  onAllocateStat: (stat: keyof CharacterAttributes) => void;
  onResetCharacter: () => void;
  onToggleSandbox: () => void;
  onGoToClasses: () => void;
}

const STAT_META: {
  key: keyof CharacterAttributes;
  label: string;
  desc: string;
}[] = [
  { key: 'str', label: 'Força (FOR)', desc: '+4,5 Ataque · +8 HP Máx' },
  { key: 'int', label: 'Inteligência (INT)', desc: '+4,5 Poder Mágico/Cura · +5 Recurso' },
  { key: 'agi', label: 'Agilidade (AGI)', desc: '+2,5 Ataque · +1,2% Crítico · +Velocidade' },
  { key: 'vit', label: 'Vitalidade (VIT)', desc: '+28 HP Máx · +2,2 Defesa' },
];

const MILESTONES = [
  { lvl: 1, text: 'Classe Base + 2 Habilidades Comuns iniciais' },
  { lvl: 2, text: 'Desbloqueio das demais Habilidades Comuns (Nv. 2–5)' },
  { lvl: 6, text: 'Habilidades Evolutivas da Classe' },
  { lvl: 8, text: 'Habilidades Raras táticas' },
  { lvl: 10, text: 'Especialização: Escolha uma das Subclasses Padrão' },
  { lvl: 16, text: 'Habilidades Lendárias de Raid' },
  { lvl: 26, text: 'Habilidades Míticas dos Pilares' },
  { lvl: 35, text: 'Habilidades Quebra-Jogo / Paradoxais (291–300)' },
];

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  character,
  baseClass,
  subclass,
  onAllocateStat,
  onResetCharacter,
  onToggleSandbox,
  onGoToClasses,
}) => {
  const xpNeeded = getXpForNextLevel(character.level);
  const xpPct = Math.min(100, Math.round((character.xp / xpNeeded) * 100));
  const derived = computeDerivedStats(baseClass, subclass, character);

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="border border-white/10 bg-[#131822] rounded-xl p-6 flex flex-wrap items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-[#D4A853] font-semibold">
              Nível {character.level}
            </span>
            <span aria-hidden="true">·</span>
            <span>{baseClass.name}</span>
            <span aria-hidden="true">·</span>
            <span className={subclass?.isSecret ? 'text-[#C084FC]' : 'text-slate-200'}>
              {subclass ? subclass.name : 'Sem Subclasse (Desbloqueia no Nv. 10)'}
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
            {character.name}
          </h2>
          <div className="w-full max-w-md pt-1">
            <div className="flex justify-between text-xs font-mono tabular-nums text-slate-400 mb-1">
              <span>XP</span>
              <span>
                {character.xp} / {xpNeeded} ({xpPct}%)
              </span>
            </div>
            <div className="h-2.5 bg-[#0B0E14] rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-[#D4A853] transition-all duration-200"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-lg bg-[#0B0E14] border border-white/10 font-mono tabular-nums text-xs">
            <span className="text-slate-400">Ouro: </span>
            <span className="text-[#F5E6C4] font-semibold">{character.gold}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-[#0B0E14] border border-white/10 font-mono tabular-nums text-xs">
            <span className="text-slate-400">Pontos de Habilidade: </span>
            <span className="text-sky-400 font-semibold">{character.skillPoints}</span>
          </div>
          <button
            type="button"
            onClick={onToggleSandbox}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
              character.sandboxMode
                ? 'bg-[#1E1430] border-[#C084FC] text-[#F3E8FF]'
                : 'bg-[#0B0E14] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            {character.sandboxMode ? 'Modo Livre: Ativo' : 'Modo Campanha (Do Zero)'}
          </button>
          <button
            type="button"
            onClick={onResetCharacter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-white/10 bg-[#1A202E] text-slate-200 hover:border-rose-400/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Novo Personagem
          </button>
        </div>
      </div>

      {/* Main Grid: Attribute Allocation + Derived Stats + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attribute Points Allocator */}
        <div className="lg:col-span-6 border border-white/10 bg-[#131822] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-100">
                Atributos do Viajante
              </h3>
              <p className="text-xs text-slate-400">
                Subir de nível concede +3 Pontos de Atributo e +1 Ponto de Habilidade.
              </p>
            </div>
            <div className="font-mono tabular-nums text-xs px-3 py-1.5 rounded-lg bg-[#1A202E] border border-[#D4A853]/40 text-[#F5E6C4]">
              Disponíveis: <strong>{character.statPoints}</strong>
            </div>
          </div>

          <div className="space-y-3">
            {STAT_META.map((st) => (
              <div
                key={st.key}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0B0E14] border border-white/10"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-100">{st.label}</div>
                  <div className="text-xs text-slate-400">{st.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-lg font-bold text-[#F5E6C4]">
                    {character.attributes[st.key]}
                  </span>
                  <button
                    type="button"
                    disabled={character.statPoints <= 0}
                    onClick={() => onAllocateStat(st.key)}
                    aria-label={`Aumentar ${st.label}`}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${
                      character.statPoints > 0
                        ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] cursor-pointer'
                        : 'bg-[#131822] border-white/10 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derived Combat Stats & Subclass Unlock Progress */}
        <div className="lg:col-span-6 space-y-5">
          <div className="border border-white/10 bg-[#131822] rounded-xl p-5 space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-100">
              Atributos de Combate Calculados
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono tabular-nums">
              <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10">
                <div className="text-[11px] text-slate-400">Vida Máxima</div>
                <div className="text-base font-bold text-emerald-400">{derived.maxHp}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10">
                <div className="text-[11px] text-slate-400">{baseClass.resource} Máx</div>
                <div className="text-base font-bold text-sky-400">{derived.maxResource}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10">
                <div className="text-[11px] text-slate-400">Poder de Ataque</div>
                <div className="text-base font-bold text-[#F5E6C4]">{derived.attackPower}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10">
                <div className="text-[11px] text-slate-400">Defesa</div>
                <div className="text-base font-bold text-slate-100">{derived.defense}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10">
                <div className="text-[11px] text-slate-400">Taxa Crítica</div>
                <div className="text-base font-bold text-amber-400">
                  {Math.round(derived.critChance * 100)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10">
                <div className="text-[11px] text-slate-400">Velocidade</div>
                <div className="text-base font-bold text-slate-100">{derived.moveSpeed}</div>
              </div>
            </div>

            {character.level >= 10 && !subclass && (
              <div className="p-4 rounded-xl bg-[#1A202E] border border-[#D4A853] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#D4A853] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Nível 10 Alcançado!
                  </div>
                  <div className="text-xs text-slate-200">
                    Você já pode escolher uma Subclasse para {baseClass.name}.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onGoToClasses}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] whitespace-nowrap shrink-0"
                >
                  Escolher Subclasse
                </button>
              </div>
            )}
          </div>

          {/* Progression Milestones */}
          <div className="border border-white/10 bg-[#131822] rounded-xl p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-slate-100">
              Trilha de Desbloqueio de Classes e Habilidades
            </h3>
            <div className="space-y-2">
              {MILESTONES.map((m) => {
                const unlocked = character.sandboxMode || character.level >= m.lvl;
                return (
                  <div
                    key={m.lvl}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs ${
                      unlocked
                        ? 'bg-[#0B0E14] border-emerald-500/30 text-slate-200'
                        : 'bg-[#0B0E14]/50 border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {unlocked ? (
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span>{m.text}</span>
                    </div>
                    <span className="font-mono tabular-nums shrink-0">Nv. {m.lvl}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
