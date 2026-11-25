import React, { useState, useEffect, useCallback } from 'react';
import {
  BaseClassId,
  BossEncounter,
  CharacterAttributes,
  CharacterProfile,
  SkinInfo,
} from './types/game';
import { BASE_CLASSES, SUBCLASSES } from './data/classes';
import { ABILITIES } from './data/abilities';
import { SKINS } from './data/skins';
import {
  canLearnAbility,
  getAutoUnlockedAbilitiesForLevel,
  getXpForNextLevel,
} from './utils/progression';
import { CombatArena } from './components/CombatArena';
import { CharacterPanel } from './components/CharacterPanel';
import { CharacterCreationModal } from './components/CharacterCreationModal';
import { ClassesView } from './components/ClassesView';
import { SkinsView } from './components/SkinsView';
import { GrimoireView } from './components/GrimoireView';
import { WorldMapView } from './components/WorldMapView';
import { JujutsuCanvasView } from './components/JujutsuCanvasView';
import { Sparkles, X } from 'lucide-react';
import { soundEngine } from './utils/sound';

type ActiveTab = 'arena' | 'character' | 'grimoire' | 'world' | 'jujutsu';
type CharacterSubTab = 'sheet' | 'skins' | 'classes';

const STORAGE_KEY = 'aeldrin_rpg_v2';

function buildInitialCharacter(
  name = 'Kaelen',
  baseClassId: BaseClassId = 'guerreiro',
  sandboxMode = false,
  created = false,
  skinId = 'viajante_ferro'
): CharacterProfile {
  const bc = BASE_CLASSES.find((c) => c.id === baseClassId) ?? BASE_CLASSES[0];
  const firstSub = SUBCLASSES.find((s) => s.baseClass === bc.id && !s.isSecret);
  if (sandboxMode) {
    return {
      name,
      created,
      level: 35,
      xp: 0,
      statPoints: 20,
      skillPoints: 20,
      gold: 5000,
      attributes: {
        str: bc.starterStats.str + 18,
        int: bc.starterStats.int + 12,
        agi: bc.starterStats.agi + 14,
        vit: bc.starterStats.vit + 16,
      },
      baseClassId: bc.id,
      subclassId: firstSub?.id ?? null,
      skinId,
      unlockedSkins: SKINS.map((s) => s.id),
      equippedSkillIds: firstSub
        ? [...firstSub.recommendedSkillIds]
        : [bc.starterSkillIds[0], bc.starterSkillIds[1], 0, 0, 0, 0],
      unlockedSkillIds: ABILITIES.map((a) => a.id),
      unlockedSecrets: SUBCLASSES.filter((s) => s.isSecret).map((s) => s.id),
      killsByEnemyId: {},
      sandboxMode: true,
    };
  }

  return {
    name,
    created,
    level: 1,
    xp: 0,
    statPoints: 0,
    skillPoints: 0,
    gold: 0,
    attributes: { ...bc.starterStats },
    baseClassId: bc.id,
    subclassId: null,
    skinId,
    unlockedSkins: ['viajante_ferro'],
    equippedSkillIds: [bc.starterSkillIds[0], bc.starterSkillIds[1], 0, 0, 0, 0],
    unlockedSkillIds: [...bc.starterSkillIds],
    unlockedSecrets: [],
    killsByEnemyId: {},
    sandboxMode: false,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('arena');
  const [characterSubTab, setCharacterSubTab] = useState<CharacterSubTab>('sheet');
  const [character, setCharacter] = useState<CharacterProfile>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CharacterProfile>;
        if (parsed && parsed.baseClassId && Array.isArray(parsed.equippedSkillIds)) {
          const fallback = buildInitialCharacter(
            parsed.name ?? 'Kaelen',
            parsed.baseClassId,
            Boolean(parsed.sandboxMode),
            Boolean(parsed.created)
          );
          return {
            ...fallback,
            ...parsed,
            skinId: parsed.skinId ?? 'viajante_ferro',
            unlockedSkins: Array.isArray(parsed.unlockedSkins)
              ? parsed.unlockedSkins
              : ['viajante_ferro'],
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return buildInitialCharacter('Kaelen', 'guerreiro', false, false, 'viajante_ferro');
  });
  const [showCreator, setShowCreator] = useState<boolean>(() => !character.created);
  const [selectedBossId, setSelectedBossId] = useState<string>(() =>
    character.sandboxMode ? 'kael7' : 'lobo_cinzas'
  );
  const [grimoireTargetSlot, setGrimoireTargetSlot] = useState<number | null>(null);
  const [secretToast, setSecretToast] = useState<{
    subclassId: string;
    name: string;
    reason: string;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
    } catch {
      // ignore storage errors
    }
  }, [character]);

  const activeBaseClass =
    BASE_CLASSES.find((c) => c.id === character.baseClassId) ?? BASE_CLASSES[0];
  const activeSubclass = character.subclassId
    ? SUBCLASSES.find((s) => s.id === character.subclassId) ?? null
    : null;

  const handleCreateCharacter = useCallback(
    (name: string, baseClassId: BaseClassId, sandboxMode: boolean, skinId: string) => {
      const fresh = buildInitialCharacter(name, baseClassId, sandboxMode, true, skinId);
      setCharacter(fresh);
      setSelectedBossId(sandboxMode ? 'kael7' : 'lobo_cinzas');
      setShowCreator(false);
      setActiveTab('arena');
      soundEngine.playVictory();
    },
    []
  );

  const handleAllocateStat = useCallback((stat: keyof CharacterAttributes) => {
    setCharacter((prev) => {
      if (prev.statPoints <= 0) return prev;
      return {
        ...prev,
        statPoints: prev.statPoints - 1,
        attributes: {
          ...prev.attributes,
          [stat]: prev.attributes[stat] + 1,
        },
      };
    });
  }, []);

  const handleEncounterVictory = useCallback(
    (enemy: BossEncounter, redeemed: boolean) => {
      const xpGain = redeemed ? Math.round(enemy.xpReward * 1.25) : enemy.xpReward;
      const goldGain = redeemed ? Math.round(enemy.goldReward * 1.25) : enemy.goldReward;

      let simXp = character.xp + xpGain;
      let simLevel = character.level;
      let leveledUp = false;

      while (simXp >= getXpForNextLevel(simLevel)) {
        simXp -= getXpForNextLevel(simLevel);
        simLevel += 1;
        leveledUp = true;
      }

      setCharacter((prev) => {
        let newXp = prev.xp + xpGain;
        let newLevel = prev.level;
        let gainedStatPts = 0;
        let gainedSkillPts = 0;

        while (newXp >= getXpForNextLevel(newLevel)) {
          newXp -= getXpForNextLevel(newLevel);
          newLevel += 1;
          gainedStatPts += 3;
          gainedSkillPts += 1;
        }

        const autoIds = getAutoUnlockedAbilitiesForLevel(prev.baseClassId, newLevel);
        const mergedUnlocked = Array.from(new Set([...prev.unlockedSkillIds, ...autoIds]));

        const nextEquipped = [...prev.equippedSkillIds];
        for (const id of autoIds) {
          if (!nextEquipped.includes(id)) {
            const emptyIdx = nextEquipped.indexOf(0);
            if (emptyIdx !== -1) {
              nextEquipped[emptyIdx] = id;
            }
          }
        }

        return {
          ...prev,
          level: newLevel,
          xp: newXp,
          statPoints: prev.statPoints + gainedStatPts,
          skillPoints: prev.skillPoints + gainedSkillPts,
          gold: prev.gold + goldGain,
          unlockedSkillIds: mergedUnlocked,
          equippedSkillIds: nextEquipped,
          killsByEnemyId: {
            ...prev.killsByEnemyId,
            [enemy.id]: (prev.killsByEnemyId[enemy.id] ?? 0) + 1,
          },
        };
      });

      return { leveledUp, newLevel: simLevel };
    },
    [character.level, character.xp]
  );

  const handleUnlockSkill = useCallback((skillId: number) => {
    const ab = ABILITIES.find((a) => a.id === skillId);
    if (!ab) return;
    setCharacter((prev) => {
      const check = canLearnAbility(ab, prev);
      if (!check.ok) return prev;
      const nextEquipped = [...prev.equippedSkillIds];
      const emptyIdx = nextEquipped.indexOf(0);
      if (emptyIdx !== -1 && !nextEquipped.includes(skillId)) {
        nextEquipped[emptyIdx] = skillId;
      }
      return {
        ...prev,
        skillPoints: prev.skillPoints - 1,
        unlockedSkillIds: [...prev.unlockedSkillIds, skillId],
        equippedSkillIds: nextEquipped,
      };
    });
    soundEngine.playHeal();
  }, []);

  const handleEquipSkillToSlot = useCallback((slotIdx: number, skillId: number) => {
    setCharacter((prev) => {
      const next = [...prev.equippedSkillIds];
      next[slotIdx] = skillId;
      return { ...prev, equippedSkillIds: next };
    });
  }, []);

  const handleSelectSkin = useCallback((skinId: string, goToArena = false) => {
    setCharacter((prev) => {
      const allowed = prev.sandboxMode || prev.unlockedSkins.includes(skinId);
      if (!allowed) return prev;
      return { ...prev, skinId };
    });
    if (goToArena) {
      setActiveTab('arena');
    }
  }, []);

  const handleUnlockSkin = useCallback((skin: SkinInfo) => {
    setCharacter((prev) => {
      if (prev.unlockedSkins.includes(skin.id)) return prev;
      if (prev.level < skin.unlockLevel || prev.gold < skin.goldCost) return prev;
      return {
        ...prev,
        gold: prev.gold - skin.goldCost,
        unlockedSkins: [...prev.unlockedSkins, skin.id],
        skinId: skin.id,
      };
    });
    soundEngine.playSecretUnlock();
  }, []);

  const handleSelectSubclass = useCallback(
    (newBaseId: BaseClassId, newSubId: string, goToArena = false) => {
      const sub = SUBCLASSES.find((s) => s.id === newSubId);
      if (!sub) return;
      setCharacter((prev) => {
        const allowed =
          prev.sandboxMode ||
          (sub.baseClass === prev.baseClassId &&
            (sub.isSecret ? prev.unlockedSecrets.includes(sub.id) : prev.level >= 10));
        if (!allowed) return prev;

        let nextEquipped = [...prev.equippedSkillIds];
        if (prev.sandboxMode) {
          nextEquipped = [...sub.recommendedSkillIds];
        } else {
          for (const sid of sub.recommendedSkillIds) {
            if (prev.unlockedSkillIds.includes(sid) && !nextEquipped.includes(sid)) {
              const emptyIdx = nextEquipped.indexOf(0);
              if (emptyIdx !== -1) nextEquipped[emptyIdx] = sid;
            }
          }
        }

        return {
          ...prev,
          baseClassId: prev.sandboxMode ? newBaseId : prev.baseClassId,
          subclassId: sub.id,
          equippedSkillIds: nextEquipped,
        };
      });
      if (goToArena) {
        setActiveTab('arena');
      }
    },
    []
  );

  const handleUnlockSecret = useCallback((subId: string, reason: string) => {
    const sub = SUBCLASSES.find((s) => s.id === subId);
    if (!sub) return;
    setCharacter((prev) => ({
      ...prev,
      unlockedSecrets: prev.unlockedSecrets.includes(subId)
        ? prev.unlockedSecrets
        : [...prev.unlockedSecrets, subId],
    }));
    soundEngine.playSecretUnlock();
    setSecretToast({
      subclassId: subId,
      name: sub.name,
      reason,
    });
  }, []);

  const handleToggleSandbox = useCallback(() => {
    setCharacter((prev) => {
      const nextMode = !prev.sandboxMode;
      const fallbackSub =
        prev.subclassId ??
        SUBCLASSES.find((s) => s.baseClass === prev.baseClassId && !s.isSecret)?.id ??
        null;
      return {
        ...prev,
        sandboxMode: nextMode,
        subclassId: nextMode ? fallbackSub : prev.level >= 10 ? prev.subclassId : null,
      };
    });
  }, []);

  const handleOpenGrimoireForSlot = useCallback((slotIdx: number) => {
    setGrimoireTargetSlot(slotIdx);
    setActiveTab('grimoire');
  }, []);

  const handleLaunchBoss = useCallback((bossId: string) => {
    setSelectedBossId(bossId);
    setShowCreator(false);
    setActiveTab('arena');
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#E6E8EE] flex flex-col">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1360px] mx-auto px-5 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => {
              if (!character.created) return;
              setShowCreator(false);
              setActiveTab('arena');
            }}
            className="font-display text-xl font-bold tracking-tight text-[#F5E6C4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Aeldrin
          </button>

          <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {[
              { id: 'arena' as const, label: 'Arena 3D' },
              {
                id: 'character' as const,
                label:
                  character.statPoints > 0
                    ? `Personagem (+${character.statPoints})`
                    : 'Personagem',
              },
              { id: 'grimoire' as const, label: 'Grimório (300)' },
              { id: 'world' as const, label: 'Mapa e Lore' },
              { id: 'jujutsu' as const, label: 'Gojo vs Sukuna' },
            ].map((item) => {
              const active = !showCreator && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!character.created) return;
                    setShowCreator(false);
                    setActiveTab(item.id);
                  }}
                  className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-[#D4A853] text-[#F5E6C4]'
                      : 'border-transparent text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 hidden sm:block">
            {activeTab === 'arena' && !showCreator ? (
              <button
                type="button"
                onClick={() => {
                  if (!character.created) return;
                  setCharacterSubTab('skins');
                  setActiveTab('character');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Skins 3D · Nv.{character.level}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!character.created) return;
                  setShowCreator(false);
                  setActiveTab('arena');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Ir para Arena 3D
              </button>
            )}
          </div>
        </div>
      </header>

      {secretToast && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full border border-[#8B5CF6]/70 bg-[#1A122B] rounded-xl p-4 shadow-2xl space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C084FC]">
              <Sparkles className="w-4 h-4" />
              Classe Secreta Despertada!
            </div>
            <button
              type="button"
              onClick={() => setSecretToast(null)}
              aria-label="Fechar aviso"
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="font-display text-base font-bold text-[#F5E6C4]">
            {secretToast.name}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{secretToast.reason}</p>
          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const sub = SUBCLASSES.find((s) => s.id === secretToast.subclassId);
                if (sub) handleSelectSubclass(sub.baseClass, sub.id, true);
                setSecretToast(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors"
            >
              Equipar Agora
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-5 py-7">
        {showCreator ? (
          <CharacterCreationModal
            onCreateCharacter={handleCreateCharacter}
            onCancel={character.created ? () => setShowCreator(false) : undefined}
          />
        ) : (
          <>
            {activeTab === 'arena' && (
              <CombatArena
                character={character}
                baseClass={activeBaseClass}
                subclass={activeSubclass}
                selectedBossId={selectedBossId}
                onSelectBoss={setSelectedBossId}
                onSelectSkin={(sid) => handleSelectSkin(sid, false)}
                onEncounterVictory={handleEncounterVictory}
                onAllocateStat={handleAllocateStat}
                onUnlockSecret={handleUnlockSecret}
                onOpenGrimoireForSlot={handleOpenGrimoireForSlot}
                onOpenCharacterTab={() => {
                  setCharacterSubTab('sheet');
                  setActiveTab('character');
                }}
                onOpenSkinsTab={() => {
                  setCharacterSubTab('skins');
                  setActiveTab('character');
                }}
              />
            )}

            {activeTab === 'character' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
                  <button
                    type="button"
                    onClick={() => setCharacterSubTab('sheet')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      characterSubTab === 'sheet'
                        ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0E14]'
                        : 'bg-[#131822] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    Atributos e Nível ({character.statPoints} pts)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCharacterSubTab('skins')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      characterSubTab === 'skins'
                        ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0E14]'
                        : 'bg-[#131822] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    Skins e Aparência 3D (8)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCharacterSubTab('classes')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      characterSubTab === 'classes'
                        ? 'bg-[#D4A853] border-[#D4A853] text-[#0B0E14]'
                        : 'bg-[#131822] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    Classes e Subclasses (30)
                  </button>
                </div>

                {characterSubTab === 'sheet' && (
                  <CharacterPanel
                    character={character}
                    baseClass={activeBaseClass}
                    subclass={activeSubclass}
                    onAllocateStat={handleAllocateStat}
                    onResetCharacter={() => setShowCreator(true)}
                    onToggleSandbox={handleToggleSandbox}
                    onGoToClasses={() => setCharacterSubTab('classes')}
                  />
                )}

                {characterSubTab === 'skins' && (
                  <SkinsView
                    character={character}
                    onSelectSkin={handleSelectSkin}
                    onUnlockSkin={handleUnlockSkin}
                  />
                )}

                {characterSubTab === 'classes' && (
                  <ClassesView
                    character={character}
                    activeBaseClass={activeBaseClass}
                    activeSubclass={activeSubclass}
                    onSelectSubclass={handleSelectSubclass}
                    onUnlockSecretManual={(subId) =>
                      handleUnlockSecret(
                        subId,
                        'Despertada através do Códice das Almas.'
                      )
                    }
                  />
                )}
              </div>
            )}

            {activeTab === 'grimoire' && (
              <GrimoireView
                character={character}
                activeBaseClass={activeBaseClass}
                activeSubclass={activeSubclass}
                targetSlotIndex={grimoireTargetSlot}
                onSelectTargetSlot={setGrimoireTargetSlot}
                onEquipSkillToSlot={handleEquipSkillToSlot}
                onUnlockSkill={handleUnlockSkill}
                onToggleSandbox={handleToggleSandbox}
              />
            )}

            {activeTab === 'world' && <WorldMapView onLaunchBoss={handleLaunchBoss} />}

            {activeTab === 'jujutsu' && <JujutsuCanvasView />}
          </>
        )}
      </main>

      <footer className="border-t border-white/10 py-5 px-5 text-xs text-slate-500">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>Aeldrin: O Véu Fraturado e as Cicatrizes do Tempo · Arena 3D Three.js</span>
          <span>5 Classes · 30 Subclasses · 8 Skins 3D · 300 Habilidades · Monstros Nv. 1+ e Chefes</span>
        </div>
      </footer>
    </div>
  );
}
