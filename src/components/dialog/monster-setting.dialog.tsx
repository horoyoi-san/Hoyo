"use client";

import { useTranslation } from "@/src/hooks/use-translation.hook";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { useUserStore } from "@/src/store/use-user.store";
import { Swords, X, Check, Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import EnemyCard, { EnemyData } from "../enemy/enemy-card.component";
import { useGetBattleEvents, useGetMonsterDict } from "@/src/hooks/use-battle-events.hook";

interface MonsterSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS = [
  { id: "moc", label: "Memory of Chaos" },
  { id: "pf", label: "Pure Fiction" },
  { id: "as", label: "Apocalyptic Shadow" },
  { id: "peak", label: "Anomaly Arbitration" },
  { id: "custom", label: "Custom Enemy" },
  { id: "su", label: "Simulated Universe" },
];

const getLocaleName = (nameObj?: Record<string, string>) => {
  if (!nameObj) return "Unknown";
  return nameObj["th"] || nameObj["en"] || Object.values(nameObj)[0] || "Unknown";
};

const MonsterSettingDialog = ({ open, onOpenChange }: MonsterSettingDialogProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const { moc_config } = useUserStore();

  const { data: monsterDict } = useGetMonsterDict();
  const { data: battleEvents } = useGetBattleEvents(activeTab);

  // Selections
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<string>("1");

  // Sync state when data loads
  useMemo(() => {
    if (battleEvents && Object.keys(battleEvents).length > 0) {
      const firstEventId = Object.keys(battleEvents)[0];
      if (!selectedEventId || !battleEvents[selectedEventId]) {
        setSelectedEventId(firstEventId);
      }
    }
  }, [battleEvents, selectedEventId]);

  useMemo(() => {
    if (battleEvents && selectedEventId && battleEvents[selectedEventId]) {
      const levels = battleEvents[selectedEventId].Level;
      if (levels && Object.keys(levels).length > 0) {
        const firstFloor = Object.keys(levels)[0];
        if (!selectedFloor || !levels[selectedFloor]) {
          setSelectedFloor(firstFloor);
        }
      }
    }
  }, [battleEvents, selectedEventId, selectedFloor]);

  const activeEvent = battleEvents?.[selectedEventId];
  const activeLevel = activeEvent?.Level?.[selectedFloor];

  const renderWaveEnemies = (waveMonsterIds: number[]) => {
    return waveMonsterIds.map((monsterId, idx) => {
      const mData = monsterDict?.[monsterId];
      if (!mData) return null;

      const enemy: EnemyData = {
        id: `${monsterId}-${idx}`,
        name: getLocaleName(mData.Name),
        level: 95,
        hp: Math.round(mData.Base.HPBase * 100), // simplified
        speed: Math.round(mData.Base.SpeedBase),
        toughness: mData.Base.StanceBase,
        weaknesses: mData.StanceWeakList || [],
        imageUrl: `https://cdn.punklorde.org/asbres/${mData.Image.IconPath}`,
      };

      return <EnemyCard key={enemy.id} enemy={enemy} />;
    });
  };

  const renderNode = (nodeName: string, eventList: any[]) => {
    if (!eventList || eventList.length === 0) return null;

    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-lg font-bold text-sky-400 mb-4">{nodeName}</h4>
        <div className="space-y-4">
          {eventList.map((waveData, waveIdx) => (
            <div key={waveIdx}>
              <h5 className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                {t("wave")} {waveIdx + 1}
              </h5>
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
                {waveData.MonsterList?.map((waveMonsterIds: number[], subWaveIdx: number) => (
                  <div key={subWaveIdx} className="contents">
                    {renderWaveEnemies(waveMonsterIds)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isComingSoon = activeTab === "custom" || activeTab === "su";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[90vw] h-[85vh] bg-[#0A0A0C]/95 backdrop-blur-md border-white/[0.08] p-0 overflow-hidden flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-white/[0.05] bg-gradient-to-r from-white/[0.02] to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20">
              <Swords size={20} />
            </div>
            <DialogTitle className="text-xl font-bold text-white/90">
              {t("monsterSetting")}
            </DialogTitle>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-white/[0.05] shrink-0 overflow-x-auto custom-scrollbar-horizontal">
          <div className="flex items-center gap-2 pb-[-1px]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedEventId("");
                  setSelectedFloor("");
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-amber-400 text-amber-400 bg-amber-400/10"
                    : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.02]"
                }`}
              >
                {t(tab.id) || tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-white/[0.02] [&::-webkit-scrollbar-track]:rounded-lg [&::-webkit-scrollbar-thumb]:bg-white/[0.15] [&::-webkit-scrollbar-thumb]:rounded-lg [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-[#0A0A0C] hover:[&::-webkit-scrollbar-thumb]:bg-white/30">

          {!isComingSoon ? (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              {/* Event Selector Box */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                <div className="p-4 border-b border-amber-500/20 bg-amber-500/10 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-amber-50 text-lg">
                      {activeEvent ? getLocaleName(activeEvent.Name) : "Loading..."}
                    </h3>
                  </div>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-[300px] bg-black/40 border-amber-500/20 text-amber-50 relative z-50">
                      <SelectValue placeholder={t("selectEvent")} />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4} className="z-[100] max-h-96">
                      {battleEvents && Object.entries(battleEvents).reverse().map(([id, ev]) => (
                        <SelectItem key={id} value={id}>{getLocaleName(ev.Name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{t("floor")}</label>
                    <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                      <SelectTrigger className="w-full bg-black/40 border-white/10 relative z-50">
                        <SelectValue placeholder={t("selectFloor")} />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[100] max-h-96">
                        {activeEvent?.Level && Object.entries(activeEvent.Level).reverse().map(([id, level]) => (
                          <SelectItem key={id} value={id}>{getLocaleName(level.Name)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{t("side")}</label>
                    <Select value={selectedNode} onValueChange={setSelectedNode}>
                      <SelectTrigger className="w-full bg-black/40 border-white/10 relative z-50">
                        <SelectValue placeholder={t("selectNode")} />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[100]">
                        <SelectItem value="1">{t("firstNode")}</SelectItem>
                        <SelectItem value="2">{t("secondNode")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 pt-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cycle" defaultChecked className="border-amber-500/50 data-[state=checked]:bg-amber-500" />
                      <label htmlFor="cycle" className="text-sm font-medium leading-none text-amber-50">
                        {t("useCycleCount")}
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="px-5 pb-5">
                   <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center space-x-2">
                      <Checkbox id="buff" defaultChecked className="border-amber-500/50 data-[state=checked]:bg-amber-500" />
                      <label htmlFor="buff" className="text-sm font-medium leading-none text-amber-50">
                        {t("useTurbulenceBuff")}
                      </label>
                   </div>
                </div>
              </div>

              {/* Enemy Nodes */}
              {activeLevel && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(selectedNode === "1" || selectedNode === "0") && renderNode(t("firstNodeEnemies"), activeLevel.EventList1 || [])}
                  {(selectedNode === "2" || selectedNode === "0") && renderNode(t("secondNodeEnemies"), activeLevel.EventList2 || [])}
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex items-center justify-center flex-col opacity-50">
              <Swords size={48} className="mb-4 text-white/20" />
              <p className="text-xl font-bold">{t("comingSoon")}</p>
              <p className="text-sm">{t("battleModeComingSoon") || "This battle mode will be added in a future update."}</p>
            </div>
          )}

        </div>

      </DialogContent>
    </Dialog>
  );
};

export default MonsterSettingDialog;
