import React, { useState } from 'react';
import { WORLD_REGIONS, FACTIONS, LORE_CHRONICLES } from '../data/lore';
import { BOSS_ENCOUNTERS } from '../data/bosses';
import { Swords, MapPin, BookOpen } from 'lucide-react';

interface WorldMapViewProps {
  onLaunchBoss: (bossId: string) => void;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({ onLaunchBoss }) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>(WORLD_REGIONS[0].id);

  const region =
    WORLD_REGIONS.find((r) => r.id === selectedRegionId) ?? WORLD_REGIONS[0];
  const regionBosses = BOSS_ENCOUNTERS.filter((b) => region.bossIds.includes(b.id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-5 space-y-2">
        <p className="text-xs font-medium text-[#D4A853]">
          Atlas do Continente Fraturado · 7 Regiões · 3 Facções · 11 Chefes
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
          O Mundo de Aeldrin e Suas Cicatrizes
        </h2>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          Explore as regiões estilhaçadas após o Grande Selo, leia as sub-histórias regionais e desafie os Subchefes e Chefes Principais diretamente na Arena de Combate.
        </p>
      </div>

      {/* Interactive Map + Region Story Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG Map of Aeldrin */}
        <div className="lg:col-span-7 border border-white/10 bg-[#131822] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Clique em uma região no mapa para inspecionar lore e chefes</span>
            <span className="font-mono text-[#D4A853]">{region.name}</span>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0A0D13]">
            <svg viewBox="0 0 800 480" className="w-full h-auto block">
              <defs>
                <radialGradient id="scarGlow" cx="50%" cy="48%" r="45%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#0A0D13" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="800" height="480" fill="#0A0D13" />
              <circle cx="400" cy="230" r="210" fill="url(#scarGlow)" />

              {/* Fractured landmass silhouettes */}
              <path
                d="M90,115 L230,85 L295,155 L260,245 L145,250 L85,180 Z"
                fill="#161C28"
                stroke="#2E374B"
                strokeWidth="1.5"
              />
              <path
                d="M170,275 L295,260 L325,355 L245,420 L130,385 L125,310 Z"
                fill="#141C24"
                stroke="#2E374B"
                strokeWidth="1.5"
              />
              <path
                d="M425,55 L585,45 L625,135 L515,170 L430,120 Z"
                fill="#141B29"
                stroke="#2E374B"
                strokeWidth="1.5"
              />
              <path
                d="M555,105 L695,90 L735,195 L635,235 L560,180 Z"
                fill="#131B2E"
                stroke="#2E374B"
                strokeWidth="1.5"
              />
              <path
                d="M505,285 L680,265 L705,395 L565,425 L485,360 Z"
                fill="#1B162B"
                stroke="#372B53"
                strokeWidth="1.5"
              />
              <path
                d="M345,190 L445,180 L470,255 L405,295 L335,250 Z"
                fill="#211438"
                stroke="#8B5CF6"
                strokeWidth="1.5"
              />

              {/* Leyline fractures connecting to Cicatriz de Cinzas */}
              {WORLD_REGIONS.filter((r) => r.id !== 'cicatriz_cinzas').map((r) => (
                <line
                  key={`line-${r.id}`}
                  x1={(r.mapX / 100) * 800}
                  y1={(r.mapY / 100) * 480}
                  x2={400}
                  y2={230}
                  stroke={r.id === region.id ? r.color : 'rgba(255,255,255,0.09)'}
                  strokeDasharray="5 5"
                  strokeWidth={r.id === region.id ? 2 : 1}
                />
              ))}

              {/* Region Nodes */}
              {WORLD_REGIONS.map((r) => {
                const cx = (r.mapX / 100) * 800;
                const cy = (r.mapY / 100) * 480;
                const isSelected = r.id === region.id;
                return (
                  <g
                    key={r.id}
                    onClick={() => setSelectedRegionId(r.id)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 22 : 16}
                      fill={r.color}
                      fillOpacity={isSelected ? 0.25 : 0.14}
                      stroke={r.color}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <circle cx={cx} cy={cy} r={5} fill={r.color} />
                    <text
                      x={cx}
                      y={cy + 30}
                      textAnchor="middle"
                      fill={isSelected ? '#F5E6C4' : '#CBD5E1'}
                      fontSize="12"
                      fontWeight={isSelected ? '700' : '500'}
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {r.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Region Details & Boss Launchers */}
        <div className="lg:col-span-5 border border-white/10 bg-[#131822] rounded-xl p-5 space-y-5">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-[#D4A853]" />
              <span>{region.dangerLevel}</span>
              <span aria-hidden="true">·</span>
              <span>{region.subtitle}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#F5E6C4]">{region.name}</h3>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-[#D4A853]">
              Sub-História: {region.subStoryTitle}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">{region.subStoryText}</p>
            <div className="p-3 rounded-lg bg-[#0B0E14] border border-white/10 text-xs text-slate-300 space-y-1">
              <div>
                <strong className="text-slate-100">Gancho da Missão:</strong> {region.questHook}
              </div>
              <div>
                <strong className="text-slate-100">Conexão com Classes:</strong>{' '}
                {region.classConnection}
              </div>
            </div>
          </div>

          {/* Bosses in Region */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <h4 className="text-xs font-semibold text-slate-400">
              Chefes e Guardiões da Região ({regionBosses.length})
            </h4>
            <div className="space-y-2.5">
              {regionBosses.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-[#0B0E14] border border-white/10 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-medium text-[#D4A853]">
                        {b.category} · {b.maxHp.toLocaleString('pt-BR')} HP
                      </div>
                      <div className="font-display text-sm font-bold text-slate-100">
                        {b.name}
                      </div>
                      <div className="text-xs text-slate-400">{b.focus}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLaunchBoss(b.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#D4A853] text-[#0B0E14] hover:bg-[#E2BA6B] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      Enfrentar
                    </button>
                  </div>
                  {b.secretInteraction && (
                    <div className="text-[11px] text-[#C084FC]">
                      Segredo: {b.secretInteraction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Factions */}
      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold text-slate-100">
          As Três Facções em Guerra Silenciosa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FACTIONS.map((f) => (
            <div
              key={f.id}
              className="p-5 rounded-xl bg-[#131822] border border-white/10 space-y-2"
            >
              <div className="text-xs font-medium" style={{ color: f.color }}>
                Sede: {f.seat}
              </div>
              <h4 className="font-display text-base font-bold text-slate-100">{f.name}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{f.philosophy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Lore Chronicles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#D4A853]" />
          <h3 className="font-display text-xl font-bold text-slate-100">
            Crônicas do Grande Selo (Lore Principal)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LORE_CHRONICLES.map((ch) => (
            <article
              key={ch.id}
              className="p-5 rounded-xl bg-[#131822] border border-white/10 space-y-3"
            >
              <div className="text-xs font-medium text-[#D4A853]">{ch.chapter}</div>
              <h4 className="font-display text-base font-bold text-slate-100">{ch.title}</h4>
              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                {ch.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
