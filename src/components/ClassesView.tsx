import React, { useState } from 'react';
import {
  BaseClassId,
  BaseClassInfo,
  CharacterProfile,
  SubclassInfo,
} from '../types/game';
import { BASE_CLASSES, SUBCLASSES } from '../data/classes';
import { getAbilityById } from '../data/abilities';
import { Lock, Unlock, Swords, Shield, Sparkles, Compass } from 'lucide-react';

interface ClassesViewProps {
  character: CharacterProfile;
  activeBaseClass: BaseClassInfo;
  activeSubclass: SubclassInfo | null;
  onSelectSubclass: (baseId: BaseClassId, subId: string, goToArena?: boolean) => void;
  onUnlockSecretManual: (subId: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  character,
  activeBaseClass,
  activeSubclass,
  onSelectSubclass,
  onUnlockSecretManual,
}) => {
  const [selectedBaseId, setSelectedBaseId] = useState<BaseClassId>(activeBaseClass.id);
  const defaultFocus =
    activeSubclass?.baseClass === activeBaseClass.id
      ? activeSubclass.id
      : SUBCLASSES.find((s) => s.baseClass === activeBaseClass.id)?.id ?? SUBCLASSES[0].id;
  const [focusedSubId, setFocusedSubId] = useState<string>(defaultFocus);

  const selectedBase =
    BASE_CLASSES.find((c) => c.id === selectedBaseId) ?? BASE_CLASSES[0];
  const classSubclasses = SUBCLASSES.filter((s) => s.baseClass === selectedBase.id);
  const focusedSub =
    classSubclasses.find((s) => s.id === focusedSubId) ?? classSubclasses[0];

  const standardSubs = classSubclasses.filter((s) => !s.isSecret);
  const secretSubs = classSubclasses.filter((s) => s.isSecret);

  const isSameBaseClass = focusedSub.baseClass === character.baseClassId;
  const isSecretUnlocked =
    !focusedSub.isSecret || character.unlockedSecrets.includes(focusedSub.id);
  const meetsLevelReq = focusedSub.isSecret
    ? character.level >= 20 || isSecretUnlocked
    : character.level >= 10;

  const canEquipFocused =
    character.sandboxMode ||
    (isSameBaseClass && isSecretUnlocked && (focusedSub.isSecret || character.level >= 10));

  let lockReason = '';
  if (!character.sandboxMode) {
    if (!isSameBaseClass) {
      lockReason = `Seu personagem é ${activeBaseClass.name}. Crie outro personagem ou ative o Modo Livre para jogar de ${selectedBase.name}.`;
    } else if (focusedSub.isSecret && !isSecretUnlocked) {
      lockReason = 'Subclasse secreta bloqueada: cumpra o gatilho oculto em combate.';
    } else if (!focusedSub.isSecret && character.level < 10) {
      lockReason = `Desbloqueia no Nível 10 (seu nível atual: ${character.level}).`;
    }
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium text-[#D4A853]">
            Arquitetura de Evolução · 5 Classes Clássicas · 21 Padrão (Nv. 10) · 9 Secretas
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
            Caminhos das Almas de Aeldrin
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Subclasses padrão desbloqueiam no Nível 10 da sua classe base. As 9 subclasses secretas despertam por feitos ocultos em combate contra os chefes de Aeldrin.
          </p>
        </div>
        <div className="text-right font-mono tabular-nums text-xs text-slate-400">
          <div>
            Segredos Despertados:{' '}
            <span className="text-[#F5E6C4] font-semibold">
              {character.unlockedSecrets.length} / 9
            </span>
          </div>
          <div className="mt-0.5">
            Build Ativa:{' '}
            <span className="text-slate-200">
              {activeSubclass
                ? `${activeBaseClass.name} · ${activeSubclass.name}`
                : `${activeBaseClass.name} (Nv. ${character.level})`}
            </span>
          </div>
        </div>
      </div>

      {/* 5 Base Class Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {BASE_CLASSES.map((bc) => {
          const isSelected = bc.id === selectedBase.id;
          const isCurrentHeroClass = bc.id === character.baseClassId;
          const countStd = SUBCLASSES.filter((s) => s.baseClass === bc.id && !s.isSecret).length;
          const countSec = SUBCLASSES.filter((s) => s.baseClass === bc.id && s.isSecret).length;
          return (
            <button
              key={bc.id}
              type="button"
              onClick={() => {
                setSelectedBaseId(bc.id);
                const first = SUBCLASSES.find((s) => s.baseClass === bc.id);
                if (first) setFocusedSubId(first.id);
              }}
              className={`p-4 rounded-xl border text-left transition-colors ${
                isSelected
                  ? 'bg-[#1A202E] border-[#D4A853]'
                  : 'bg-[#131822] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold text-slate-100">
                  {bc.name}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: bc.accentColor }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {bc.role}
                {isCurrentHeroClass ? ' · Sua Classe' : ''}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-2">
                {countStd} padrão · {countSec} {countSec === 1 ? 'secreta' : 'secretas'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Class Overview + Subclass Matrix Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Subclasses List */}
        <div className="lg:col-span-5 space-y-5">
          <div className="border border-white/10 bg-[#131822] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-[#F5E6C4]">
                  {selectedBase.name} — {selectedBase.title}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedBase.role} · Recurso: {selectedBase.resource}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{selectedBase.description}</p>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 font-mono tabular-nums text-xs">
              <div>
                <div className="text-slate-400 text-[11px]">HP Base</div>
                <div className="text-slate-100 font-semibold">{selectedBase.baseHp}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">{selectedBase.resource}</div>
                <div className="text-slate-100 font-semibold">{selectedBase.baseResource}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Ataque</div>
                <div className="text-slate-100 font-semibold">{selectedBase.baseAttack}</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Defesa</div>
                <div className="text-slate-100 font-semibold">{selectedBase.baseDefense}</div>
              </div>
            </div>
          </div>

          {/* Standard Subclasses */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-400">
              Subclasses Padrão ({standardSubs.length}) · Requer Nível 10
            </h4>
            <div className="space-y-2">
              {standardSubs.map((sc) => {
                const isFocused = sc.id === focusedSub.id;
                const isEquipped = activeSubclass?.id === sc.id;
                const unlocked =
                  character.sandboxMode ||
                  (sc.baseClass === character.baseClassId && character.level >= 10);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setFocusedSubId(sc.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                      isFocused
                        ? 'bg-[#1A202E] border-[#D4A853]'
                        : 'bg-[#131822] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {unlocked ? (
                        <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-100 truncate">
                          {sc.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {sc.role} · {sc.secondaryResource}
                        </div>
                      </div>
                    </div>
                    {isEquipped && (
                      <span className="text-[11px] font-medium text-[#D4A853] shrink-0">
                        Equipada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secret Subclasses */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-[#C084FC]">
              Subclasses Secretas ({secretSubs.length})
            </h4>
            <div className="space-y-2">
              {secretSubs.map((sc) => {
                const isFocused = sc.id === focusedSub.id;
                const unlocked =
                  character.sandboxMode || character.unlockedSecrets.includes(sc.id);
                const isEquipped = activeSubclass?.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setFocusedSubId(sc.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                      isFocused
                        ? 'bg-[#1E1430] border-[#8B5CF6]'
                        : 'bg-[#151122] border-[#8B5CF6]/30 hover:border-[#8B5CF6]/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {unlocked ? (
                        <Unlock className="w-4 h-4 text-[#D4A853] shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#C084FC] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#F3E8FF] truncate">
                          {sc.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {sc.role} · {unlocked ? 'Despertada' : 'Gatilho Oculto'}
                        </div>
                      </div>
                    </div>
                    {isEquipped && (
                      <span className="text-[11px] font-medium text-[#D4A853] shrink-0">
                        Equipada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Focused Subclass Deep Inspector */}
        <div className="lg:col-span-7 border border-white/10 bg-[#131822] rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                {selectedBase.name} · {focusedSub.role} ·{' '}
                <span className={focusedSub.isSecret ? 'text-[#C084FC]' : 'text-[#D4A853]'}>
                  {focusedSub.isSecret ? 'Subclasse Secreta' : 'Subclasse Padrão (Nv. 10)'}
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-100">
                {focusedSub.name}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {focusedSub.isSecret &&
                !isSecretUnlocked &&
                (character.sandboxMode || meetsLevelReq) && (
                  <button
                    type="button"
                    onClick={() => onUnlockSecretManual(focusedSub.id)}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#8B5CF6]/50 bg-[#1E1430] text-[#E9D5FF] hover:border-[#C084FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Despertar no Códice
                  </button>
                )}
              <button
                type="button"
                disabled={!canEquipFocused}
                onClick={() => onSelectSubclass(selectedBase.id, focusedSub.id, false)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  canEquipFocused
                    ? 'border-white/15 bg-[#1A202E] text-slate-100 hover:border-[#D4A853] cursor-pointer'
                    : 'border-white/5 bg-[#0B0E14] text-slate-600 cursor-not-allowed'
                }`}
              >
                {activeSubclass?.id === focusedSub.id ? 'Equipada' : 'Equipar Subclasse'}
              </button>
              <button
                type="button"
                disabled={!canEquipFocused}
                onClick={() => onSelectSubclass(selectedBase.id, focusedSub.id, true)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  canEquipFocused
                    ? 'bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] cursor-pointer'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                Jogar na Arena
              </button>
            </div>
          </div>

          {lockReason && (
            <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{lockReason}</span>
            </div>
          )}

          <p className="text-sm text-slate-200 leading-relaxed">{focusedSub.description}</p>

          {/* 3 Concrete Subclass Changes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4A853]">
                <Sparkles className="w-3.5 h-3.5" />
                Recurso Secundário
              </div>
              <div className="text-sm font-medium text-slate-100">
                {focusedSub.secondaryResource}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                <Compass className="w-3.5 h-3.5" />
                Esquiva e Movimento
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {focusedSub.movementShift}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#0B0E14] border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                Passiva Assinatura
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {focusedSub.signaturePassive}
              </div>
            </div>
          </div>

          {/* Stat Modifiers */}
          <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-[#0B0E14] border border-white/10 font-mono tabular-nums text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Bônus HP</div>
              <div className="text-emerald-400 font-semibold">+{focusedSub.hpBonus}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Bônus Ataque</div>
              <div className="text-[#F5E6C4] font-semibold">+{focusedSub.attackBonus}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Bônus Defesa</div>
              <div className="text-slate-100 font-semibold">+{focusedSub.defenseBonus}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Velocidade</div>
              <div className="text-sky-400 font-semibold">
                {focusedSub.speedBonus >= 0 ? `+${focusedSub.speedBonus}` : focusedSub.speedBonus}
              </div>
            </div>
          </div>

          {/* Secret Quest & Lore */}
          {focusedSub.isSecret && (
            <div className="p-5 rounded-xl bg-[#181126] border border-[#8B5CF6]/40 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-base font-bold text-[#E9D5FF]">
                  Missão de Despertar: {focusedSub.unlockMissionTitle}
                </h4>
                <span className="text-xs font-medium text-[#C084FC]">
                  {isSecretUnlocked ? 'Despertada' : 'Bloqueada na Campanha'}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{focusedSub.secretLore}</p>
              <div className="p-3 rounded-lg bg-[#0B0E14]/70 border border-white/10 text-xs text-slate-200">
                <strong className="text-[#D4A853]">Gatilho Oculto em Combate: </strong>
                {focusedSub.hiddenTrigger}
              </div>
              {focusedSub.unlockMissionSteps && (
                <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside">
                  {focusedSub.unlockMissionSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Recommended Kit */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400">
              Kit Recomendado da Subclasse (6 Habilidades)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {focusedSub.recommendedSkillIds.map((sid) => {
                const ab = getAbilityById(sid);
                if (!ab) return null;
                const learned =
                  character.sandboxMode || character.unlockedSkillIds.includes(ab.id);
                return (
                  <div
                    key={sid}
                    className={`p-3 rounded-lg border space-y-1 ${
                      learned
                        ? 'bg-[#0B0E14] border-white/10'
                        : 'bg-[#0B0E14]/50 border-white/5 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-100">{ab.name}</span>
                      <span className="font-mono text-[11px] text-[#D4A853]">
                        #{String(ab.id).padStart(3, '0')} · {ab.tier}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{ab.description}</p>
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
