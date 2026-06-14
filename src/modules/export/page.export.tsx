"use client";

import { useTranslation } from "@/src/hooks/use-translation.hook";

import { Button } from "@/src/components/ui/button";
import { useUserStore } from "@/src/store/use-user.store";
import { generateConfigJson } from "./utils/helpers";
import { downloadJson } from "@/src/utils/json";
import { motion } from "motion/react";
import { Download, FileJson, AlertCircle, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const ExportPage = () => {
  const { t } = useTranslation();
  const characters = useUserStore((state) => state.characters);
  const relics = useUserStore((state) => state.relics);
  const [lastExported, setLastExported] = useState<string | null>(null);

  const exportData = useMemo(
    () => generateConfigJson(Object.values(characters), relics),
    [characters, relics],
  );

  const validCharCount = exportData.avatar_config.length;
  const totalCharCount = Object.keys(characters).length;
  const skippedCount = totalCharCount - validCharCount;

  const handleExport = () => {
    const success = downloadJson("config", exportData);
    if (success) {
      setLastExported(new Date().toLocaleTimeString());
      toast.success(t("configExportedSuccessfully"));
    } else {
      toast.error(t("failedToExportConfig"));
    }
  };

  const handleExportRaw = () => {
    const currentState = useUserStore.getState();
    const rawData = {
      characters: currentState.characters,
      relics: currentState.relics,
      battle_type: currentState.battle_type,
      moc_config: currentState.moc_config,
      pf_config: currentState.pf_config,
      as_config: currentState.as_config,
      ce_config: currentState.ce_config,
      peak_config: currentState.peak_config,
    };
    const success = downloadJson(
      `relic-FreeSR-full-${new Date().toISOString().split("T")[0]}`,
      rawData,
    );
    if (success) {
      toast.success(t("fullDatabaseExported"));
    } else {
      toast.error(t("failedToExport"));
    }
  };

  return (
    <div className="wrapper space-y-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t("export")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("downloadYourConfig")}
            </p>
          </div>
          {lastExported && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.04] px-3 py-1.5 rounded-lg">
              <Check size={12} className="text-emerald-400" />
              Last export: {lastExported}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-2xl font-bold tabular-nums">{validCharCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("validCharacters")}
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-2xl font-bold tabular-nums">
              {Object.keys(relics).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("totalRelics")}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-2xl font-bold tabular-nums">{skippedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("skipped")}</p>
          </div>
        </div>

        {/* Warning */}
        {skippedCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-500/[0.06] border border-amber-500/[0.1] rounded-xl p-4">
            <AlertCircle
              size={16}
              className="text-amber-400 mt-0.5 shrink-0"
            />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              {skippedCount} character{skippedCount > 1 ? "s" : ""} will be
              skipped because they are missing a lightcone or relic slots.
            </p>
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleExport}
            size="lg"
            className="flex-1 bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12] text-foreground font-medium"
          >
            <Download size={16} className="mr-2" />
            {t("downloadConfigJson")}
          </Button>
          <Button
            onClick={handleExportRaw}
            size="lg"
            variant="secondary"
            className="flex-1"
          >
            <FileJson size={16} className="mr-2" />
            {t("exportFullDatabase")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ExportPage;
