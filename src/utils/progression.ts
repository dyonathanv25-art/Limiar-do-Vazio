import { Ability, BaseClassInfo, CharacterProfile, SubclassInfo } from '../types/game';
import { ABILITIES } from '../data/abilities';

export function getXpForNextLevel(level: number): number {
  return Math.round(90 + (level - 1) * 65 + Math.pow(level - 1, 1.35) * 12);
}

export function getAbilityLevelRequirement(ability: Ability): number {
  switch (ability.tier) {
    case 'Comum': {
      // Starter 2 skills at Lv 1, rest spread across Lv 2-5
      const idx = (ability.id - 1) % 10;
      if (idx < 2) return 1;
      if (idx < 5) return 2;
      if (idx < 8) return 3;
      return 5;
    }
    case 'Evolutiva':
      return 6;
    case 'Rara':
      return 8;
    case 'Lendária':
      return 16;
    case 'Mítica':
      return 26;
    case 'Secreta':
      return 20;
    case 'Quebra-Jogo':
      return 35;
    default:
      return 1;
  }
}

export function isAbilityUnlockedForCharacter(
  ability: Ability,
  char: CharacterProfile
): boolean {
  if (char.sandboxMode) return true;
  if (char.unlockedSkillIds.includes(ability.id)) return true;
  return false;
}

export function canLearnAbility(
  ability: Ability,
  char: CharacterProfile
): { ok: boolean; reason?: string } {
  if (char.sandboxMode) return { ok: true };
  if (char.unlockedSkillIds.includes(ability.id)) {
    return { ok: false, reason: 'Já desbloqueada' };
  }

  const reqLvl = getAbilityLevelRequirement(ability);
  if (char.level < reqLvl) {
    return { ok: false, reason: `Requer Nível ${reqLvl}` };
  }

  if (
    ability.baseClass !== 'Híbrida' &&
    ability.baseClass !== 'Paradoxal' &&
    ability.baseClass !== char.baseClassId
  ) {
    return { ok: false, reason: `Exclusiva de ${ability.classLabel}` };
  }

  if (ability.tier === 'Secreta' && ability.baseClass !== 'Híbrida') {
    const matchingSecretUnlocked = char.unlockedSecrets.some((secId) => {
      if (secId === 'tirano_sangue' && ability.classLabel.includes('Tirano')) return true;
      if (secId === 'quebrador_ceus' && ability.classLabel.includes('Quebrador')) return true;
      if (secId === 'arquimago_caos' && ability.classLabel.includes('Arquimago')) return true;
      if (secId === 'escriba_estrelas' && ability.classLabel.includes('Escriba')) return true;
      if (secId === 'caminhante_veu' && ability.classLabel.includes('Caminhante')) return true;
      if (secId === 'ceifador_carmesim' && ability.classLabel.includes('Ceifador')) return true;
      if (secId === 'cacador_dragoes' && ability.classLabel.includes('Caçador')) return true;
      if (secId === 'arqueiro_fantasma' && ability.classLabel.includes('Arqueiro Fantasma')) return true;
      if (secId === 'apostolo_crepusculo' && ability.classLabel.includes('Apóstolo')) return true;
      return false;
    });
    if (!matchingSecretUnlocked) {
      return { ok: false, reason: `Desperte ${ability.classLabel} primeiro` };
    }
  }

  if (char.skillPoints < 1) {
    return { ok: false, reason: 'Sem Pontos de Habilidade' };
  }

  return { ok: true };
}

export function getAutoUnlockedAbilitiesForLevel(
  baseClassId: BaseClassInfo['id'],
  level: number
): number[] {
  return ABILITIES.filter((a) => {
    if (a.baseClass !== baseClassId) return false;
    if (a.tier === 'Comum' && getAbilityLevelRequirement(a) <= level) return true;
    if (a.tier === 'Evolutiva' && level >= 6 && (a.id - 251) % 8 === 0) return true;
    return false;
  }).map((a) => a.id);
}

export function computeDerivedStats(
  baseClass: BaseClassInfo,
  subclass: SubclassInfo | null,
  char: CharacterProfile
) {
  const lvlScale = char.level - 1;
  const maxHp = Math.round(
    baseClass.baseHp * 0.45 +
      lvlScale * 55 +
      char.attributes.vit * 28 +
      char.attributes.str * 8 +
      (subclass ? subclass.hpBonus : 0)
  );
  const maxResource = Math.round(
    baseClass.baseResource + lvlScale * 4 + char.attributes.int * 5
  );
  const attackPower = Math.round(
    baseClass.baseAttack * 0.65 +
      lvlScale * 5 +
      char.attributes.str * 4.5 +
      char.attributes.int * 4.5 +
      char.attributes.agi * 2.5 +
      (subclass ? subclass.attackBonus : 0)
  );
  const defense = Math.round(
    baseClass.baseDefense * 0.5 +
      lvlScale * 1.8 +
      char.attributes.vit * 2.2 +
      (subclass ? subclass.defenseBonus : 0)
  );
  const moveSpeed = Math.round(
    baseClass.moveSpeed + char.attributes.agi * 2.2 + (subclass ? subclass.speedBonus : 0)
  );
  const critChance = Math.min(0.65, 0.08 + char.attributes.agi * 0.012);
  const cdrBonus = Math.min(0.35, char.attributes.agi * 0.008);

  return {
    maxHp,
    maxResource,
    attackPower,
    defense,
    moveSpeed,
    critChance,
    cdrBonus,
  };
}
