import React, { useMemo, useState } from 'react';
import {
  AbilityTier,
  BaseClassId,
  BaseClassInfo,
  CharacterProfile,
  SubclassInfo,
} from '../types/game';
import { ABILITIES } from '../data/abilities';
import {
  canLearnAbility,
  getAbilityLevelRequirement,
  isAbilityUnlockedForCharacter,
} from '../utils/progression';
import { Search, Check, Sparkles, Lock, Unlock } from 'lucide-react';

interface GrimoireViewProps {
  character: CharacterProfile;
  activeBaseClass: BaseClassInfo;
  activeSubclass: SubclassInfo | null;
  targetSlotIndex: number | null;
  onSelectTargetSlot: (idx: number | null) => void;
  onEquipSkillToSlot: (slotIdx: number, skillId: number) => void;
  onUnlockSkill: (skillId: number) => void;
  onToggleSandbox: () => void;
}

const TIERS: ('Todas' | AbilityTier)[] = [
  'Todas',
  'Comum',
  'Evolutiva',
  'Rara',
  'Lendária',
  'Mítica',
  'Secreta',
  'Quebra-Jogo',
];

const CLASS_FILTERS: ('Todas' | BaseClassId | 'Híbrida' | 'Paradoxal')[] = [
  'Todas',
  'guerreiro',
  'mago',
  'ladino',
  'arqueiro',
  'clerigo',
  'Híbrida',
  'Paradoxal',
];

const CLASS_NAMES: Record<string, string> = {
  Todas: 'Todas',
  guerreiro: 'Guerreiro',
  mago: 'Mago',
  ladino: 'Ladino',
  arqueiro: 'Arqueiro',
  clerigo: 'Clérigo',
  Híbrida: 'Híbrida',
  Paradoxal: 'Paradoxal',
};

export const GrimoireView: React.FC<GrimoireViewProps> = ({
  character,
  activeBaseClass,
  activeSubclass,
  targetSlotIndex,
  onSelectTargetSlot,
  onEquipSkillToSlot,
  onUnlockSkill,
  onToggleSandbox,
}) => {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'Todas' | AbilityTier>('Todas');
  const [classFilter, setClassFilter] = useState<string>('Todas');
  const [onlyMyClass, setOnlyMyClass] = useState(false);
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);

  const activeSlot = targetSlotIndex ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ABILITIES.filter((ab) => {
      if (tierFilter !== 'Todas' && ab.tier !== tierFilter) return false;
      if (classFilter !== 'Todas' && ab.baseClass !== classFilter) return false;
      if (
        onlyMyClass &&
        ab.baseClass !== character.baseClassId &&
        ab.baseClass !== 'Híbrida' &&
        ab.baseClass !== 'Paradoxal'
      ) {
        return false;
      }
      if (onlyUnlocked && !isAbilityUnlockedForCharacter(ab, character)) {
        return false;
      }
      if (!q) return true;
      return (
        ab.name.toLowerCase().includes(q) ||
        ab.description.toLowerCase().includes(q) ||
        ab.classLabel.toLowerCase().includes(q) ||
        String(ab.id).includes(q)
      );
    });
  }, [search, tierFilter, classFilter, onlyMyClass, onlyUnlocked, character]);

  const tierCounts = useMemo(() => {
    const map: Record<string, number> = { Todas: ABILITIES.length };
    ABILITIES.forEach((a) => {
      map[a.tier] = (map[a.tier] ?? 0) + 1;
    });
    return map;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Active 6-Slot Bar */}
      <div className="border-b border-white/10 pb-5 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-1.5">
            <p className="text-xs font-medium text-[#D4A853]">
              Grimório Progressivo · Nível {character.level} ({activeBaseClass.name}) · 300 Habilidades
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
              Grimório das 300 Habilidades
            </h2>
            <p className="text-sm text-slate-300">
              Desbloqueie novas habilidades usando Pontos de Habilidade (PH) ao subir de nível e equipe até 6 na barra da Arena.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 font-mono tabular-nums text-xs">
            <div className="px-3 py-2 rounded-lg bg-[#131822] border border-white/10 text-slate-300">
              PH Disponíveis:{' '}
              <span className="text-sky-400 font-bold">{character.skillPoints}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#131822] border border-white/10 text-slate-300">
              Desbloqueadas:{' '}
              <span className="text-[#F5E6C4] font-bold">
                {character.sandboxMode ? 300 : character.unlockedSkillIds.length} / 300
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleSandbox}
              className={`px-3 py-2 rounded-lg border font-sans font-medium transition-colors cursor-pointer ${
                character.sandboxMode
                  ? 'bg-[#1E1430] border-[#C084FC] text-[#F3E8FF]'
                  : 'bg-[#131822] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              {character.sandboxMode ? 'Modo Livre: Ativo' : 'Campanha (Do Zero)'}
            </button>
          </div>
        </div>

        {/* 6-Slot Quick Equip Target Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {character.equippedSkillIds.map((sid, idx) => {
            const ab = sid > 0 ? ABILITIES.find((a) => a.id === sid) : undefined;
            const selected = activeSlot === idx;
            return (
              <button
                key={`slot-${idx}`}
                type="button"
                onClick={() => onSelectTargetSlot(idx)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  selected
                    ? 'bg-[#1A202E] border-[#D4A853]'
                    : 'bg-[#131822] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={selected ? 'text-[#D4A853] font-semibold' : 'text-slate-400'}>
                    Slot {idx + 1}
                  </span>
                  <span className="text-slate-500">
                    {sid > 0 ? `#${String(sid).padStart(3, '0')}` : '—'}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-100 truncate mt-1">
                  {ab?.name ?? 'Slot Vazio'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {ab?.tier ?? 'Clique para equipar'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar habilidade por nome, efeito, classe ou número (ex: Golpe, 291, Veneno)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#131822] border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#D4A853]"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#131822] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-[#D4A853]"
          >
            {CLASS_FILTERS.map((cf) => (
              <option key={cf} value={cf}>
                Classe: {CLASS_NAMES[cf]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOnlyMyClass((v) => !v)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors ${
              onlyMyClass
                ? 'bg-[#1A202E] border-[#D4A853] text-[#F5E6C4]'
                : 'bg-[#131822] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            Só {activeBaseClass.name}
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnlocked((v) => !v)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors ${
              onlyUnlocked
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-[#131822] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            Só Desbloqueadas
          </button>
        </div>

        {/* Tier Segmented Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((tier) => {
              const active = tierFilter === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTierFilter(tier)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? tier === 'Quebra-Jogo'
                        ? 'bg-[#2E1065] border-[#C084FC] text-[#F3E8FF]'
                        : 'bg-[#D4A853] border-[#D4A853] text-[#0B0E14] font-semibold'
                      : 'bg-[#131822] border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  {tier} ({tierCounts[tier] ?? 0})
                </button>
              );
            })}
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-400">
            Exibindo {filtered.length} de 300
          </span>
        </div>
      </div>

      {/* Abilities Grid */}
      {filtered.length === 0 ? (
        <div className="border border-white/10 bg-[#131822] rounded-xl p-10 text-center space-y-2">
          <p className="text-sm text-slate-300">Nenhuma habilidade encontrada com esses filtros.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTierFilter('Todas');
              setClassFilter('Todas');
              setOnlyMyClass(false);
              setOnlyUnlocked(false);
            }}
            className="text-xs text-[#D4A853] hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ab) => {
            const equippedIdx = character.equippedSkillIds.indexOf(ab.id);
            const isParadox = ab.tier === 'Quebra-Jogo';
            const evoVariant = activeSubclass ? ab.evolvingBySubclass?.[activeSubclass.id] : undefined;
            const unlocked = isAbilityUnlockedForCharacter(ab, character);
            const learnStatus = canLearnAbility(ab, character);
            const reqLvl = getAbilityLevelRequirement(ab);

            return (
              <div
                key={ab.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                  isParadox
                    ? 'bg-[#181026] border-[#8B5CF6]/50'
                    : unlocked
                      ? 'bg-[#131822] border-white/15'
                      : 'bg-[#10141D] border-white/5 opacity-90'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-mono tabular-nums text-[#D4A853] flex items-center gap-1.5">
                      {unlocked ? (
                        <Unlock className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-500" />
                      )}
                      #{String(ab.id).padStart(3, '0')} · {ab.tier} · Nv.{reqLvl}
                    </span>
                    <span className="truncate">{ab.classLabel}</span>
                  </div>

                  <h3 className="font-display text-base font-bold text-slate-100 leading-snug">
                    {ab.name}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">{ab.description}</p>

                  {evoVariant && (
                    <div className="p-2.5 rounded-lg bg-[#0B0E14] border border-[#D4A853]/30 text-[11px] text-[#F5E6C4] flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4A853] shrink-0 mt-0.5" />
                      <span>
                        <strong>Forma em {activeSubclass?.name}:</strong> {evoVariant}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="font-mono tabular-nums text-[11px] text-slate-400">
                    Custo {ab.cost} · Recarga {ab.cooldown}s
                    {ab.power > 0 ? ` · Poder ${ab.power}` : ''}
                  </div>

                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => onEquipSkillToSlot(activeSlot, ab.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        equippedIdx !== -1
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                          : 'bg-[#1A202E] border border-white/15 text-slate-100 hover:border-[#D4A853]'
                      }`}
                    >
                      {equippedIdx !== -1 ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          No Slot {equippedIdx + 1}
                        </>
                      ) : (
                        `Equipar Slot ${activeSlot + 1}`
                      )}
                    </button>
                  ) : learnStatus.ok ? (
                    <button
                      type="button"
                      onClick={() => onUnlockSkill(ab.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Desbloquear (1 PH)
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 text-right leading-tight">
                      {learnStatus.reason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
