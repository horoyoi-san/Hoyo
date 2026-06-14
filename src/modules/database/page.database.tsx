"use client";

import { useTranslation } from "@/src/hooks/use-translation.hook";

import { Button } from "@/src/components/ui/button";
import { runStoreMigrations } from "@/src/store/store-migrations";
import { useUserStore } from "@/src/store/use-user.store";
import { Download, Upload, Trash2, Database, HardDrive, Shield } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import DeleteDialog from "@/src/components/dialog/delete.dialog";
import { useDialog } from "@/src/hooks/use-dialog.hook";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { UserStore } from "@/src/store/types";
import { motion } from "motion/react";

const DatabasePage = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteDialog = useDialog();
  const importDialog = useDialog();
  const [pendingImportData, setPendingImportData] = useState<UserStore | null>(
    null,
  );

  const charCount = useUserStore(
    (state) => Object.keys(state.characters).length,
  );
  const relicCount = useUserStore(
    (state) => Object.keys(state.relics).length,
  );

  // Listen for freesrImport events dispatched from Import page
  const handleFreesrImport = useCallback((e: Event) => {
    try {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      if (!detail.relics || !detail.characters) {
        toast.error(t("convertedDataNoRelics"));
        return;
      }

      const migrationData = runStoreMigrations(detail);
      setPendingImportData(migrationData as UserStore);
      importDialog.setOpen(true);
    } catch (err) {
      console.error(err);
      toast.error(t("failedToProcessImport"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener("freesrImport", handleFreesrImport as EventListener);
    return () =>
      window.removeEventListener("freesrImport", handleFreesrImport as EventListener);
  }, [handleFreesrImport]);

  const handleExport = () => {
    try {
      const currentState = useUserStore.getState();
      const dataStr = JSON.stringify(currentState, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `relic-FreeSR-${new Date().toISOString().split("T")[0]}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("databaseExported"));
    } catch (error) {
      console.error(error);
      toast.error(t("failedToExportDatabase"));
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const importedData = JSON.parse(result);

        if (!importedData.relics || !importedData.characters) {
          throw new Error("Invalid database format.");
        }

        const migrationData = runStoreMigrations(importedData);

        setPendingImportData(migrationData);
        importDialog.setOpen(true);
      } catch (error) {
        console.error(error);
        toast.error(t("invalidDatabaseFormat"));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (pendingImportData) {
      useUserStore.setState(pendingImportData);
      setPendingImportData(null);
      importDialog.setOpen(false);
      toast.success(t("databaseImported"));
    }
  };

  const handleDeleteDatabase = () => {
    try {
      useUserStore.setState({
        relics: {},
        characters: {},
      });
      toast.success(t("databaseCleared"));
      deleteDialog.setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(t("failedToClearDatabase"));
    }
  };

  return (
    <div className="wrapper space-y-4 py-4">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Database size={18} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t("database")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("manageLocalData")}
            </p>
          </div>
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04] flex items-center gap-3">
            <HardDrive size={16} className="text-muted-foreground" />
            <div>
              <p className="text-lg font-bold tabular-nums">{charCount}</p>
              <p className="text-xs text-muted-foreground">{t("characters")}</p>
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.04] flex items-center gap-3">
            <Shield size={16} className="text-muted-foreground" />
            <div>
              <p className="text-lg font-bold tabular-nums">{relicCount}</p>
              <p className="text-xs text-muted-foreground">{t("relics")}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-foreground"
            size="lg"
          >
            <Download className="w-4 h-4 mr-2" />
            {t("importDatabase")}
          </Button>

          <Button
            onClick={handleExport}
            className="flex-1"
            variant="secondary"
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t("exportDatabase")}
          </Button>

          <Button
            onClick={() => deleteDialog.setOpen(true)}
            size="lg"
            variant="destructive"
            className="px-4"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <DeleteDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.setOpen}
        onConfirm={handleDeleteDatabase}
        title="Delete Database"
        description="Are you sure you want to delete all data? This action cannot be undone."
      />
      <Dialog open={importDialog.open} onOpenChange={importDialog.setOpen}>
        <DialogContent
          className="max-w-xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("importDatabase")}</DialogTitle>
            <DialogDescription>
              This will replace all your current data with the imported data.
              Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => importDialog.setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button onClick={confirmImport}>{t("confirmImport")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabasePage;
