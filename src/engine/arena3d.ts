import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BaseClassId, BossEncounter, SkinInfo } from '../types/game';

export const ARENA_SIM_W = 860;
export const ARENA_SIM_H = 460;
export const WORLD_W = 36;
export const WORLD_D = 20;

export type CameraPreset = 'isometric' | 'thirdPerson' | 'topDown';

export interface Arena3DSyncState {
  elapsed: number;
  running: boolean;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    shield: number;
    dodgeTimer: number;
    parryWindow: number;
    isMoving: boolean;
    vx: number;
    vy: number;
  };
  boss: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    frozenTimer: number;
    vulnerabilityTimer: number;
    isMoving: boolean;
  };
  allies: {
    id: string;
    role: string;
    x: number;
    y: number;
    hp: number;
    color: string;
  }[];
  telegraphs: {
    id: number;
    kind: 'circle' | 'cone' | 'ring' | 'stasis' | 'orb';
    x: number;
    y: number;
    radius: number;
    angle?: number;
    spread?: number;
    pct: number;
    color: string;
  }[];
  moveTarget: { x: number; y: number } | null;
  inversionActive: boolean;
}

export interface VfxBurstSpec {
  kind: 'slash' | 'projectile' | 'nova' | 'heal' | 'shield' | 'paradox' | 'dodge';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  scale?: number;
}

interface ActiveVfx {
  mesh: THREE.Object3D;
  kind: VfxBurstSpec['kind'];
  life: number;
  maxLife: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  baseScale: number;
}

interface RigRefs {
  group: THREE.Group;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  cape?: THREE.Object3D;
  halo?: THREE.Object3D;
  shieldMesh?: THREE.Mesh;
  parryMesh?: THREE.Mesh;
  auraMesh?: THREE.Mesh;
  wings?: [THREE.Object3D, THREE.Object3D];
  shards?: THREE.Object3D[];
  tail?: THREE.Object3D;
  attackAnim: number;
}

// Pre-allocated scratch helpers (zero GC inside render loop)
const _v3a = new THREE.Vector3();
const _v3b = new THREE.Vector3();
const _color = new THREE.Color();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export function simToWorldX(x: number): number {
  return (x - ARENA_SIM_W / 2) * (WORLD_W / ARENA_SIM_W);
}

export function simToWorldZ(y: number): number {
  return (y - ARENA_SIM_H / 2) * (WORLD_D / ARENA_SIM_H);
}

export function worldToSim(wx: number, wz: number): { x: number; y: number } {
  return {
    x: THREE.MathUtils.clamp(wx * (ARENA_SIM_W / WORLD_W) + ARENA_SIM_W / 2, 28, ARENA_SIM_W - 28),
    y: THREE.MathUtils.clamp(wz * (ARENA_SIM_H / WORLD_D) + ARENA_SIM_H / 2, 28, ARENA_SIM_H - 28),
  };
}

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createProceduralArenaTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#141923';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle carved basalt tiles
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Stone speckle noise
  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.04})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Concentric ritual rings
  ctx.strokeStyle = 'rgba(212, 168, 83, 0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(512, 512, 430, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(512, 512, 280, 0, Math.PI * 2);
  ctx.stroke();

  // Radial rune spokes
  ctx.strokeStyle = 'rgba(212, 168, 83, 0.12)';
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(512 + Math.cos(ang) * 280, 512 + Math.sin(ang) * 280);
    ctx.lineTo(512 + Math.cos(ang) * 430, 512 + Math.sin(ang) * 430);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso);
  return tex;
}

function createTerrainNoiseTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0D121B';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.45 ? 'rgba(30, 41, 59, 0.25)' : 'rgba(6, 9, 15, 0.35)';
    ctx.fillRect(x, y, 3, 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAniso);
  return tex;
}

function createWeaponGroup(baseClassId: BaseClassId, weaponColor: string, glowColor: string): THREE.Group {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: weaponColor,
    metalness: 0.85,
    roughness: 0.2,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: '#292524',
    metalness: 0.2,
    roughness: 0.75,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  if (baseClassId === 'guerreiro') {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.35, 8), handleMat);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.1), metalMat);
    guard.position.y = 0.18;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.045), metalMat);
    blade.position.y = 0.78;
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.06), glowMat);
    rune.position.y = 0.75;
    g.add(grip, guard, blade, rune);
    g.rotation.x = Math.PI * 0.35;
  } else if (baseClassId === 'mago' || baseClassId === 'clerigo') {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.55, 8), handleMat);
    staff.position.y = 0.45;
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16), metalMat);
    crown.position.y = 1.28;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), glowMat);
    orb.position.y = 1.28;
    g.add(staff, crown, orb);
    g.rotation.x = Math.PI * 0.18;
  } else if (baseClassId === 'ladino') {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8), handleMat);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.75, 4), metalMat);
    blade.position.y = 0.48;
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.05), glowMat);
    edge.position.y = 0.4;
    g.add(grip, blade, edge);
    g.rotation.x = Math.PI * 0.45;
  } else {
    // Arqueiro bow
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.038, 8, 18, Math.PI * 1.15), handleMat);
    arc.rotation.z = -Math.PI * 0.08;
    const tip1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), glowMat);
    tip1.position.set(0.08, 0.54, 0);
    const tip2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), glowMat);
    tip2.position.set(0.08, -0.54, 0);
    g.add(arc, tip1, tip2);
    g.rotation.y = Math.PI * 0.5;
  }

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
    }
  });
  return g;
}

export function buildHeroRig(baseClassId: BaseClassId, skin: SkinInfo): RigRefs {
  const group = new THREE.Group();

  const primaryMat = new THREE.MeshStandardMaterial({
    color: skin.primaryColor,
    metalness: skin.metalness,
    roughness: skin.roughness,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: skin.secondaryColor,
    metalness: Math.max(0.15, skin.metalness - 0.35),
    roughness: Math.min(0.85, skin.roughness + 0.3),
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: skin.trimColor,
    metalness: 0.88,
    roughness: 0.22,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: '#E2B89B',
    metalness: 0.05,
    roughness: 0.72,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: skin.glowColor,
    emissive: skin.glowColor,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  // Legs (bottom-center grounded at y=0)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.2, 0.72, 0);
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.42, 4, 8);
  const bootGeo = new THREE.BoxGeometry(0.22, 0.2, 0.32);
  const lLegMesh = new THREE.Mesh(legGeo, secondaryMat);
  lLegMesh.position.y = -0.32;
  const lBoot = new THREE.Mesh(bootGeo, primaryMat);
  lBoot.position.set(0, -0.62, 0.04);
  leftLeg.add(lLegMesh, lBoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.2, 0.72, 0);
  const rLegMesh = new THREE.Mesh(legGeo, secondaryMat);
  rLegMesh.position.y = -0.32;
  const rBoot = new THREE.Mesh(bootGeo, primaryMat);
  rBoot.position.set(0, -0.62, 0.04);
  rightLeg.add(rLegMesh, rBoot);

  // Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.76, 0);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.22, 10), trimMat);
  waist.position.y = 0.08;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.4), primaryMat);
  chest.position.y = 0.48;
  const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.44), trimMat);
  chestTrim.position.y = 0.48;
  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glowMat);
  coreGem.position.set(0, 0.52, 0.22);
  torso.add(waist, chest, chestTrim, coreGem);

  // Head & Headgear
  const head = new THREE.Group();
  head.position.set(0, 0.96, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), skinMat);
  skull.position.y = 0.2;
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.14), glowMat);
  eyes.position.set(0, 0.22, 0.18);
  head.add(skull, eyes);

  if (skin.headgear === 'helm') {
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.265, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65),
      primaryMat
    );
    helm.position.y = 0.21;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.36), trimMat);
    crest.position.set(0, 0.45, -0.02);
    head.add(helm, crest);
  } else if (skin.headgear === 'hood') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.56, 8), primaryMat);
    hood.position.set(0, 0.34, -0.03);
    head.add(hood);
  } else if (skin.headgear === 'crown') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.14, 8, 1, true), trimMat);
    crown.position.y = 0.42;
    head.add(crown);
  } else if (skin.headgear === 'horns') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.255, 12, 10), secondaryMat);
    helm.position.y = 0.2;
    const hornGeo = new THREE.ConeGeometry(0.065, 0.42, 6);
    const lHorn = new THREE.Mesh(hornGeo, trimMat);
    lHorn.position.set(-0.24, 0.44, 0);
    lHorn.rotation.z = 0.55;
    const rHorn = new THREE.Mesh(hornGeo, trimMat);
    rHorn.position.set(0.24, 0.44, 0);
    rHorn.rotation.z = -0.55;
    head.add(helm, lHorn, rHorn);
  } else if (skin.headgear === 'blindfold') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 14), secondaryMat);
    band.position.y = 0.22;
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.34, 8), trimMat);
    hair.position.y = 0.42;
    head.add(band, hair);
  }
  torso.add(head);

  // Arms + Pauldrons + Weapons
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.46, 0.72, 0);
  const pauldronGeo = new THREE.SphereGeometry(0.18 * skin.pauldronsScale, 10, 8);
  const lPauldron = new THREE.Mesh(pauldronGeo, trimMat);
  const armMeshGeo = new THREE.CapsuleGeometry(0.095, 0.42, 4, 8);
  const lArmMesh = new THREE.Mesh(armMeshGeo, secondaryMat);
  lArmMesh.position.y = -0.28;
  leftArm.add(lPauldron, lArmMesh);

  if (baseClassId === 'guerreiro') {
    const buckler = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 8), trimMat);
    buckler.rotation.z = Math.PI * 0.5;
    buckler.position.set(-0.14, -0.45, 0.15);
    leftArm.add(buckler);
  } else if (baseClassId === 'ladino') {
    const offDagger = createWeaponGroup('ladino', skin.weaponColor, skin.glowColor);
    offDagger.position.set(0, -0.52, 0.12);
    leftArm.add(offDagger);
  }

  const rightArm = new THREE.Group();
  rightArm.position.set(0.46, 0.72, 0);
  const rPauldron = new THREE.Mesh(pauldronGeo, trimMat);
  const rArmMesh = new THREE.Mesh(armMeshGeo, secondaryMat);
  rArmMesh.position.y = -0.28;
  const weapon = createWeaponGroup(baseClassId, skin.weaponColor, skin.glowColor);
  weapon.position.set(0, -0.52, 0.14);
  rightArm.add(rPauldron, rArmMesh, weapon);

  torso.add(leftArm, rightArm);

  // Optional Cape
  let cape: THREE.Object3D | undefined;
  if (skin.hasCape) {
    cape = new THREE.Group();
    cape.position.set(0, 0.78, -0.22);
    const capeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 1.1, 0.04),
      new THREE.MeshStandardMaterial({
        color: skin.secondaryColor,
        roughness: 0.75,
        metalness: 0.1,
      })
    );
    capeMesh.position.y = -0.52;
    cape.add(capeMesh);
    torso.add(cape);
  }

  // Optional Halo
  let halo: THREE.Object3D | undefined;
  if (skin.hasHalo) {
    halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.032, 8, 24),
      glowMat
    );
    halo.position.set(0, 0.9, -0.28);
    torso.add(halo);
  }

  // Ground Aura / Shield / Parry FX meshes
  const auraMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 0.84, 32),
    new THREE.MeshBasicMaterial({
      color: skin.glowColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  auraMesh.rotation.x = -Math.PI / 2;
  auraMesh.position.y = 0.04;

  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 20, 14),
    new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      depthWrite: false,
    })
  );
  shieldMesh.position.y = 1.0;
  shieldMesh.visible = false;

  const parryMesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.25, 0.05, 8, 28),
    new THREE.MeshBasicMaterial({
      color: '#D4A853',
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  parryMesh.rotation.x = Math.PI / 2;
  parryMesh.position.y = 0.95;
  parryMesh.visible = false;

  group.add(leftLeg, rightLeg, torso, auraMesh, shieldMesh, parryMesh);

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj !== auraMesh && obj !== shieldMesh && obj !== parryMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    group,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    cape,
    halo,
    shieldMesh,
    parryMesh,
    auraMesh,
    attackAnim: 0,
  };
}

function buildAllyRig(role: string, color: string): RigRefs {
  const skin: SkinInfo = {
    id: 'ally',
    name: role,
    title: role,
    description: '',
    unlockLevel: 1,
    goldCost: 0,
    primaryColor: color,
    secondaryColor: '#1E293B',
    trimColor: '#F5E6C4',
    weaponColor: '#E2E8F0',
    glowColor: color,
    metalness: 0.65,
    roughness: 0.4,
    headgear: role === 'Tank' ? 'helm' : 'hood',
    hasCape: role !== 'Tank',
    hasHalo: role !== 'Tank',
    pauldronsScale: role === 'Tank' ? 1.15 : 0.85,
  };
  const rig = buildHeroRig(role === 'Tank' ? 'guerreiro' : 'clerigo', skin);
  rig.group.scale.setScalar(0.86);
  return rig;
}

function buildEnemyRig(enemy: BossEncounter): RigRefs {
  const group = new THREE.Group();
  const isQuadruped = enemy.id === 'lobo_cinzas' || enemy.id === 'javali_ferro';
  const isSlime = enemy.id === 'slime_eter';
  const isWyvern = enemy.id === 'wyvern_aethel';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: enemy.accentColor,
    metalness: enemy.category === 'Monstro Comum' ? 0.2 : 0.7,
    roughness: enemy.category === 'Monstro Comum' ? 0.65 : 0.3,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#18181B',
    metalness: 0.35,
    roughness: 0.6,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: enemy.accentColor,
    emissiveIntensity: 2.0,
  });

  const torso = new THREE.Group();
  const head = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();

  const scaleFactor = THREE.MathUtils.clamp(enemy.radius / 26, 0.82, 1.85);

  if (isQuadruped) {
    // Quadruped Beast (Lobo / Javali)
    torso.position.set(0, 0.65, 0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.35), bodyMat);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.64, 0.55), darkMat);
    mane.position.set(0, 0.08, 0.35);
    torso.add(body, mane);

    head.position.set(0, 0.25, 0.78);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.52), darkMat);
    const lEar = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 4), bodyMat);
    lEar.position.set(-0.15, 0.28, -0.05);
    const rEar = lEar.clone();
    rEar.position.x = 0.15;
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.1), eyeMat);
    eyes.position.set(0, 0.08, 0.24);
    head.add(snout, lEar, rEar, eyes);
    if (enemy.id === 'javali_ferro') {
      const tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 6), eyeMat);
      tuskL.rotation.x = Math.PI * 0.4;
      tuskL.position.set(-0.18, -0.06, 0.3);
      const tuskR = tuskL.clone();
      tuskR.position.x = 0.18;
      head.add(tuskL, tuskR);
    }
    torso.add(head);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 5), darkMat);
    tail.rotation.x = -Math.PI * 0.35;
    tail.position.set(0, 0.15, -0.78);
    torso.add(tail);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.65, 6);
    leftLeg.position.set(-0.24, 0.62, 0.45);
    const fl = new THREE.Mesh(legGeo, darkMat);
    fl.position.y = -0.32;
    const bl = new THREE.Mesh(legGeo, darkMat);
    bl.position.set(0, -0.32, -0.9);
    leftLeg.add(fl, bl);

    rightLeg.position.set(0.24, 0.62, 0.45);
    const fr = new THREE.Mesh(legGeo, darkMat);
    fr.position.y = -0.32;
    const br = new THREE.Mesh(legGeo, darkMat);
    br.position.set(0, -0.32, -0.9);
    rightLeg.add(fr, br);

    group.add(torso, leftLeg, rightLeg);
    group.scale.setScalar(scaleFactor);
    return {
      group,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      tail,
      attackAnim: 0,
    };
  }

  if (isSlime) {
    torso.position.set(0, 0.65, 0);
    const gelMat = new THREE.MeshPhysicalMaterial({
      color: enemy.accentColor,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
    });
    const outer = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), gelMat);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), eyeMat);
    torso.add(outer, core);

    const shards: THREE.Object3D[] = [];
    for (let i = 0; i < 4; i++) {
      const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), bodyMat);
      const ang = (i / 4) * Math.PI * 2;
      sh.position.set(Math.cos(ang) * 0.95, 0.25, Math.sin(ang) * 0.95);
      torso.add(sh);
      shards.push(sh);
    }

    group.add(torso);
    group.scale.setScalar(scaleFactor);
    return {
      group,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      shards,
      attackAnim: 0,
    };
  }

  if (isWyvern) {
    torso.position.set(0, 1.35, 0);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.9, 6, 10), bodyMat);
    body.rotation.x = Math.PI * 0.38;
    head.position.set(0, 0.55, 0.78);
    const drakeHead = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 6), darkMat);
    drakeHead.rotation.x = Math.PI * 0.5;
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.12), eyeMat);
    eyes.position.set(0, 0.08, 0.18);
    head.add(drakeHead, eyes);

    const wingGeo = new THREE.BoxGeometry(1.5, 0.06, 0.68);
    const leftWing = new THREE.Group();
    leftWing.position.set(-0.3, 0.2, 0.1);
    const lwMesh = new THREE.Mesh(wingGeo, darkMat);
    lwMesh.position.x = -0.75;
    leftWing.add(lwMesh);

    const rightWing = new THREE.Group();
    rightWing.position.set(0.3, 0.2, 0.1);
    const rwMesh = new THREE.Mesh(wingGeo, darkMat);
    rwMesh.position.x = 0.75;
    rightWing.add(rwMesh);

    torso.add(body, head, leftWing, rightWing);
    group.add(torso);
    group.scale.setScalar(scaleFactor);
    return {
      group,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      wings: [leftWing, rightWing],
      attackAnim: 0,
    };
  }

  // Humanoid / Armored / Colossal Boss Rig
  const bossSkin: SkinInfo = {
    id: enemy.id,
    name: enemy.name,
    title: enemy.title,
    description: '',
    unlockLevel: 1,
    goldCost: 0,
    primaryColor: enemy.accentColor,
    secondaryColor: '#0F172A',
    trimColor: '#F5E6C4',
    weaponColor: enemy.accentColor,
    glowColor: enemy.accentColor,
    metalness: 0.78,
    roughness: 0.28,
    headgear:
      enemy.category === 'Chefe Final'
        ? 'crown'
        : enemy.category === 'Chefe Principal'
          ? 'horns'
          : 'helm',
    hasCape: enemy.category !== 'Monstro Comum',
    hasHalo: enemy.category === 'Chefe Final' || enemy.category === 'Chefe Principal',
    pauldronsScale: enemy.category === 'Chefe Final' ? 1.55 : 1.25,
  };
  const rig = buildHeroRig('guerreiro', bossSkin);
  rig.group.scale.setScalar(scaleFactor);
  return rig;
}

export class Arena3DEngine {
  private container: HTMLElement;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  private playerRig: RigRefs;
  private bossRig: RigRefs;
  private allyRigs = new Map<string, RigRefs>();
  private telegraphMeshes = new Map<number, THREE.Group>();
  private activeVfx: ActiveVfx[] = [];
  private waypointMesh: THREE.Mesh;
  private arenaRingMesh: THREE.Mesh;

  private preset: CameraPreset = 'isometric';
  private cameraYaw = 0;
  private zoomFactor = 1.0;
  private camCurrentPos = new THREE.Vector3(0, 14, 16);
  private camCurrentLook = new THREE.Vector3(0, 0.8, 0);

  private isRightDragging = false;
  private lastDragX = 0;

  private onGroundClick: (simX: number, simY: number) => void;
  private frameId = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    baseClassId: BaseClassId,
    skin: SkinInfo,
    enemy: BossEncounter,
    onGroundClick: (simX: number, simY: number) => void
  ) {
    this.container = container;
    this.onGroundClick = onGroundClick;
    this.isSoftwareGl = detectSoftwareGl();

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b101b);
    this.scene.fog = new THREE.FogExp2(0x0b101b, 0.0145);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.2, 180);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);

    // 3-Point Warm/Cool Studio Lighting Rig
    const hemi = new THREE.HemisphereLight(0x6c8ec4, 0x161922, 0.85);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d4, 2.0);
    keyLight.position.set(14, 24, 16);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -22;
    keyLight.shadow.camera.right = 22;
    keyLight.shadow.camera.top = 18;
    keyLight.shadow.camera.bottom = -18;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 65;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.75);
    rimLight.position.set(-16, 10, -18);
    this.scene.add(rimLight);

    // Extended Natural Outdoor Terrain + Carved Ritual Arena Floor
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const terrainTex = createTerrainNoiseTexture(maxAniso);
    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140),
      new THREE.MeshStandardMaterial({
        map: terrainTex,
        roughness: 0.92,
        metalness: 0.05,
      })
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    const arenaTex = createProceduralArenaTexture(maxAniso);
    const arenaFloor = new THREE.Mesh(
      new THREE.CircleGeometry(21.5, 64),
      new THREE.MeshStandardMaterial({
        map: arenaTex,
        roughness: 0.65,
        metalness: 0.2,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    arenaFloor.rotation.x = -Math.PI / 2;
    arenaFloor.position.y = 0.02;
    arenaFloor.receiveShadow = true;
    this.scene.add(arenaFloor);

    // Playable perimeter glowing boundary ring
    this.arenaRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(18.6, 18.95, 64),
      new THREE.MeshBasicMaterial({
        color: '#D4A853',
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.arenaRingMesh.rotation.x = -Math.PI / 2;
    this.arenaRingMesh.position.y = 0.04;
    this.scene.add(this.arenaRingMesh);

    this.buildOutdoorPerimeterProps();

    // Move waypoint indicator
    this.waypointMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.55, 24),
      new THREE.MeshBasicMaterial({
        color: '#38BDF8',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    this.waypointMesh.rotation.x = -Math.PI / 2;
    this.waypointMesh.position.y = 0.06;
    this.waypointMesh.visible = false;
    this.scene.add(this.waypointMesh);

    // Player & Enemy Rigs
    this.playerRig = buildHeroRig(baseClassId, skin);
    this.playerRig.group.position.set(simToWorldX(185), 0, simToWorldZ(ARENA_SIM_H / 2));
    this.scene.add(this.playerRig.group);

    this.bossRig = buildEnemyRig(enemy);
    this.bossRig.group.position.set(simToWorldX(650), 0, simToWorldZ(ARENA_SIM_H / 2));
    this.scene.add(this.bossRig.group);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
  }

  private buildOutdoorPerimeterProps() {
    // Instanced jagged perimeter rocks (44 instances)
    const rockGeo = new THREE.DodecahedronGeometry(1.3, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#1E2533',
      roughness: 0.9,
      metalness: 0.1,
    });
    const rockCount = 44;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < rockCount; i++) {
      const ang = (i / rockCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
      const dist = 22.5 + Math.random() * 14;
      const s = 0.85 + Math.random() * 1.4;
      dummy.position.set(Math.cos(ang) * dist, s * 0.45, Math.sin(ang) * dist);
      dummy.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      dummy.scale.set(s * 1.1, s * (0.7 + Math.random() * 0.8), s);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      _color.setHex(0x1e2533).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06);
      rocks.setColorAt(i, _color);
    }
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    rocks.computeBoundingSphere();
    this.scene.add(rocks);

    // Instanced ancient stone pillars around ritual perimeter (12 instances)
    const pillarGeo = new THREE.BoxGeometry(0.95, 4.5, 0.95);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#2A3142',
      roughness: 0.72,
      metalness: 0.15,
    });
    const pillarCount = 12;
    const pillars = new THREE.InstancedMesh(pillarGeo, pillarMat, pillarCount);
    pillars.castShadow = true;
    pillars.receiveShadow = true;
    for (let i = 0; i < pillarCount; i++) {
      const ang = (i / pillarCount) * Math.PI * 2;
      const dist = 21.8;
      const hScale = 0.7 + (i % 3) * 0.25;
      dummy.position.set(Math.cos(ang) * dist, (4.5 * hScale) / 2 - 0.1, Math.sin(ang) * dist);
      dummy.rotation.set((i % 2 === 0 ? 1 : -1) * 0.04, -ang, 0);
      dummy.scale.set(1, hScale, 1);
      dummy.updateMatrix();
      pillars.setMatrixAt(i, dummy.matrix);
    }
    pillars.instanceMatrix.needsUpdate = true;
    pillars.computeBoundingSphere();
    this.scene.add(pillars);

    // Instanced dark-fantasy cypress trees in background horizon (36 instances)
    const treeGeo = new THREE.ConeGeometry(1.1, 5.2, 7);
    const treeMat = new THREE.MeshStandardMaterial({
      color: '#13262F',
      roughness: 0.88,
      metalness: 0.05,
    });
    const treeCount = 36;
    const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2 + 0.18;
      const dist = 27 + Math.random() * 18;
      const sc = 0.85 + Math.random() * 0.7;
      dummy.position.set(Math.cos(ang) * dist, (5.2 * sc) / 2, Math.sin(ang) * dist);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      trees.setMatrixAt(i, dummy.matrix);
      _color.setHex(0x13262f).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
      trees.setColorAt(i, _color);
    }
    trees.instanceMatrix.needsUpdate = true;
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
    trees.computeBoundingSphere();
    this.scene.add(trees);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 2 || e.button === 1) {
      this.isRightDragging = true;
      this.lastDragX = e.clientX;
      return;
    }
    if (e.button === 0) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      if (this.raycaster.ray.intersectPlane(_groundPlane, _v3a)) {
        const simPos = worldToSim(_v3a.x, _v3a.z);
        this.onGroundClick(simPos.x, simPos.y);
      }
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isRightDragging) return;
    const dx = e.clientX - this.lastDragX;
    this.lastDragX = e.clientX;
    this.cameraYaw -= dx * 0.008;
  };

  private onPointerUp = () => {
    this.isRightDragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomFactor = THREE.MathUtils.clamp(this.zoomFactor + e.deltaY * 0.0008, 0.65, 1.55);
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private bindEvents() {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('contextmenu', this.onContextMenu);
  }

  public resize() {
    if (this.disposed) return;
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public setCameraPreset(preset: CameraPreset) {
    this.preset = preset;
  }

  public rotateYaw(deltaRad: number) {
    this.cameraYaw += deltaRad;
  }

  public getCameraYaw(): number {
    return this.cameraYaw;
  }

  public isSoftwareMode(): boolean {
    return this.isSoftwareGl;
  }

  public updatePlayerAppearance(baseClassId: BaseClassId, skin: SkinInfo) {
    const pos = this.playerRig.group.position.clone();
    const rot = this.playerRig.group.rotation.y;
    this.scene.remove(this.playerRig.group);
    this.disposeObject(this.playerRig.group);
    this.playerRig = buildHeroRig(baseClassId, skin);
    this.playerRig.group.position.copy(pos);
    this.playerRig.group.rotation.y = rot;
    this.scene.add(this.playerRig.group);
  }

  public updateEnemyAppearance(enemy: BossEncounter) {
    const pos = this.bossRig.group.position.clone();
    this.scene.remove(this.bossRig.group);
    this.disposeObject(this.bossRig.group);
    this.bossRig = buildEnemyRig(enemy);
    this.bossRig.group.position.copy(pos);
    this.scene.add(this.bossRig.group);
  }

  public triggerPlayerAttackAnim() {
    this.playerRig.attackAnim = 1.0;
  }

  public triggerEnemyAttackAnim() {
    this.bossRig.attackAnim = 1.0;
  }

  public spawnVfx(spec: VfxBurstSpec) {
    const sx = simToWorldX(spec.fromX);
    const sz = simToWorldZ(spec.fromY);
    const ex = simToWorldX(spec.toX);
    const ez = simToWorldZ(spec.toY);

    let mesh: THREE.Object3D;
    let maxLife = 0.48;
    const baseScale = spec.scale ?? 1.0;

    if (spec.kind === 'projectile') {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32 * baseScale, 1),
        new THREE.MeshBasicMaterial({ color: spec.color })
      );
      maxLife = 0.34;
    } else if (spec.kind === 'slash') {
      mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.1 * baseScale, 0.08, 6, 20, Math.PI * 0.85),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.z = Math.atan2(ez - sz, ex - sx) - Math.PI * 0.4;
      maxLife = 0.32;
    } else if (spec.kind === 'heal') {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9 * baseScale, 0.9 * baseScale, 3.2, 18, 1, true),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      maxLife = 0.65;
    } else {
      // nova / shield / paradox / dodge
      mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.5 * baseScale, 0.85 * baseScale, 28),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      maxLife = spec.kind === 'paradox' ? 0.9 : 0.45;
    }

    mesh.position.set(sx, spec.kind === 'heal' ? 1.6 : 0.9, sz);
    this.scene.add(mesh);
    this.activeVfx.push({
      mesh,
      kind: spec.kind,
      life: maxLife,
      maxLife,
      startPos: new THREE.Vector3(sx, 1.0, sz),
      endPos: new THREE.Vector3(ex, 1.0, ez),
      baseScale,
    });
  }

  private animateRig(
    rig: RigRefs,
    dt: number,
    elapsed: number,
    isMoving: boolean,
    targetX: number,
    targetZ: number,
    faceMoveX?: number,
    faceMoveZ?: number
  ) {
    // Facing direction
    let desiredYaw = rig.group.rotation.y;
    if (faceMoveX !== undefined && faceMoveZ !== undefined && Math.hypot(faceMoveX, faceMoveZ) > 0.05) {
      desiredYaw = Math.atan2(faceMoveX, faceMoveZ);
    } else {
      const dx = targetX - rig.group.position.x;
      const dz = targetZ - rig.group.position.z;
      if (Math.hypot(dx, dz) > 0.1) {
        desiredYaw = Math.atan2(dx, dz);
      }
    }
    // Shortest angular diff
    let diff = desiredYaw - rig.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    rig.group.rotation.y += diff * Math.min(1, dt * 12);

    // Locomotion or idle breathing
    if (isMoving) {
      const swing = Math.sin(elapsed * 11) * 0.65;
      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;
      rig.leftArm.rotation.x = -swing * 0.7;
      rig.rightArm.rotation.x = swing * 0.7;
      rig.torso.position.y = 0.76 + Math.abs(Math.sin(elapsed * 11)) * 0.07;
      if (rig.cape) rig.cape.rotation.x = 0.25 + Math.sin(elapsed * 11) * 0.12;
    } else {
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, 0, 10, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, 0, 10, dt);
      rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, Math.sin(elapsed * 2.2) * 0.05, 8, dt);
      rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -Math.sin(elapsed * 2.2) * 0.05, 8, dt);
      rig.torso.position.y = 0.76 + Math.sin(elapsed * 2.5) * 0.03;
      if (rig.cape) rig.cape.rotation.x = 0.08 + Math.sin(elapsed * 2.5) * 0.04;
    }

    if (rig.halo) {
      rig.halo.rotation.z = elapsed * 1.4;
    }
    if (rig.wings) {
      const flap = Math.sin(elapsed * 7) * 0.45;
      rig.wings[0].rotation.z = flap;
      rig.wings[1].rotation.z = -flap;
    }
    if (rig.shards) {
      rig.shards.forEach((sh, i) => {
        const ang = elapsed * 2.2 + (i / rig.shards!.length) * Math.PI * 2;
        sh.position.x = Math.cos(ang) * 0.95;
        sh.position.z = Math.sin(ang) * 0.95;
        sh.rotation.y = elapsed * 3;
      });
    }
    if (rig.tail) {
      rig.tail.rotation.y = Math.sin(elapsed * 6) * 0.25;
    }

    if (rig.attackAnim > 0) {
      rig.attackAnim = Math.max(0, rig.attackAnim - dt * 3.6);
      const swingCurve = Math.sin(rig.attackAnim * Math.PI);
      rig.rightArm.rotation.x = -1.65 * swingCurve;
      rig.torso.rotation.y = 0.35 * swingCurve;
    } else {
      rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, 0, 10, dt);
    }
  }

  public syncAndRender(dt: number, state: Arena3DSyncState) {
    if (this.disposed) return;

    const px = simToWorldX(state.player.x);
    const pz = simToWorldZ(state.player.y);
    const bx = simToWorldX(state.boss.x);
    const bz = simToWorldZ(state.boss.y);

    // Sync player position & effects
    this.playerRig.group.position.set(px, state.player.dodgeTimer > 0 ? 0.35 : 0, pz);
    this.animateRig(
      this.playerRig,
      dt,
      state.elapsed,
      state.player.isMoving,
      bx,
      bz,
      state.player.isMoving ? state.player.vx : undefined,
      state.player.isMoving ? state.player.vy : undefined
    );
    if (this.playerRig.shieldMesh) {
      this.playerRig.shieldMesh.visible = state.player.shield > 0;
      this.playerRig.shieldMesh.rotation.y += dt * 1.2;
    }
    if (this.playerRig.parryMesh) {
      this.playerRig.parryMesh.visible = state.player.parryWindow > 0;
    }

    // Sync boss position
    this.bossRig.group.position.set(bx, 0, bz);
    this.animateRig(this.bossRig, dt, state.elapsed, state.boss.isMoving, px, pz);

    // Sync Allies
    const seenAllies = new Set<string>();
    state.allies.forEach((ally) => {
      if (ally.hp <= 0) return;
      seenAllies.add(ally.id);
      let rig = this.allyRigs.get(ally.id);
      if (!rig) {
        rig = buildAllyRig(ally.role, ally.color);
        this.allyRigs.set(ally.id, rig);
        this.scene.add(rig.group);
      }
      const ax = simToWorldX(ally.x);
      const az = simToWorldZ(ally.y);
      const moved = Math.hypot(ax - rig.group.position.x, az - rig.group.position.z) > 0.01;
      rig.group.position.set(ax, 0, az);
      this.animateRig(rig, dt, state.elapsed, moved, bx, bz);
    });
    for (const [id, rig] of this.allyRigs.entries()) {
      if (!seenAllies.has(id)) {
        this.scene.remove(rig.group);
        this.disposeObject(rig.group);
        this.allyRigs.delete(id);
      }
    }

    // Sync Waypoint
    if (state.moveTarget) {
      this.waypointMesh.visible = true;
      this.waypointMesh.position.set(simToWorldX(state.moveTarget.x), 0.06, simToWorldZ(state.moveTarget.y));
      const pulseScale = 0.85 + Math.sin(state.elapsed * 8) * 0.18;
      this.waypointMesh.scale.setScalar(pulseScale);
    } else {
      this.waypointMesh.visible = false;
    }

    // Paradox floor mood
    (this.arenaRingMesh.material as THREE.MeshBasicMaterial).color.set(
      state.inversionActive ? '#C084FC' : '#D4A853'
    );

    // Sync 3D Telegraphs
    const activeTelIds = new Set<number>();
    state.telegraphs.forEach((t) => {
      activeTelIds.add(t.id);
      let grp = this.telegraphMeshes.get(t.id);
      const worldRadius = t.radius * (WORLD_W / ARENA_SIM_W);
      if (!grp) {
        grp = new THREE.Group();
        const outerMat = new THREE.MeshBasicMaterial({
          color: t.color,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const fillMat = new THREE.MeshBasicMaterial({
          color: t.color,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        if (t.kind === 'cone') {
          const spread = t.spread ?? 0.9;
          const outer = new THREE.Mesh(
            new THREE.CircleGeometry(worldRadius, 24, -spread / 2, spread),
            outerMat
          );
          outer.rotation.x = -Math.PI / 2;
          const inner = new THREE.Mesh(
            new THREE.CircleGeometry(worldRadius, 24, -spread / 2, spread),
            fillMat
          );
          inner.rotation.x = -Math.PI / 2;
          inner.position.y = 0.01;
          inner.name = 'innerFill';
          grp.add(outer, inner);
          if (t.angle !== undefined) {
            grp.rotation.y = -t.angle;
          }
        } else {
          const outer = new THREE.Mesh(new THREE.RingGeometry(worldRadius * 0.92, worldRadius, 32), outerMat);
          outer.rotation.x = -Math.PI / 2;
          const inner = new THREE.Mesh(new THREE.CircleGeometry(worldRadius, 32), fillMat);
          inner.rotation.x = -Math.PI / 2;
          inner.position.y = 0.01;
          inner.name = 'innerFill';
          grp.add(outer, inner);
        }

        grp.position.set(simToWorldX(t.x), 0.05, simToWorldZ(t.y));
        this.scene.add(grp);
        this.telegraphMeshes.set(t.id, grp);
      }

      const inner = grp.getObjectByName('innerFill');
      if (inner) {
        const s = Math.max(0.05, Math.min(1, t.pct));
        inner.scale.set(s, s, 1);
      }
    });

    for (const [id, grp] of this.telegraphMeshes.entries()) {
      if (!activeTelIds.has(id)) {
        this.scene.remove(grp);
        this.disposeObject(grp);
        this.telegraphMeshes.delete(id);
      }
    }

    // Update Active 3D VFX
    this.activeVfx = this.activeVfx.filter((vfx) => {
      vfx.life -= dt;
      if (vfx.life <= 0) {
        this.scene.remove(vfx.mesh);
        this.disposeObject(vfx.mesh);
        return false;
      }
      const progress = 1 - vfx.life / vfx.maxLife;
      if (vfx.kind === 'projectile') {
        vfx.mesh.position.lerpVectors(vfx.startPos, vfx.endPos, progress);
        vfx.mesh.rotation.y += dt * 12;
      } else if (vfx.kind === 'slash') {
        vfx.mesh.scale.setScalar(1 + progress * 0.9);
      } else if (vfx.kind === 'heal') {
        vfx.mesh.rotation.y += dt * 4;
        vfx.mesh.scale.set(1 - progress * 0.3, 1 + progress * 0.3, 1 - progress * 0.3);
      } else {
        vfx.mesh.scale.setScalar(1 + progress * 3.8);
      }
      const meshMat = (vfx.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (meshMat && typeof meshMat.opacity === 'number') {
        meshMat.opacity = Math.max(0, 1 - progress);
      }
      return true;
    });

    // Smooth Damped Camera Follow
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    let distBack = 14.5 * this.zoomFactor;
    let height = 12.2 * this.zoomFactor;
    let targetX = px * 0.65 + bx * 0.35;
    let targetZ = pz * 0.65 + bz * 0.35;

    if (this.preset === 'thirdPerson') {
      distBack = 7.4 * this.zoomFactor;
      height = 4.6 * this.zoomFactor;
      targetX = px;
      targetZ = pz;
    } else if (this.preset === 'topDown') {
      distBack = 5.5 * this.zoomFactor;
      height = 22.5 * this.zoomFactor;
      targetX = 0;
      targetZ = 0;
    }

    _v3a.set(
      targetX + sinY * distBack,
      height,
      targetZ + cosY * distBack
    );
    _v3b.set(targetX, this.preset === 'thirdPerson' ? 1.45 : 0.7, targetZ);

    this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, _v3a.x, 7.5, dt);
    this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, _v3a.y, 7.5, dt);
    this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, _v3a.z, 7.5, dt);

    this.camCurrentLook.x = THREE.MathUtils.damp(this.camCurrentLook.x, _v3b.x, 9, dt);
    this.camCurrentLook.y = THREE.MathUtils.damp(this.camCurrentLook.y, _v3b.y, 9, dt);
    this.camCurrentLook.z = THREE.MathUtils.damp(this.camCurrentLook.z, _v3b.z, 9, dt);

    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);

    this.renderer.render(this.scene, this.camera);
  }

  public projectSimToScreen(
    simX: number,
    simY: number,
    worldHeight: number,
    outW: number,
    outH: number
  ): { x: number; y: number } {
    _v3a.set(simToWorldX(simX), worldHeight, simToWorldZ(simY));
    _v3a.project(this.camera);
    return {
      x: ((_v3a.x + 1) / 2) * outW,
      y: (-(_v3a.y - 1) / 2) * outH,
    };
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('contextmenu', this.onContextMenu);

    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      }
    });
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
