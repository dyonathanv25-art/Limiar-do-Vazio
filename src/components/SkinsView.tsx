import React from 'react';
import { CharacterProfile, SkinInfo } from '../types/game';
import { SKINS } from '../data/skins';
import { Check, Lock, Sparkles, Swords, Coins } from 'lucide-react';

interface SkinsViewProps {
  character: CharacterProfile;
  onSelectSkin: (skinId: string, goToArena?: boolean) => void;
  onUnlockSkin: (skin: SkinInfo) => void;
}

const HEADGEAR_LABELS: Record<SkinInfo['headgear'], string> = {
  none: 'Sem Elmo',
  helm: 'Elmo de Aço',
  hood: 'Capuz Arcano',
  crown: 'Coroa Real',
  horns: 'Elmo com Chifres',
  blindfold: 'Venda Dimensional',
};

export const SkinsView: React.FC<SkinsViewProps> = ({
  character,
  onSelectSkin,
  onUnlockSkin,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="max-w-2xl space-y-1.5">
          <p className="text-xs font-medium text-[#D4A853]">
            Arsenal Cosmético 3D · 8 Skins Exclusivas
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
            Skins e Aparência em 3D
          </h2>
          <p className="text-sm text-slate-300">
            Cada skin transforma a armadura, elmo, manto, halo e brilho da sua arma em tempo real na Arena 3D. Desbloqueie subindo de nível e gastando Ouro obtido dos monstros.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-xs">
          <div className="px-3.5 py-2 rounded-lg bg-[#131822] border border-white/10 text-slate-300">
            Nível: <span className="text-sky-400 font-bold">{character.level}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-[#131822] border border-white/10 text-slate-300 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#D4A853]" />
            <span>Ouro: </span>
            <span className="text-[#F5E6C4] font-bold">{character.gold}</span>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-[#131822] border border-white/10 text-slate-300">
            Desbloqueadas:{' '}
            <span className="text-emerald-400 font-bold">
              {character.sandboxMode ? SKINS.length : character.unlockedSkins.length} / {SKINS.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {SKINS.map((skin) => {
          const isUnlocked =
            character.sandboxMode || character.unlockedSkins.includes(skin.id);
          const isEquipped = character.skinId === skin.id;
          const meetsLevel = character.level >= skin.unlockLevel;
          const meetsGold = character.gold >= skin.goldCost;
          const canBuy = !isUnlocked && meetsLevel && meetsGold;

          return (
            <div
              key={skin.id}
              className={`rounded-xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                isEquipped
                  ? 'bg-[#19202E] border-[#D4A853]'
                  : isUnlocked
                    ? 'bg-[#131822] border-white/15'
                    : 'bg-[#10141D] border-white/10'
              }`}
            >
              <div className="space-y-3">
                {/* Visual Color Palette Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {[
                      skin.primaryColor,
                      skin.secondaryColor,
                      skin.trimColor,
                      skin.glowColor,
                    ].map((col, idx) => (
                      <span
                        key={`${skin.id}-c-${idx}`}
                        className="w-5 h-5 rounded-md border border-white/20"
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    Nv. {skin.unlockLevel}+
                  </span>
                </div>

                <div>
                  <div className="text-[11px] text-[#D4A853] font-medium">{skin.title}</div>
                  <h3 className="font-display text-lg font-bold text-slate-100 mt-0.5">
                    {skin.name}
                  </h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{skin.description}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-400">
                  <div>Cabeça: {HEADGEAR_LABELS[skin.headgear]}</div>
                  <div>Manto: {skin.hasCape ? 'Com Manto' : 'Sem Manto'}</div>
                  <div>Halo 3D: {skin.hasHalo ? 'Ativo' : 'Não'}</div>
                  <div>Ombreira: {skin.pauldronsScale.toFixed(1)}x</div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                {isUnlocked ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectSkin(skin.id, false)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        isEquipped
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-[#1A202E] border-white/15 text-slate-100 hover:border-[#D4A853]'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Equipada
                        </>
                      ) : (
                        'Equipar Skin'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectSkin(skin.id, true)}
                      title="Equipar e ver na Arena 3D"
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors cursor-pointer"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      3D
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => onUnlockSkin(skin)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      canBuy
                        ? 'bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] cursor-pointer'
                        : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                    }`}
                  >
                    {canBuy ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Desbloquear ({skin.goldCost} Ouro)
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        {!meetsLevel
                          ? `Requer Nível ${skin.unlockLevel}`
                          : `Falta Ouro (${skin.goldCost})`}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
