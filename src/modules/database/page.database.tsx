"use client";

import { Button } from "@/src/components/ui/button";
import { runStoreMigrations } from "@/src/store/store-migrations";
import { useUserStore } from "@/src/store/use-user.store";
import { Download, Upload, Trash2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
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

const DatabasePage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteDialog = useDialog();
  const importDialog = useDialog();
  const [pendingImportData, setPendingImportData] = useState<UserStore | null>(
    null,
  );

  // Listen for freesrImport events dispatched from Import page
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        // @ts-ignore
        const detail = (e as CustomEvent).detail;
        if (!detail) return;

        // validate basic shape
        if (!detail.relics || !detail.characters) {
          toast.error("Converted data does not contain relics/characters");
          return;
        }

        const migrationData = runStoreMigrations(detail);
        setPendingImportData(migrationData as UserStore);
        importDialog.setOpen(true);
      } catch (err) {
        console.error(err);
        toast.error("Failed to process imported data");
      }
    };

    window.addEventListener("freesrImport", handler as EventListener);
    return () => window.removeEventListener("freesrImport", handler as EventListener);
  }, []);

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

      toast.success("Database exported successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export database.");
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
        toast.error("Invalid database format.");
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
      toast.success("Database imported successfully!");
    }
  };

  const handleDeleteDatabase = () => {
    try {
      useUserStore.setState({
        relics: {},
        characters: {},
      });
      toast.success("Database cleared successfully!");
      deleteDialog.setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear database.");
    }
  };

  return (
    <div className="wrapper card space-y-4">
      <h1 className="text-xl font-semibold">Database</h1>
      <div>
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
            className="flex-1"
            size={"lg"}
          >
            <Download className="w-4 h-4 mr-2" />
            Import Database
          </Button>

          <Button
            onClick={handleExport}
            className="flex-1"
            variant="secondary"
            size={"lg"}
          >
            <Upload className="w-4 h-4 mr-2" />
            Export Database
          </Button>

          <Button
            onClick={() => deleteDialog.setOpen(true)}
            size={"lg"}
            variant="destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
            <DialogTitle>Import Database</DialogTitle>
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
              Cancel
            </Button>
            <Button onClick={confirmImport}>Confirm Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabasePage;
