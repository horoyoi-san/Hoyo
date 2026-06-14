"use client";

import { useTranslation } from "@/src/hooks/use-translation.hook";

import { useUserStore } from "@/src/store/use-user.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Activity, ShieldCheck, Link as LinkIcon, Server } from "lucide-react";

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConnectionDialog = ({ open, onOpenChange }: ConnectionDialogProps) => {
  const { t } = useTranslation();
  const {
    connectionType,
    serverUrl,
    username,
    password,
    isConnectPS,
    setConnectionType,
    setServerUrl,
    setUsername,
    setPassword,
  } = useUserStore();

  const handleConnect = () => {
    // We will implement actual connect logic later, for now just toggle state if needed or show toast
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black/40 backdrop-blur-md border-white/10 p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/[0.05] bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20">
              <Server size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white/90">
                {t("psConnection")}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("configureConnection")}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          <div className="space-y-4 bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl">
            
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider ml-1">
                {t("connectionType")}
              </label>
              <Select value={connectionType} onValueChange={setConnectionType}>
                <SelectTrigger className="w-full bg-black/40 border-white/10 h-11 focus:ring-pink-500/50 relative z-50">
                  <SelectValue placeholder={t("selectType")} />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="bg-[#121214] border-white/10 z-[100]">
                  <SelectItem value="FireflyGo">{t("fireflyGo")}</SelectItem>
                  <SelectItem value="RobinSR">{t("robinSr")}</SelectItem>
                  <SelectItem value="Other">{t("other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider ml-1">
                {t("serverUrl")}
              </label>
              <Input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://127.0.0.1:8080"
                className="bg-black/40 border-white/10 h-11 focus-visible:ring-pink-500/50 transition-all placeholder:text-white/20"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider ml-1">
                  {t("username")}
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("admin")}
                  className="bg-black/40 border-white/10 h-11 focus-visible:ring-pink-500/50 transition-all placeholder:text-white/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider ml-1">
                  {t("password")}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-black/40 border-white/10 h-11 focus-visible:ring-pink-500/50 transition-all placeholder:text-white/20"
                />
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white/50">{t("statusLabel")}</span>
              {isConnectPS ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                  <ShieldCheck size={16} />
                  {t("connected")}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold">
                  <Activity size={16} />
                  {t("unconnected")}
                </div>
              )}
            </div>

            <Button
              onClick={handleConnect}
              className="bg-pink-500 hover:bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all px-8 h-11 font-semibold rounded-xl"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              {t("connectPs")}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default ConnectionDialog;
