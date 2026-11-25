export type BaseClassId = 'guerreiro' | 'mago' | 'ladino' | 'arqueiro' | 'clerigo';

export type AbilityTier =
  | 'Comum'
  | 'Rara'
  | 'Lendária'
  | 'Mítica'
  | 'Secreta'
  | 'Evolutiva'
  | 'Quebra-Jogo';

export type AbilityKind =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'control'
  | 'buff'
  | 'paradox';

export type ResourceType = 'Estamina' | 'Mana' | 'Energia' | 'Foco' | 'Fé';

export interface CharacterAttributes {
  str: number; // Força: Dano físico e vida leve
  int: number; // Inteligência: Poder mágico/cura e recurso máximo
  agi: number; // Agilidade: Crítico, velocidade e redução de recarga
  vit: number; // Vitalidade: HP máximo e defesa
}

export interface SkinInfo {
  id: string;
  name: string;
  title: string;
  description: string;
  unlockLevel: number;
  goldCost: number;
  primaryColor: string;
  secondaryColor: string;
  trimColor: string;
  weaponColor: string;
  glowColor: string;
  metalness: number;
  roughness: number;
  headgear: 'none' | 'helm' | 'hood' | 'crown' | 'horns' | 'blindfold';
  hasCape: boolean;
  hasHalo: boolean;
  pauldronsScale: number;
}

export interface CharacterProfile {
  name: string;
  created: boolean;
  level: number;
  xp: number;
  statPoints: number;
  skillPoints: number;
  gold: number;
  attributes: CharacterAttributes;
  baseClassId: BaseClassId;
  subclassId: string | null;
  skinId: string;
  unlockedSkins: string[];
  equippedSkillIds: number[];
  unlockedSkillIds: number[];
  unlockedSecrets: string[];
  killsByEnemyId: Record<string, number>;
  sandboxMode: boolean;
}

export interface BaseClassInfo {
  id: BaseClassId;
  name: string;
  title: string;
  role: string;
  resource: ResourceType;
  accentColor: string;
  description: string;
  baseHp: number;
  baseResource: number;
  baseAttack: number;
  baseDefense: number;
  moveSpeed: number;
  dodgeLabel: string;
  starterStats: CharacterAttributes;
  starterSkillIds: number[];
}

export interface SubclassInfo {
  id: string;
  baseClass: BaseClassId;
  name: string;
  isSecret: boolean;
  role: string;
  secondaryResource: string;
  movementShift: string;
  signaturePassive: string;
  description: string;
  hpBonus: number;
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  secretLore?: string;
  hiddenTrigger?: string;
  unlockMissionTitle?: string;
  unlockMissionSteps?: string[];
  recommendedSkillIds: number[];
}

export interface Ability {
  id: number;
  name: string;
  tier: AbilityTier;
  classLabel: string;
  baseClass: BaseClassId | 'Híbrida' | 'Paradoxal';
  subclassTarget?: string;
  description: string;
  kind: AbilityKind;
  cost: number;
  cooldown: number;
  power: number;
  range: number;
  aoeRadius: number;
  tags: string[];
  evolvingBySubclass?: Record<string, string>;
  paradoxKey?:
    | 'cause_effect_inversion'
    | 'hp_bar_swap'
    | 'cooldown_theft'
    | 'gravity_flip'
    | 'retroactive_damage'
    | 'attribute_inversion'
    | 'undo_death'
    | 'element_inversion'
    | 'body_swap'
    | 'erase_rule';
}

export type BossCategory =
  | 'Monstro Comum'
  | 'Elite'
  | 'Subchefe'
  | 'Chefe Principal'
  | 'Chefe Final';

export interface BossPhase {
  phase: number;
  hpThreshold: number;
  name: string;
  summary: string;
  mechanicHint: string;
}

export interface BossEncounter {
  id: string;
  name: string;
  title: string;
  category: BossCategory;
  recommendedLevel: number;
  xpReward: number;
  goldReward: number;
  regionId: string;
  regionName: string;
  focus: string;
  maxHp: number;
  attack: number;
  speed: number;
  radius: number;
  accentColor: string;
  drops: string[];
  secretInteraction?: string;
  phases: BossPhase[];
}

export interface WorldRegion {
  id: string;
  name: string;
  subtitle: string;
  dangerLevel: string;
  subStoryTitle: string;
  subStoryText: string;
  questHook: string;
  classConnection: string;
  mapX: number;
  mapY: number;
  color: string;
  bossIds: string[];
}

export interface FactionInfo {
  id: string;
  name: string;
  seat: string;
  philosophy: string;
  color: string;
}

export interface CombatLogEntry {
  id: number;
  time: string;
  text: string;
  tone: 'neutral' | 'damage' | 'heal' | 'paradox' | 'boss' | 'secret';
}
