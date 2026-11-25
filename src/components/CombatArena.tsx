import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  BaseClassInfo,
  BossEncounter,
  CharacterAttributes,
  CharacterProfile,
  CombatLogEntry,
  SubclassInfo,
} from '../types/game';
import { ABILITIES } from '../data/abilities';
import { ALL_ENCOUNTERS } from '../data/bosses';
import { SKINS, getSkinById } from '../data/skins';
import { computeDerivedStats, getXpForNextLevel } from '../utils/progression';
import { soundEngine } from '../utils/sound';
import {
  ARENA_SIM_H,
  ARENA_SIM_W,
  Arena3DEngine,
  CameraPreset,
} from '../engine/arena3d';
import {
  Shield,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  User,
  Play,
  Square,
  Swords,
  AlertTriangle,
  Plus,
  ChevronRight,
  Camera,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Palette,
} from 'lucide-react';

interface CombatArenaProps {
  character: CharacterProfile;
  baseClass: BaseClassInfo;
  subclass: SubclassInfo | null;
  selectedBossId: string;
  onSelectBoss: (bossId: string) => void;
  onSelectSkin: (skinId: string) => void;
  onEncounterVictory: (
    enemy: BossEncounter,
    redeemed: boolean
  ) => { leveledUp: boolean; newLevel: number };
  onAllocateStat: (stat: keyof CharacterAttributes) => void;
  onUnlockSecret: (subclassId: string, reason: string) => void;
  onOpenGrimoireForSlot: (slotIndex: number) => void;
  onOpenCharacterTab: () => void;
  onOpenSkinsTab: () => void;
}

interface Telegraph {
  id: number;
  kind: 'circle' | 'cone' | 'ring' | 'stasis' | 'orb';
  x: number;
  y: number;
  radius: number;
  angle?: number;
  spread?: number;
  timer: number;
  duration: number;
  damage: number;
  color: string;
  hitApplied?: boolean;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface AllyUnit {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  color: string;
  cooldown: number;
}

interface CloneUnit {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isReal: boolean;
  color: string;
  life: number;
}

interface SnapshotState {
  playerHp: number;
  playerX: number;
  playerY: number;
  bossHp: number;
  alliesHp: number[];
}

export const CombatArena: React.FC<CombatArenaProps> = ({
  character,
  baseClass,
  subclass,
  selectedBossId,
  onSelectBoss,
  onSelectSkin,
  onEncounterVictory,
  onAllocateStat,
  onUnlockSecret,
  onOpenGrimoireForSlot,
  onOpenCharacterTab,
  onOpenSkinsTab,
}) => {
  const bossTemplate =
    ALL_ENCOUNTERS.find((b) => b.id === selectedBossId) ?? ALL_ENCOUNTERS[0];
  const activeSkin = getSkinById(character.skinId);
  const derived = computeDerivedStats(baseClass, subclass, character);

  const [partyMode, setPartyMode] = useState<'group' | 'solo'>(
    character.level < 10 ? 'solo' : 'group'
  );
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [showDpad, setShowDpad] = useState(false);
  const [muted, setMuted] = useState(soundEngine.muted);
  const [combatState, setCombatState] = useState<
    'ready' | 'fighting' | 'victory' | 'defeat' | 'redeemed'
  >('ready');
  const [victorySummary, setVictorySummary] = useState<{
    xp: number;
    gold: number;
    leveledUp: boolean;
    newLevel: number;
  } | null>(null);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);

  const [hud, setHud] = useState({
    playerHp: derived.maxHp,
    playerMaxHp: derived.maxHp,
    playerShield: 0,
    resource: derived.maxResource,
    maxResource: derived.maxResource,
    bossHp: bossTemplate.maxHp,
    bossMaxHp: bossTemplate.maxHp,
    bossPhase: 1,
    bossPhaseName: bossTemplate.phases[0]?.name ?? 'Fase 1',
    cooldowns: [0, 0, 0, 0, 0, 0],
    dodgeCd: 0,
    paradoxBanner: '' as string,
    paradoxTimer: 0,
    inversionActive: false,
    bossPoisonStacks: 0,
    bossBleedStacks: 0,
    parriesLanded: 0,
    allies: [] as { name: string; hp: number; maxHp: number; role: string }[],
  });

  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Arena3DEngine | null>(null);

  const keysRef = useRef<Record<string, boolean>>({});
  const dpadDirRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const moveTargetRef = useRef<{ x: number; y: number } | null>(null);

  const equippedAbilities = character.equippedSkillIds.map(
    (id) => ABILITIES.find((a) => a.id === id) ?? null
  );

  // Mutable latest-props ref so WebGL loop never restarts on UI state changes
  const latestRef = useRef({
    character,
    baseClass,
    subclass,
    bossTemplate,
    equippedAbilities,
    onEncounterVictory,
    onUnlockSecret,
  });
  latestRef.current = {
    character,
    baseClass,
    subclass,
    bossTemplate,
    equippedAbilities,
    onEncounterVictory,
    onUnlockSecret,
  };

  const simRef = useRef({
    running: false,
    elapsed: 0,
    player: {
      x: 210,
      y: ARENA_SIM_H / 2,
      radius: 17,
      hp: derived.maxHp,
      maxHp: derived.maxHp,
      shield: 0,
      resource: derived.maxResource,
      maxResource: derived.maxResource,
      dodgeTimer: 0,
      dodgeCd: 0,
      parryWindow: 0,
      lowHpTriggered: false,
      lowManaCount: 0,
      wasLowMana: false,
      hitsTakenFromTelegraph: 0,
      parriesLanded: 0,
    },
    boss: {
      x: 630,
      y: ARENA_SIM_H / 2,
      hp: bossTemplate.maxHp,
      maxHp: bossTemplate.maxHp,
      phase: 1,
      attackTimer: 1.8,
      specialTimer: 4.5,
      frozenTimer: 0,
      poisonTimer: 0,
      poisonStacks: 0,
      bleedTimer: 0,
      bleedStacks: 0,
      vulnerabilityMult: 1,
      vulnerabilityTimer: 0,
      paradoxInversionTimer: 0,
    },
    allies: [] as AllyUnit[],
    clones: [] as CloneUnit[],
    telegraphs: [] as Telegraph[],
    floatTexts: [] as FloatingText[],
    cooldowns: [0, 0, 0, 0, 0, 0],
    paradox: {
      inversionTimer: 0,
      gravityFlipTimer: 0,
      freeRuleTimer: 0,
      attributeBoostTimer: 0,
      retroActiveTimer: 0,
      retroDamageSaved: 0,
      bodySwapTimer: 0,
      banner: '',
      bannerTimer: 0,
    },
    snapshots: [] as SnapshotState[],
    snapshotAccum: 0,
    nextId: 1,
  });

  const pushLog = useCallback((text: string, tone: CombatLogEntry['tone'] = 'neutral') => {
    const now = new Date();
    const time = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setCombatLog((prev) =>
      [{ id: Date.now() + Math.random(), time, text, tone }, ...prev].slice(0, 24)
    );
  }, []);

  const addFloat = (x: number, y: number, text: string, color: string, size = 14) => {
    const s = simRef.current;
    s.floatTexts.push({
      id: s.nextId++,
      x,
      y,
      text,
      color,
      life: 1.05,
      maxLife: 1.05,
      size,
    });
  };

  const resetEncounter = useCallback(
    (autoStart = false) => {
      const { baseClass: bc, subclass: sc, character: ch, bossTemplate: bt } = latestRef.current;
      const freshStats = computeDerivedStats(bc, sc, ch);
      const allies: AllyUnit[] =
        partyMode === 'group'
          ? [
              {
                id: 'ally_tank',
                name: 'Aldric',
                role: 'Tank',
                x: 270,
                y: ARENA_SIM_H / 2 - 65,
                hp: Math.round(freshStats.maxHp * 1.15),
                maxHp: Math.round(freshStats.maxHp * 1.15),
                color: '#D97706',
                cooldown: 1.4,
              },
              {
                id: 'ally_healer',
                name: 'Lyra',
                role: 'Suporte',
                x: 155,
                y: ARENA_SIM_H / 2 + 75,
                hp: Math.round(freshStats.maxHp * 0.9),
                maxHp: Math.round(freshStats.maxHp * 0.9),
                color: '#D4A853',
                cooldown: 2.2,
              },
            ]
          : [];

      moveTargetRef.current = null;
      simRef.current = {
        running: autoStart,
        elapsed: 0,
        player: {
          x: 210,
          y: ARENA_SIM_H / 2,
          radius: 17,
          hp: freshStats.maxHp,
          maxHp: freshStats.maxHp,
          shield: 0,
          resource: freshStats.maxResource,
          maxResource: freshStats.maxResource,
          dodgeTimer: 0,
          dodgeCd: 0,
          parryWindow: 0,
          lowHpTriggered: false,
          lowManaCount: 0,
          wasLowMana: false,
          hitsTakenFromTelegraph: 0,
          parriesLanded: 0,
        },
        boss: {
          x: 630,
          y: ARENA_SIM_H / 2,
          hp: bt.maxHp,
          maxHp: bt.maxHp,
          phase: 1,
          attackTimer: 1.5,
          specialTimer: 4.0,
          frozenTimer: 0,
          poisonTimer: 0,
          poisonStacks: 0,
          bleedTimer: 0,
          bleedStacks: 0,
          vulnerabilityMult: 1,
          vulnerabilityTimer: 0,
          paradoxInversionTimer: 0,
        },
        allies,
        clones: [],
        telegraphs: [],
        floatTexts: [],
        cooldowns: [0, 0, 0, 0, 0, 0],
        paradox: {
          inversionTimer: 0,
          gravityFlipTimer: 0,
          freeRuleTimer: 0,
          attributeBoostTimer: 0,
          retroActiveTimer: 0,
          retroDamageSaved: 0,
          bodySwapTimer: 0,
          banner: '',
          bannerTimer: 0,
        },
        snapshots: [],
        snapshotAccum: 0,
        nextId: 1,
      };

      setVictorySummary(null);
      setCombatState(autoStart ? 'fighting' : 'ready');
      setCombatLog([]);
      if (autoStart) {
        pushLog(
          `Combate 3D iniciado contra ${bt.name} (Nv. ${bt.recommendedLevel}).`,
          'boss'
        );
        soundEngine.playBossWarn();
      }
      setHud({
        playerHp: freshStats.maxHp,
        playerMaxHp: freshStats.maxHp,
        playerShield: 0,
        resource: freshStats.maxResource,
        maxResource: freshStats.maxResource,
        bossHp: bt.maxHp,
        bossMaxHp: bt.maxHp,
        bossPhase: 1,
        bossPhaseName: bt.phases[0]?.name ?? 'Fase 1',
        cooldowns: [0, 0, 0, 0, 0, 0],
        dodgeCd: 0,
        paradoxBanner: '',
        paradoxTimer: 0,
        inversionActive: false,
        bossPoisonStacks: 0,
        bossBleedStacks: 0,
        parriesLanded: 0,
        allies: allies.map((a) => ({ name: a.name, hp: a.hp, maxHp: a.maxHp, role: a.role })),
      });
    },
    [partyMode, pushLog]
  );

  useEffect(() => {
    resetEncounter(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossTemplate.id, baseClass.id, subclass?.id, partyMode]);

  const checkSecretUnlocksOnVictory = useCallback((redeemed = false) => {
    const s = simRef.current;
    const { character: ch, bossTemplate: bt, baseClass: bc, onUnlockSecret: unlock } = latestRef.current;
    const unlocked = ch.unlockedSecrets;
    if (redeemed && !unlocked.includes('apostolo_crepusculo')) {
      unlock(
        'apostolo_crepusculo',
        'Você purificou o chefe ferido com Cura em vez de executá-lo.'
      );
    }
    if (
      (bt.id === 'vaelen' || bt.id === 'kael7') &&
      s.player.lowHpTriggered &&
      !unlocked.includes('tirano_sangue')
    ) {
      unlock(
        'tirano_sangue',
        'Sobreviveu abaixo de 15% HP na linha de frente de Kael-Dorn.'
      );
    }
    if (s.player.parriesLanded >= 3 && !unlocked.includes('quebrador_ceus')) {
      unlock('quebrador_ceus', 'Executou 3+ Aparas Perfeitas com precisão cirúrgica.');
    }
    if (
      (bt.id === 'relojoeiro_mirath' || bt.id === 'lyraen') &&
      s.player.lowManaCount >= 2 &&
      !unlocked.includes('arquimago_caos')
    ) {
      unlock(
        'arquimago_caos',
        'Sobreviveu a sobrecargas de mana perto das fendas de Mirath.'
      );
    }
    if (
      (bt.id === 'lyraen' || bt.id === 'relojoeiro_mirath') &&
      s.player.hitsTakenFromTelegraph <= 3 &&
      !unlocked.includes('escriba_estrelas')
    ) {
      unlock(
        'escriba_estrelas',
        'Leu os padrões astrais de Mirath sofrendo quase nenhum golpe.'
      );
    }
    if (
      (bt.id === 'sussurro_nyx' || bt.id === 'o_zero') &&
      !unlocked.includes('caminhante_veu')
    ) {
      unlock('caminhante_veu', 'Superou as sombras e reflexos sem identidade de Nyx.');
    }
    if (
      s.boss.poisonStacks > 0 &&
      s.boss.bleedStacks > 0 &&
      !unlocked.includes('ceifador_carmesim')
    ) {
      unlock('ceifador_carmesim', 'Combinou Veneno e Sangramento simultâneos em combate.');
    }
    if (
      (bt.id === 'sera' || bt.id === 'arquiteto_vazio') &&
      bc.id === 'arqueiro' &&
      !unlocked.includes('cacador_dragoes')
    ) {
      unlock('cacador_dragoes', 'Abateu uma fera ou entidade colossal dos céus.');
    }
    if (
      (bt.id === 'sera' || bt.id === 'relojoeiro_mirath') &&
      !unlocked.includes('arqueiro_fantasma') &&
      bc.id === 'arqueiro'
    ) {
      unlock('arqueiro_fantasma', 'Dominou a precisão espectral sob o luar de Noctis.');
    }
  }, []);

  const handleWin = useCallback(
    (redeemed: boolean) => {
      const { bossTemplate: bt, onEncounterVictory: onWin } = latestRef.current;
      const res = onWin(bt, redeemed);
      setVictorySummary({
        xp: bt.xpReward,
        gold: bt.goldReward,
        leveledUp: res.leveledUp,
        newLevel: res.newLevel,
      });
      checkSecretUnlocksOnVictory(redeemed);
    },
    [checkSecretUnlocksOnVictory]
  );

  const triggerDodge = useCallback(() => {
    const s = simRef.current;
    if (s.player.dodgeCd > 0) return;

    s.player.dodgeTimer = 0.36;
    s.player.parryWindow = 0.42;
    s.player.dodgeCd = 2.0;

    const yaw = engineRef.current?.getCameraYaw() ?? 0;
    let ix = dpadDirRef.current.dx;
    let iy = dpadDirRef.current.dy;
    if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) iy -= 1;
    if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) iy += 1;
    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) ix -= 1;
    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) ix += 1;

    let dx = ix * Math.cos(yaw) + iy * Math.sin(yaw);
    let dy = -ix * Math.sin(yaw) + iy * Math.cos(yaw);

    if (Math.hypot(dx, dy) < 0.05) {
      const ang = Math.atan2(s.player.y - s.boss.y, s.player.x - s.boss.x);
      dx = Math.cos(ang);
      dy = Math.sin(ang);
    } else {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    s.player.x = Math.max(36, Math.min(ARENA_SIM_W - 36, s.player.x + dx * 88));
    s.player.y = Math.max(36, Math.min(ARENA_SIM_H - 36, s.player.y + dy * 88));
    engineRef.current?.spawnVfx({
      kind: 'dodge',
      fromX: s.player.x,
      fromY: s.player.y,
      toX: s.player.x,
      toY: s.player.y,
      color: '#38BDF8',
    });
    addFloat(s.player.x, s.player.y, 'ESQUIVA', '#38BDF8', 12);
    soundEngine.playParry();
  }, []);

  const castBasicAttack = useCallback(() => {
    const s = simRef.current;
    if (!s.running) return;
    const { baseClass: bc, subclass: sc, character: ch, bossTemplate: bt } = latestRef.current;
    const dist = Math.hypot(s.boss.x - s.player.x, s.boss.y - s.player.y);
    const isRanged = bc.id === 'mago' || bc.id === 'arqueiro';
    const maxBasicRange = isRanged ? 360 : 125;
    if (dist > maxBasicRange + bt.radius) {
      addFloat(s.player.x, s.player.y, 'Aproxime-se!', '#F59E0B', 11);
      return;
    }
    const atkStats = computeDerivedStats(bc, sc, ch);
    const dmg = Math.round(atkStats.attackPower * 0.68);
    s.boss.hp = Math.max(0, s.boss.hp - dmg);
    s.player.resource = Math.min(s.player.maxResource, s.player.resource + 6);
    soundEngine.playAttack();
    engineRef.current?.triggerPlayerAttackAnim();
    engineRef.current?.spawnVfx({
      kind: isRanged ? 'projectile' : 'slash',
      fromX: s.player.x,
      fromY: s.player.y,
      toX: s.boss.x,
      toY: s.boss.y,
      color: getSkinById(ch.skinId).glowColor,
    });
    addFloat(s.boss.x, s.boss.y, `${dmg}`, '#F8FAFC', 14);

    if (s.boss.hp <= 0) {
      s.running = false;
      setCombatState('victory');
      soundEngine.playVictory();
      pushLog(`Vitória! ${bt.name} foi derrotado!`, 'secret');
      handleWin(false);
    }
  }, [pushLog, handleWin]);

  const castAbility = useCallback(
    (slotIndex: number) => {
      const s = simRef.current;
      if (!s.running) return;
      const {
        equippedAbilities: eq,
        baseClass: bc,
        subclass: sc,
        character: ch,
        bossTemplate: bt,
      } = latestRef.current;
      const ability = eq[slotIndex];
      if (!ability) return;
      if (s.cooldowns[slotIndex] > 0) return;

      const freeRule = s.paradox.freeRuleTimer > 0;
      const effectiveCost = freeRule ? 0 : ability.cost;
      if (s.player.resource < effectiveCost) {
        addFloat(s.player.x, s.player.y, `Sem ${bc.resource}`, '#F59E0B', 12);
        return;
      }

      const liveStats = computeDerivedStats(bc, sc, ch);
      s.player.resource = Math.max(0, s.player.resource - effectiveCost);
      if (s.player.resource / s.player.maxResource < 0.15) {
        if (!s.player.wasLowMana) {
          s.player.lowManaCount += 1;
          s.player.wasLowMana = true;
        }
      } else {
        s.player.wasLowMana = false;
      }

      const subCdr = sc?.id === 'cronomante' ? 0.8 : 1;
      const agiCdr = 1 - liveStats.cdrBonus;
      s.cooldowns[slotIndex] = Math.max(0.5, ability.cooldown * subCdr * agiCdr);

      const inversionActive =
        s.paradox.inversionTimer > 0 || s.boss.paradoxInversionTimer > 0;
      const atkMult =
        (liveStats.attackPower +
          (s.paradox.attributeBoostTimer > 0 ? 90 : 0) +
          (s.paradox.retroActiveTimer > 0 ? 85 : 0)) /
        100;

      const hpRatio = s.player.hp / s.player.maxHp;
      const berserkMult = sc?.id === 'berserker' ? 1 + (1 - hpRatio) * 0.65 : 1;
      const distToBoss = Math.hypot(s.boss.x - s.player.x, s.boss.y - s.player.y);
      const effectiveRange = freeRule ? 999 : ability.range;

      engineRef.current?.triggerPlayerAttackAnim();

      if (ability.kind === 'paradox' && ability.paradoxKey) {
        soundEngine.playParadox();
        s.paradox.banner = `${ability.name.toUpperCase()} ATIVADA`;
        s.paradox.bannerTimer = 4.5;
        engineRef.current?.spawnVfx({
          kind: 'paradox',
          fromX: s.player.x,
          fromY: s.player.y,
          toX: s.boss.x,
          toY: s.boss.y,
          color: '#C084FC',
          scale: 1.5,
        });

        switch (ability.paradoxKey) {
          case 'cause_effect_inversion':
            s.paradox.inversionTimer = 5.5;
            pushLog('PARADOXO: Inversão de Causa e Efeito! Dano ⇄ Cura por 5s!', 'paradox');
            break;
          case 'hp_bar_swap': {
            const pPct = s.player.hp / s.player.maxHp;
            const bPct = s.boss.hp / s.boss.maxHp;
            const avgPct = (pPct + bPct) / 2;
            s.player.hp = Math.min(
              s.player.maxHp,
              Math.max(50, Math.round(s.player.maxHp * Math.max(pPct, avgPct)))
            );
            s.boss.hp = Math.max(100, Math.round(s.boss.maxHp * Math.min(bPct, avgPct)));
            pushLog(`PARADOXO: Troca de Barras equilibrou HP em ${Math.round(avgPct * 100)}%!`, 'paradox');
            break;
          }
          case 'cooldown_theft':
            s.cooldowns = s.cooldowns.map((c, idx) => (idx === slotIndex ? c : 0));
            s.boss.frozenTimer = 4.0;
            pushLog('PARADOXO: Recargas zeradas e inimigo congelado por 4s!', 'paradox');
            break;
          case 'gravity_flip':
            s.paradox.gravityFlipTimer = 4.5;
            s.boss.hp = Math.max(0, s.boss.hp - Math.round(280 * atkMult));
            pushLog('PARADOXO: Gravidade Invertida! Golpes inimigos se voltam contra ele.', 'paradox');
            break;
          case 'retroactive_damage':
            s.paradox.retroActiveTimer = 5.0;
            s.player.hp = Math.min(s.player.maxHp, s.player.hp + 380);
            pushLog('PARADOXO: Dano Retroativo restaurou vida e dobrou seu dano!', 'paradox');
            break;
          case 'attribute_inversion':
            s.paradox.attributeBoostTimer = 6.0;
            pushLog('PARADOXO: O Fraco Governa ampliou seu ataque!', 'paradox');
            break;
          case 'undo_death': {
            const snap = s.snapshots[0];
            if (snap) {
              s.player.hp = Math.max(s.player.hp, snap.playerHp);
              s.player.x = snap.playerX;
              s.player.y = snap.playerY;
            } else {
              s.player.hp = Math.min(s.player.maxHp, s.player.hp + 450);
            }
            pushLog('PARADOXO: Desfazer Morte restaurou a linha temporal!', 'paradox');
            break;
          }
          case 'element_inversion':
            s.boss.vulnerabilityMult = 2.4;
            s.boss.vulnerabilityTimer = 5.5;
            s.boss.hp = Math.max(0, s.boss.hp - Math.round(420 * atkMult));
            pushLog('PARADOXO: Resistências convertidas em fraqueza crítica!', 'paradox');
            break;
          case 'body_swap':
            s.paradox.bodySwapTimer = 4.0;
            s.clones = [];
            s.boss.hp = Math.max(0, s.boss.hp - Math.round(540 * atkMult));
            pushLog('PARADOXO: Transferência de Existência destruiu reflexos inimigos!', 'paradox');
            break;
          case 'erase_rule':
            s.paradox.freeRuleTimer = 5.5;
            s.player.resource = s.player.maxResource;
            s.boss.hp = Math.max(0, s.boss.hp - Math.round(520 * atkMult));
            pushLog('PARADOXO: Comando do Arquiteto! Custo e alcance removidos por 5.5s!', 'paradox');
            break;
        }
        return;
      }

      if (ability.kind === 'heal') {
        soundEngine.playHeal();
        const healAmount = Math.round(ability.power * (0.8 + atkMult * 0.35));
        engineRef.current?.spawnVfx({
          kind: 'heal',
          fromX: s.player.x,
          fromY: s.player.y,
          toX: s.player.x,
          toY: s.player.y,
          color: '#34D399',
        });

        if (
          (bt.id === 'malakor' || bt.id === 'arauto_solenis') &&
          s.boss.hp / s.boss.maxHp <= 0.22
        ) {
          s.running = false;
          setCombatState('redeemed');
          soundEngine.playSecretUnlock();
          addFloat(s.boss.x, s.boss.y, 'ALMA PURIFICADA!', '#D4A853', 19);
          pushLog(
            `Você lançou ${ability.name} sobre ${bt.name} e purificou sua alma!`,
            'secret'
          );
          handleWin(true);
          return;
        }

        if (inversionActive) {
          s.boss.hp = Math.max(0, s.boss.hp - Math.round(healAmount * 1.35));
          addFloat(s.boss.x, s.boss.y, `-${Math.round(healAmount * 1.35)} INVERTIDO!`, '#C084FC', 16);
        } else {
          s.player.hp = Math.min(s.player.maxHp, s.player.hp + healAmount);
          s.allies.forEach((a) => {
            if (a.hp > 0) a.hp = Math.min(a.maxHp, a.hp + healAmount);
          });
          addFloat(s.player.x, s.player.y, `+${healAmount} HP`, '#34D399', 15);
          pushLog(`${ability.name} restaurou ${healAmount} de vida.`, 'heal');
        }
        return;
      }

      if (ability.kind === 'shield') {
        soundEngine.playParry();
        const shieldVal = Math.round(ability.power * (0.85 + atkMult * 0.25));
        s.player.shield += shieldVal;
        s.player.parryWindow = Math.max(s.player.parryWindow, 0.75);
        engineRef.current?.spawnVfx({
          kind: 'shield',
          fromX: s.player.x,
          fromY: s.player.y,
          toX: s.player.x,
          toY: s.player.y,
          color: '#38BDF8',
        });
        addFloat(s.player.x, s.player.y, `+${shieldVal} ESCUDO`, '#38BDF8', 14);
        return;
      }

      if (ability.kind === 'buff') {
        soundEngine.playCast();
        s.player.resource = Math.min(s.player.maxResource, s.player.resource + 18);
        s.player.shield += Math.round(ability.power * 0.45);
        s.paradox.attributeBoostTimer = Math.max(s.paradox.attributeBoostTimer, 3.0);
        engineRef.current?.spawnVfx({
          kind: 'nova',
          fromX: s.player.x,
          fromY: s.player.y,
          toX: s.player.x,
          toY: s.player.y,
          color: '#FBBF24',
        });
        addFloat(s.player.x, s.player.y, `${ability.name}!`, '#FBBF24', 14);
        return;
      }

      if (effectiveRange > 0 && distToBoss > effectiveRange + bt.radius + 45) {
        addFloat(s.player.x, s.player.y, 'Fora de alcance! Aproxime-se', '#F59E0B', 12);
        s.cooldowns[slotIndex] = 0.4;
        return;
      }

      soundEngine.playAttack();
      const isCrit = Math.random() < liveStats.critChance;
      const rawDmg = Math.round(
        ability.power *
          atkMult *
          berserkMult *
          s.boss.vulnerabilityMult *
          (isCrit ? 1.55 : 1)
      );

      engineRef.current?.spawnVfx({
        kind: ability.aoeRadius > 75 ? 'nova' : ability.range > 180 ? 'projectile' : 'slash',
        fromX: ability.aoeRadius > 75 ? s.boss.x : s.player.x,
        fromY: ability.aoeRadius > 75 ? s.boss.y : s.player.y,
        toX: s.boss.x,
        toY: s.boss.y,
        color: getSkinById(ch.skinId).glowColor,
        scale: isCrit ? 1.35 : 1.0,
      });

      if (inversionActive) {
        const healAmt = Math.round(rawDmg * 0.75);
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + healAmt);
        addFloat(s.player.x, s.player.y, `+${healAmt} (Dano→Cura!)`, '#34D399', 15);
        return;
      }

      s.boss.hp = Math.max(0, s.boss.hp - rawDmg);
      addFloat(
        s.boss.x + (Math.random() - 0.5) * 20,
        s.boss.y,
        `${rawDmg}${isCrit ? '!' : ''}`,
        isCrit ? '#F59E0B' : '#F8FAFC',
        isCrit ? 18 : 15
      );

      if (ability.tags.includes('Veneno')) {
        s.boss.poisonTimer = 6;
        s.boss.poisonStacks = Math.min(5, s.boss.poisonStacks + 1);
      }
      if (ability.tags.includes('Sangramento')) {
        s.boss.bleedTimer = 6;
        s.boss.bleedStacks = Math.min(5, s.boss.bleedStacks + 1);
      }
      if (ability.kind === 'control') {
        s.boss.frozenTimer = Math.max(s.boss.frozenTimer, 1.4);
      }
      if (sc?.id === 'tirano_sangue' || ability.tags.includes('Roubo de Vida')) {
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + Math.round(rawDmg * 0.25));
      }

      s.clones = s.clones.filter((c) => c.hp - rawDmg > 0);
      pushLog(`${ability.name} causou ${rawDmg} de dano${isCrit ? ' crítico' : ''}.`, 'damage');

      if (s.boss.hp <= 0) {
        s.running = false;
        setCombatState('victory');
        soundEngine.playVictory();
        pushLog(`Vitória! ${bt.name} foi derrotado!`, 'secret');
        handleWin(false);
      }
    },
    [pushLog, handleWin]
  );

  // Keyboard bindings (WASD + Arrows + Q/E camera rotate + Space Dodge + F Attack + 1-6 Skills)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }
      keysRef.current[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerDodge();
      }
      if (e.code === 'KeyF') {
        castBasicAttack();
      }
      const digitMap: Record<string, number> = {
        Digit1: 0,
        Digit2: 1,
        Digit3: 2,
        Digit4: 3,
        Digit5: 4,
        Digit6: 5,
      };
      if (digitMap[e.code] !== undefined) {
        castAbility(digitMap[e.code]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [triggerDodge, castBasicAttack, castAbility]);

  // Update 3D player appearance when skin or class changes
  useEffect(() => {
    engineRef.current?.updatePlayerAppearance(baseClass.id, activeSkin);
  }, [baseClass.id, activeSkin]);

  // Update 3D enemy appearance when enemy changes
  useEffect(() => {
    engineRef.current?.updateEnemyAppearance(bossTemplate);
  }, [bossTemplate]);

  // Sync camera preset
  useEffect(() => {
    engineRef.current?.setCameraPreset(cameraPreset);
  }, [cameraPreset]);

  // Mount Three.js 3D Arena + Continuous Game Loop
  useEffect(() => {
    const mount = threeMountRef.current;
    if (!mount) return;

    const engine = new Arena3DEngine(
      mount,
      latestRef.current.baseClass.id,
      getSkinById(latestRef.current.character.skinId),
      latestRef.current.bossTemplate,
      (simX, simY) => {
        moveTargetRef.current = { x: simX, y: simY };
      }
    );
    engineRef.current = engine;

    const ro = new ResizeObserver(() => {
      engine.resize();
      const ov = overlayCanvasRef.current;
      if (ov && mount) {
        ov.width = mount.clientWidth;
        ov.height = mount.clientHeight;
      }
    });
    ro.observe(mount);
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = mount.clientWidth;
      overlayCanvasRef.current.height = mount.clientHeight;
    }

    let timerId = 0;
    let lastTime = performance.now();
    let hudAccum = 0;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const s = simRef.current;
      const { baseClass: bc, subclass: sc, character: ch, bossTemplate: bt } = latestRef.current;
      const liveStats = computeDerivedStats(bc, sc, ch);

      // Camera rotation Q/E
      if (keysRef.current['KeyQ']) engine.rotateYaw(-1.8 * dt);
      if (keysRef.current['KeyE']) engine.rotateYaw(1.8 * dt);

      // Always allow smooth 3D movement (in ready & fighting!)
      s.elapsed += dt;
      s.player.maxHp = liveStats.maxHp;
      s.player.maxResource = liveStats.maxResource;

      let ix = dpadDirRef.current.dx;
      let iy = dpadDirRef.current.dy;
      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) iy -= 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) iy += 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) ix -= 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) ix += 1;

      let vx = 0;
      let vy = 0;
      let isPlayerMoving = false;

      if (Math.hypot(ix, iy) > 0.05) {
        moveTargetRef.current = null;
        const len = Math.hypot(ix, iy);
        ix /= len;
        iy /= len;
        const yaw = engine.getCameraYaw();
        vx = ix * Math.cos(yaw) + iy * Math.sin(yaw);
        vy = -ix * Math.sin(yaw) + iy * Math.cos(yaw);
        isPlayerMoving = true;
      } else if (moveTargetRef.current) {
        const dx = moveTargetRef.current.x - s.player.x;
        const dy = moveTargetRef.current.y - s.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          vx = dx / dist;
          vy = dy / dist;
          isPlayerMoving = true;
        } else {
          moveTargetRef.current = null;
        }
      }

      if (isPlayerMoving) {
        s.player.x = Math.max(
          28,
          Math.min(ARENA_SIM_W - 28, s.player.x + vx * liveStats.moveSpeed * dt)
        );
        s.player.y = Math.max(
          28,
          Math.min(ARENA_SIM_H - 28, s.player.y + vy * liveStats.moveSpeed * dt)
        );
      }

      s.player.dodgeTimer = Math.max(0, s.player.dodgeTimer - dt);
      s.player.dodgeCd = Math.max(0, s.player.dodgeCd - dt);
      s.player.parryWindow = Math.max(0, s.player.parryWindow - dt);

      let isBossMoving = false;

      if (s.running) {
        s.player.resource = Math.min(s.player.maxResource, s.player.resource + 9.5 * dt);
        s.cooldowns = s.cooldowns.map((c) => Math.max(0, c - dt));
        if (s.player.hp / s.player.maxHp < 0.15) s.player.lowHpTriggered = true;

        s.paradox.inversionTimer = Math.max(0, s.paradox.inversionTimer - dt);
        s.paradox.gravityFlipTimer = Math.max(0, s.paradox.gravityFlipTimer - dt);
        s.paradox.freeRuleTimer = Math.max(0, s.paradox.freeRuleTimer - dt);
        s.paradox.attributeBoostTimer = Math.max(0, s.paradox.attributeBoostTimer - dt);
        s.paradox.retroActiveTimer = Math.max(0, s.paradox.retroActiveTimer - dt);
        s.paradox.bodySwapTimer = Math.max(0, s.paradox.bodySwapTimer - dt);
        s.paradox.bannerTimer = Math.max(0, s.paradox.bannerTimer - dt);
        if (s.paradox.bannerTimer <= 0) s.paradox.banner = '';

        s.snapshotAccum += dt;
        if (s.snapshotAccum >= 1.0) {
          s.snapshotAccum = 0;
          s.snapshots.push({
            playerHp: s.player.hp,
            playerX: s.player.x,
            playerY: s.player.y,
            bossHp: s.boss.hp,
            alliesHp: s.allies.map((a) => a.hp),
          });
          if (s.snapshots.length > 4) s.snapshots.shift();
        }

        s.boss.frozenTimer = Math.max(0, s.boss.frozenTimer - dt);
        s.boss.vulnerabilityTimer = Math.max(0, s.boss.vulnerabilityTimer - dt);
        s.boss.paradoxInversionTimer = Math.max(0, s.boss.paradoxInversionTimer - dt);
        if (s.boss.vulnerabilityTimer <= 0) s.boss.vulnerabilityMult = 1;

        if (s.boss.poisonTimer > 0) {
          s.boss.poisonTimer -= dt;
          s.boss.hp = Math.max(0, s.boss.hp - s.boss.poisonStacks * 20 * dt);
        } else {
          s.boss.poisonStacks = 0;
        }
        if (s.boss.bleedTimer > 0) {
          s.boss.bleedTimer -= dt;
          s.boss.hp = Math.max(0, s.boss.hp - s.boss.bleedStacks * 22 * dt);
        } else {
          s.boss.bleedStacks = 0;
        }

        const bossPct = (s.boss.hp / s.boss.maxHp) * 100;
        const targetPhaseObj = [...bt.phases].reverse().find((p) => bossPct <= p.hpThreshold);
        if (targetPhaseObj && targetPhaseObj.phase > s.boss.phase) {
          s.boss.phase = targetPhaseObj.phase;
          pushLog(`${bt.name} entrou em ${targetPhaseObj.name}!`, 'boss');
          addFloat(s.boss.x, s.boss.y, targetPhaseObj.name, '#F59E0B', 15);
          soundEngine.playBossWarn();
        }

        if (s.boss.frozenTimer <= 0) {
          const bdx = s.player.x - s.boss.x;
          const bdy = s.player.y - s.boss.y;
          const bdist = Math.hypot(bdx, bdy);
          if (bdist > 82) {
            s.boss.x += (bdx / bdist) * bt.speed * 0.65 * dt;
            s.boss.y += (bdy / bdist) * bt.speed * 0.65 * dt;
            isBossMoving = true;
          }

          s.boss.attackTimer -= dt;
          if (s.boss.attackTimer <= 0) {
            s.boss.attackTimer = bt.category === 'Monstro Comum' ? 2.9 : s.boss.phase >= 3 ? 2.1 : 2.7;
            soundEngine.playBossWarn();
            engine.triggerEnemyAttackAnim();
            const angle = Math.atan2(s.player.y - s.boss.y, s.player.x - s.boss.x);
            if (Math.random() < 0.55) {
              s.telegraphs.push({
                id: s.nextId++,
                kind: 'circle',
                x: s.player.x,
                y: s.player.y,
                radius: bt.category === 'Monstro Comum' ? 62 : 76,
                timer: 0,
                duration: 1.45,
                damage: bt.attack,
                color: bt.accentColor,
              });
            } else {
              s.telegraphs.push({
                id: s.nextId++,
                kind: 'cone',
                x: s.boss.x,
                y: s.boss.y,
                radius: bt.category === 'Monstro Comum' ? 135 : 175,
                angle,
                spread: 0.9,
                timer: 0,
                duration: 1.35,
                damage: Math.round(bt.attack * 1.15),
                color: '#EF4444',
              });
            }
          }

          if (bt.category !== 'Monstro Comum') {
            s.boss.specialTimer -= dt;
            if (s.boss.specialTimer <= 0) {
              s.boss.specialTimer = 6.2;
              engine.triggerEnemyAttackAnim();
              s.telegraphs.push({
                id: s.nextId++,
                kind: 'circle',
                x: s.boss.x,
                y: s.boss.y,
                radius: 125,
                timer: 0,
                duration: 1.6,
                damage: Math.round(bt.attack * 1.2),
                color: bt.accentColor,
              });
            }
          }
        }

        s.telegraphs = s.telegraphs.filter((t) => {
          t.timer += dt;
          if (t.timer >= t.duration && !t.hitApplied) {
            t.hitApplied = true;
            if (s.paradox.gravityFlipTimer > 0 || s.paradox.bodySwapTimer > 0) {
              s.boss.hp = Math.max(0, s.boss.hp - t.damage);
              addFloat(s.boss.x, s.boss.y, `-${t.damage} REFLETIDO!`, '#C084FC', 15);
              return false;
            }

            let playerInside = false;
            const pd = Math.hypot(s.player.x - t.x, s.player.y - t.y);
            if (t.kind === 'circle' && pd <= t.radius + s.player.radius * 0.5) {
              playerInside = true;
            } else if (t.kind === 'cone' && pd <= t.radius && t.angle !== undefined) {
              const angToP = Math.atan2(s.player.y - t.y, s.player.x - t.x);
              let diff = Math.abs(angToP - t.angle);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;
              if (diff <= (t.spread ?? 0.9) / 2) playerInside = true;
            }

            if (playerInside) {
              if (s.player.parryWindow > 0 || s.player.dodgeTimer > 0) {
                s.player.parriesLanded += 1;
                s.player.resource = Math.min(s.player.maxResource, s.player.resource + 22);
                addFloat(s.player.x, s.player.y, 'APARADO!', '#38BDF8', 16);
                soundEngine.playParry();
              } else if (s.paradox.inversionTimer > 0) {
                const healVal = Math.round(t.damage * 0.7);
                s.player.hp = Math.min(s.player.maxHp, s.player.hp + healVal);
                addFloat(s.player.x, s.player.y, `+${healVal} INVERTIDO`, '#34D399', 15);
              } else {
                s.player.hitsTakenFromTelegraph += 1;
                const mitigated = Math.max(8, t.damage - Math.round(liveStats.defense * 0.6));
                const shieldAbsorb = Math.min(s.player.shield, mitigated);
                s.player.shield -= shieldAbsorb;
                const finalDmg = mitigated - shieldAbsorb;
                s.player.hp = Math.max(0, s.player.hp - finalDmg);
                addFloat(s.player.x, s.player.y, `-${finalDmg}`, '#EF4444', 16);
                if (s.player.hp <= 0) {
                  s.running = false;
                  setCombatState('defeat');
                  pushLog(`Você caiu diante de ${bt.name}.`, 'boss');
                }
              }
            }
            return false;
          }
          return true;
        });

        s.allies.forEach((ally) => {
          if (ally.hp <= 0) return;
          ally.cooldown -= dt;
          const targetX = ally.role === 'Tank' ? s.boss.x - 65 : s.player.x - 50;
          const targetY = ally.role === 'Tank' ? s.boss.y - 25 : s.player.y + 55;
          const dx = targetX - ally.x;
          const dy = targetY - ally.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 14) {
            ally.x += (dx / dist) * 125 * dt;
            ally.y += (dy / dist) * 125 * dt;
          }
          if (ally.cooldown <= 0) {
            if (ally.role === 'Tank') {
              ally.cooldown = 2.1;
              if (Math.hypot(s.boss.x - ally.x, s.boss.y - ally.y) < 120) {
                const dmg = Math.round(35 + ch.level * 2.5);
                s.boss.hp = Math.max(0, s.boss.hp - dmg);
                addFloat(s.boss.x + 14, s.boss.y, `${dmg}`, '#D97706', 12);
              }
            } else {
              ally.cooldown = 3.8;
              if (s.player.hp < s.player.maxHp * 0.85) {
                const heal = Math.round(65 + ch.level * 4);
                s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
                addFloat(s.player.x, s.player.y, `+${heal} Lyra`, '#D4A853', 12);
              }
            }
          }
        });

        if (s.boss.hp <= 0 && s.running) {
          s.running = false;
          setCombatState('victory');
          soundEngine.playVictory();
          pushLog(`Vitória! ${bt.name} foi derrotado!`, 'secret');
          handleWin(false);
        }
      }

      s.floatTexts = s.floatTexts.filter((f) => {
        f.life -= dt;
        return f.life > 0;
      });

      // Render 3D Scene
      engine.syncAndRender(dt, {
        elapsed: s.elapsed,
        running: s.running,
        player: {
          x: s.player.x,
          y: s.player.y,
          hp: s.player.hp,
          maxHp: s.player.maxHp,
          shield: s.player.shield,
          dodgeTimer: s.player.dodgeTimer,
          parryWindow: s.player.parryWindow,
          isMoving: isPlayerMoving,
          vx,
          vy,
        },
        boss: {
          x: s.boss.x,
          y: s.boss.y,
          hp: s.boss.hp,
          maxHp: s.boss.maxHp,
          frozenTimer: s.boss.frozenTimer,
          vulnerabilityTimer: s.boss.vulnerabilityTimer,
          isMoving: isBossMoving,
        },
        allies: s.allies.map((a) => ({
          id: a.id,
          role: a.role,
          x: a.x,
          y: a.y,
          hp: a.hp,
          color: a.color,
        })),
        telegraphs: s.telegraphs.map((t) => ({
          id: t.id,
          kind: t.kind,
          x: t.x,
          y: t.y,
          radius: t.radius,
          angle: t.angle,
          spread: t.spread,
          pct: Math.min(1, t.timer / t.duration),
          color: t.color,
        })),
        moveTarget: moveTargetRef.current,
        inversionActive: s.paradox.inversionTimer > 0 || s.boss.paradoxInversionTimer > 0,
      });

      // Draw crisp projected 2D nameplates & floating numbers over 3D units
      const ov = overlayCanvasRef.current;
      if (ov && ov.width > 0 && ov.height > 0) {
        const ctx = ov.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, ov.width, ov.height);

          const pScreen = engine.projectSimToScreen(s.player.x, s.player.y, 2.55, ov.width, ov.height);
          ctx.save();
          ctx.font = '600 12px Plus Jakarta Sans, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#F8FAFC';
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 4;
          ctx.fillText(`${ch.name} (Nv.${ch.level})`, pScreen.x, pScreen.y);

          const bScreen = engine.projectSimToScreen(s.boss.x, s.boss.y, 3.0, ov.width, ov.height);
          ctx.font = '700 13px Cinzel, serif';
          ctx.fillStyle = '#F5E6C4';
          ctx.fillText(`${bt.name.split(',')[0]} (Nv.${bt.recommendedLevel})`, bScreen.x, bScreen.y);

          s.floatTexts.forEach((f) => {
            const age = 1 - f.life / f.maxLife;
            const scr = engine.projectSimToScreen(f.x, f.y, 2.2 + age * 1.4, ov.width, ov.height);
            ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
            ctx.fillStyle = f.color;
            ctx.font = `700 ${f.size}px JetBrains Mono, monospace`;
            ctx.fillText(f.text, scr.x, scr.y);
          });
          ctx.restore();
        }
      }

      hudAccum += dt;
      if (hudAccum >= 0.065) {
        hudAccum = 0;
        const phaseObj = bt.phases.find((p) => p.phase === s.boss.phase);
        setHud({
          playerHp: Math.round(s.player.hp),
          playerMaxHp: s.player.maxHp,
          playerShield: Math.round(s.player.shield),
          resource: Math.round(s.player.resource),
          maxResource: s.player.maxResource,
          bossHp: Math.round(s.boss.hp),
          bossMaxHp: s.boss.maxHp,
          bossPhase: s.boss.phase,
          bossPhaseName: phaseObj?.name ?? `Fase ${s.boss.phase}`,
          cooldowns: [...s.cooldowns],
          dodgeCd: s.player.dodgeCd,
          paradoxBanner: s.paradox.banner,
          paradoxTimer: s.paradox.bannerTimer,
          inversionActive: s.paradox.inversionTimer > 0 || s.boss.paradoxInversionTimer > 0,
          bossPoisonStacks: s.boss.poisonStacks,
          bossBleedStacks: s.boss.bleedStacks,
          parriesLanded: s.player.parriesLanded,
          allies: s.allies.map((a) => ({
            name: a.name,
            hp: Math.round(a.hp),
            maxHp: a.maxHp,
            role: a.role,
          })),
        });
      }

      if (engine.isSoftwareMode()) {
        timerId = window.setTimeout(tick, 80);
      } else {
        timerId = requestAnimationFrame(tick);
      }
    };

    if (engine.isSoftwareMode()) {
      timerId = window.setTimeout(tick, 40);
    } else {
      timerId = requestAnimationFrame(tick);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(timerId);
      clearTimeout(timerId);
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [pushLog, handleWin]);

  const toggleMute = () => {
    soundEngine.muted = !soundEngine.muted;
    setMuted(soundEngine.muted);
  };

  const currentIdx = ALL_ENCOUNTERS.findIndex((e) => e.id === bossTemplate.id);
  const nextEncounter =
    currentIdx >= 0 && currentIdx < ALL_ENCOUNTERS.length - 1
      ? ALL_ENCOUNTERS[currentIdx + 1]
      : null;

  const xpNeeded = getXpForNextLevel(character.level);
  const xpPct = Math.min(100, Math.round((character.xp / xpNeeded) * 100));

  const availableSkins = character.sandboxMode
    ? SKINS
    : SKINS.filter((sk) => character.unlockedSkins.includes(sk.id));

  return (
    <div className="space-y-4">
      {/* Arena Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#131822] px-4 py-3 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-slate-300">
            <span className="font-semibold text-[#F5E6C4]">{character.name}</span>
            <span className="mx-1.5 text-slate-500">·</span>
            <span className="font-mono text-xs text-sky-400">Nv. {character.level}</span>
            <span className="mx-1.5 text-slate-500">·</span>
            <span>{baseClass.name}</span>
            {subclass && (
              <>
                <span className="mx-1.5 text-slate-500">/</span>
                <span className={subclass.isSecret ? 'text-[#C084FC]' : 'text-[#D4A853]'}>
                  {subclass.name}
                </span>
              </>
            )}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Alvo:</span>
            <select
              value={bossTemplate.id}
              onChange={(e) => onSelectBoss(e.target.value)}
              className="bg-[#0B0E14] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4A853]"
            >
              <optgroup label="Monstros Iniciais e Elites (Nv. 1–14)">
                {ALL_ENCOUNTERS.filter(
                  (b) => b.category === 'Monstro Comum' || b.category === 'Elite'
                ).map((b) => (
                  <option key={b.id} value={b.id}>
                    [Nv.{b.recommendedLevel}] {b.name} — {b.maxHp} HP
                  </option>
                ))}
              </optgroup>
              <optgroup label="Subchefes (Nv. 18–30)">
                {ALL_ENCOUNTERS.filter((b) => b.category === 'Subchefe').map((b) => (
                  <option key={b.id} value={b.id}>
                    [Nv.{b.recommendedLevel}] {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Chefes Principais & Raid (Nv. 34–60)">
                {ALL_ENCOUNTERS.filter(
                  (b) => b.category === 'Chefe Principal' || b.category === 'Chefe Final'
                ).map((b) => (
                  <option key={b.id} value={b.id}>
                    [Nv.{b.recommendedLevel}] {b.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          {/* Quick 3D Skin Switcher */}
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Skin 3D:</span>
            <select
              value={character.skinId}
              onChange={(e) => onSelectSkin(e.target.value)}
              className="bg-[#0B0E14] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#D4A853]"
            >
              {availableSkins.map((sk) => (
                <option key={sk.id} value={sk.id}>
                  {sk.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenSkinsTab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-[#1A202E] text-slate-200 hover:border-[#D4A853]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-[#D4A853]" />
            Loja de Skins
          </button>

          <button
            type="button"
            onClick={() => setPartyMode((m) => (m === 'group' ? 'solo' : 'group'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-[#1A202E] text-slate-200 hover:border-[#D4A853]/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {partyMode === 'group' ? (
              <Users className="w-3.5 h-3.5 text-[#D4A853]" />
            ) : (
              <User className="w-3.5 h-3.5 text-slate-400" />
            )}
            {partyMode === 'group' ? 'Grupo' : 'Solo'}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-[#1A202E] text-slate-200 hover:border-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#D4A853]" />
            )}
          </button>

          {combatState === 'fighting' ? (
            <button
              type="button"
              onClick={() => resetEncounter(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              Parar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => resetEncounter(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              {combatState === 'ready' ? 'Iniciar Combate' : 'Lutar Novamente'}
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Center 3D Viewport */}
        <div className="lg:col-span-9 space-y-4">
          {/* Enemy Header */}
          <div className="border border-white/10 bg-[#131822] rounded-xl p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-[#D4A853]">
                    Nv. {bossTemplate.recommendedLevel}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{bossTemplate.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{bossTemplate.regionName}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-100 mt-0.5">
                  {bossTemplate.name}
                </h2>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-sm font-semibold text-slate-100">
                  {hud.bossHp.toLocaleString('pt-BR')} / {hud.bossMaxHp.toLocaleString('pt-BR')} HP
                </div>
                <div className="text-xs text-slate-400">
                  Recompensa: +{bossTemplate.xpReward} XP · +{bossTemplate.goldReward} Ouro
                </div>
              </div>
            </div>

            <div className="w-full h-3 bg-[#0B0E14] rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%`,
                  backgroundColor: bossTemplate.accentColor,
                }}
              />
            </div>

            {hud.inversionActive && (
              <div className="text-xs font-semibold text-[#C084FC] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                INVERSÃO ATIVA: DANO ⇄ CURA
              </div>
            )}
          </div>

          {/* 3D WebGL Arena Container (No backdrop-blur over WebGL!) */}
          <div className="relative border border-white/10 bg-[#0B101B] rounded-xl overflow-hidden select-none">
            {hud.paradoxBanner && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-lg bg-[#2E1065] border border-[#C084FC]/60 text-xs font-mono font-semibold text-[#F3E8FF]">
                {hud.paradoxBanner}
              </div>
            )}

            {/* Dedicated WebGL Mount */}
            <div ref={threeMountRef} className="w-full h-[460px] cursor-crosshair" />

            {/* Projected Floating Numbers & Nameplates */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Bottom 3D Camera & Movement Controls Dock (unobstructed center!) */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5 bg-[#0B0E14]/90 border border-white/15 rounded-lg px-2.5 py-1.5 pointer-events-auto">
                <Camera className="w-3.5 h-3.5 text-[#D4A853]" />
                {(
                  [
                    { id: 'isometric', label: 'Isométrica' },
                    { id: 'thirdPerson', label: '3ª Pessoa' },
                    { id: 'topDown', label: 'Tática' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => setCameraPreset(cam.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-[#D4A853] text-[#0B0E14] font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => engineRef.current?.rotateYaw(-0.45)}
                  title="Girar câmera à esquerda (Q)"
                  className="p-1 text-slate-300 hover:text-[#D4A853] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.rotateYaw(0.45)}
                  title="Girar câmera à direita (E)"
                  className="p-1 text-slate-300 hover:text-[#D4A853] cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDpad((v) => !v)}
                  className="px-2 py-1 text-[11px] font-medium rounded border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                >
                  {showDpad ? 'Ocultar Pad' : 'Controle Tela'}
                </button>
              </div>

              {combatState === 'ready' && (
                <div className="flex items-center gap-3 bg-[#0B0E14]/92 border border-[#D4A853]/50 rounded-lg px-3.5 py-1.5 pointer-events-auto">
                  <span className="text-[11px] text-slate-300 hidden sm:inline">
                    Mova com WASD ou clique no chão 3D · Botão direito gira câmera
                  </span>
                  <button
                    type="button"
                    onClick={() => resetEncounter(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Iniciar Combate
                  </button>
                </div>
              )}
            </div>

            {/* Optional On-Screen Movement D-Pad */}
            {showDpad && (
              <div className="absolute bottom-16 left-4 z-10 grid grid-cols-3 gap-1 w-28 bg-[#0B0E14]/90 border border-white/15 p-1.5 rounded-xl">
                <div />
                <button
                  type="button"
                  onPointerDown={() => (dpadDirRef.current = { dx: 0, dy: -1 })}
                  onPointerUp={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  onPointerLeave={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  className="p-2 rounded bg-[#1A202E] text-slate-100 active:bg-[#D4A853] active:text-[#0B0E14] flex justify-center"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <div />
                <button
                  type="button"
                  onPointerDown={() => (dpadDirRef.current = { dx: -1, dy: 0 })}
                  onPointerUp={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  onPointerLeave={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  className="p-2 rounded bg-[#1A202E] text-slate-100 active:bg-[#D4A853] active:text-[#0B0E14] flex justify-center"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => (dpadDirRef.current = { dx: 0, dy: 1 })}
                  onPointerUp={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  onPointerLeave={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  className="p-2 rounded bg-[#1A202E] text-slate-100 active:bg-[#D4A853] active:text-[#0B0E14] flex justify-center"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => (dpadDirRef.current = { dx: 1, dy: 0 })}
                  onPointerUp={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  onPointerLeave={() => (dpadDirRef.current = { dx: 0, dy: 0 })}
                  className="p-2 rounded bg-[#1A202E] text-slate-100 active:bg-[#D4A853] active:text-[#0B0E14] flex justify-center"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* End-of-Encounter Overlays (Victory / Defeat / Redeemed - solid bg, no backdrop-blur) */}
            {(combatState === 'victory' ||
              combatState === 'defeat' ||
              combatState === 'redeemed') && (
              <div className="absolute inset-0 bg-[#0B0E14]/88 flex items-center justify-center p-6 z-20">
                <div className="max-w-md w-full border border-white/15 bg-[#131822] rounded-xl p-6 text-center space-y-4">
                  {combatState === 'victory' && (
                    <>
                      <p className="text-xs text-emerald-400 font-semibold">Vitória!</p>
                      <h3 className="font-display text-2xl font-bold text-slate-100">
                        {bossTemplate.name} Derrotado
                      </h3>
                      {victorySummary && (
                        <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10 text-xs font-mono tabular-nums space-y-1">
                          <div className="text-[#F5E6C4]">
                            +{victorySummary.xp} XP · +{victorySummary.gold} Ouro
                          </div>
                          {victorySummary.leveledUp && (
                            <div className="text-emerald-400 font-bold">
                              SUBIU PARA O NÍVEL {victorySummary.newLevel}! (+3 Pontos de Atributo, +1 Ponto de Habilidade)
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => resetEncounter(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-white/15 bg-[#1A202E] text-slate-100 hover:border-[#D4A853] cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Repetir
                        </button>
                        {nextEncounter && (
                          <button
                            type="button"
                            onClick={() => onSelectBoss(nextEncounter.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] cursor-pointer"
                          >
                            Próximo: {nextEncounter.name} (Nv.{nextEncounter.recommendedLevel})
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {combatState === 'redeemed' && (
                    <>
                      <p className="text-xs text-[#C084FC] font-semibold">
                        Final Secreto · Redenção do Crepúsculo
                      </p>
                      <h3 className="font-display text-2xl font-bold text-[#F5E6C4]">
                        {bossTemplate.name} Purificado
                      </h3>
                      <p className="text-sm text-slate-300">
                        Você canalizou cura na alma dividida em vez de destruí-la, despertando o caminho do Apóstolo do Crepúsculo!
                      </p>
                      <button
                        type="button"
                        onClick={() => resetEncounter(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] cursor-pointer"
                      >
                        Jogar Novamente
                      </button>
                    </>
                  )}

                  {combatState === 'defeat' && (
                    <>
                      <p className="text-xs text-rose-400 font-semibold">Derrota</p>
                      <h3 className="font-display text-2xl font-bold text-slate-100">
                        Você Caiu em Combate
                      </h3>
                      <p className="text-sm text-slate-300">
                        Se o inimigo for muito forte, cace monstros de nível menor para subir de nível e alocar atributos!
                      </p>
                      <button
                        type="button"
                        onClick={() => resetEncounter(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Tentar Novamente
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Player Bars & Skill Hotbar */}
          <div className="border border-white/10 bg-[#131822] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-200">
                    Vida {hud.playerShield > 0 ? `(+${hud.playerShield})` : ''}
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {hud.playerHp}/{hud.playerMaxHp}
                  </span>
                </div>
                <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-100"
                    style={{ width: `${Math.max(0, (hud.playerHp / hud.playerMaxHp) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-200">{baseClass.resource}</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {hud.resource}/{hud.maxResource}
                  </span>
                </div>
                <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-sky-500 transition-all duration-100"
                    style={{ width: `${Math.max(0, (hud.resource / hud.maxResource) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-200">XP (Nível {character.level})</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {character.xp}/{xpNeeded}
                  </span>
                </div>
                <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-[#D4A853] transition-all duration-200"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 6 Skill Slots + Basic Attack + Dodge */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
              <button
                type="button"
                onClick={castBasicAttack}
                disabled={combatState !== 'fighting'}
                className="flex flex-col justify-between p-2.5 rounded-lg border border-white/15 bg-[#161C28] hover:border-[#D4A853] text-left min-h-[74px] disabled:opacity-55 cursor-pointer"
              >
                <span className="font-mono text-[10px] text-[#D4A853]">[F]</span>
                <div className="text-xs font-semibold text-slate-100">Ataque Básico</div>
                <span className="text-[10px] text-emerald-400">+6 {baseClass.resource}</span>
              </button>

              {equippedAbilities.map((ab, idx) => {
                const cd = hud.cooldowns[idx] ?? 0;
                const onCd = cd > 0.05;
                if (!ab) {
                  return (
                    <button
                      key={`empty-${idx}`}
                      type="button"
                      onClick={() => onOpenGrimoireForSlot(idx)}
                      className="flex flex-col justify-between p-2.5 rounded-lg border border-dashed border-white/15 bg-[#0B0E14] hover:border-[#D4A853]/60 text-left min-h-[74px] cursor-pointer"
                    >
                      <span className="font-mono text-[10px] text-slate-500">[{idx + 1}]</span>
                      <div className="text-[11px] text-slate-400">Slot Vazio</div>
                      <span className="text-[10px] text-[#D4A853]">Equipar</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={`${ab.id}-${idx}`}
                    type="button"
                    onClick={() => castAbility(idx)}
                    disabled={combatState !== 'fighting' || onCd}
                    className={`flex flex-col justify-between p-2.5 rounded-lg border text-left min-h-[74px] cursor-pointer ${
                      ab.tier === 'Quebra-Jogo'
                        ? 'bg-[#1D1230] border-[#8B5CF6]/60'
                        : 'bg-[#0B0E14] border-white/10 hover:border-[#D4A853]/60'
                    } ${onCd || combatState !== 'fighting' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full font-mono text-[10px]">
                      <span className="text-slate-400">[{idx + 1}]</span>
                      <span className="text-sky-400">{ab.cost}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 leading-tight line-clamp-2">
                      {ab.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between w-full">
                      <span>{ab.tier}</span>
                      {onCd && (
                        <span className="font-mono text-[#F5E6C4] font-bold">
                          {cd.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={triggerDodge}
                disabled={hud.dodgeCd > 0.05}
                className="flex flex-col justify-between p-2.5 rounded-lg border border-sky-500/40 bg-[#101926] hover:border-sky-400 text-left min-h-[74px] disabled:opacity-55 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] text-sky-300">[ESP]</span>
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-xs font-semibold text-slate-100">Aparar</div>
                <div className="text-[10px] font-mono text-slate-400">
                  {hud.dodgeCd > 0.05 ? `${hud.dodgeCd.toFixed(1)}s` : 'Pronto'}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Quick Stat Allocator + Combat Log */}
        <div className="lg:col-span-3 space-y-4">
          <div className="border border-white/10 bg-[#131822] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F5E6C4]">
                Atributos ({character.statPoints} pts)
              </span>
              <button
                type="button"
                onClick={onOpenCharacterTab}
                className="text-[11px] text-[#D4A853] hover:underline cursor-pointer"
              >
                Ficha Completa
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-xs">
              {(
                [
                  { k: 'str', l: 'FOR' },
                  { k: 'int', l: 'INT' },
                  { k: 'agi', l: 'AGI' },
                  { k: 'vit', l: 'VIT' },
                ] as const
              ).map((st) => (
                <div
                  key={st.k}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/10"
                >
                  <span className="text-slate-400">
                    {st.l} <strong className="text-slate-100">{character.attributes[st.k]}</strong>
                  </span>
                  {character.statPoints > 0 && (
                    <button
                      type="button"
                      onClick={() => onAllocateStat(st.k)}
                      className="w-5 h-5 rounded bg-[#D4A853] text-[#0B0E14] flex items-center justify-center hover:bg-[#E2BA6B] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-white/10">
              <span>PH: {character.skillPoints}</span>
              <span>Ouro: {character.gold}</span>
              <span>Atq: {derived.attackPower}</span>
            </div>
          </div>

          <div className="border border-white/10 bg-[#131822] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-200">Registro de Combate</h4>
              <Sparkles className="w-3.5 h-3.5 text-[#D4A853]" />
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {combatLog.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Mova seu herói em 3D com WASD/Setas ou clicando no chão. Pressione Q/E ou arraste com o botão direito para girar a câmera.
                </p>
              ) : (
                combatLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`text-xs leading-snug ${
                      entry.tone === 'paradox'
                        ? 'text-[#C084FC]'
                        : entry.tone === 'secret'
                        ? 'text-[#F5E6C4] font-medium'
                        : entry.tone === 'heal'
                        ? 'text-emerald-300'
                        : entry.tone === 'boss'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-slate-500 mr-1.5 tabular-nums">
                      {entry.time}
                    </span>
                    {entry.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
