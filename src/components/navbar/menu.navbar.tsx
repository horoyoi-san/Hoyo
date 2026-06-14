"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useUserStore } from "@/src/store/use-user.store";
import { Settings, Swords, Globe } from "lucide-react";
import { useState } from "react";
import ConnectionDialog from "../dialog/connection.dialog";
import MonsterSettingDialog from "../dialog/monster-setting.dialog";
import { useTranslation } from "@/src/hooks/use-translation.hook";
import { useI18nStore } from "@/src/store/use-i18n.store";

const MENU_LIST = [
  { href: "/character", label: "characterPage" },
  { href: "/relic", label: "relicStore" },
  { href: "/import", label: "importData" },
  { href: "/export", label: "exportConfig" },
  { href: "/database", label: "database" },
];

const MenuNavbar = () => {
  const pathname = usePathname();
  const isConnectPS = useUserStore((state) => state.isConnectPS);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showMonsterDialog, setShowMonsterDialog] = useState(false);
  const { t } = useTranslation();
  const { language, setLanguage } = useI18nStore();

  const toggleLanguage = () => {
    setLanguage(language === "th" ? "en" : "th");
  };

  return (
    <>
      <nav className="wrapper mt-6 mb-8 px-2 flex items-center gap-1 p-1.5 glass-panel">
        {/* App Branding */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-4 py-1.5 mr-2 shrink-0 group"
          prefetch={false}
        >
          <div className="relative">
            <div className="size-7 rounded-lg bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/[0.08] group-hover:border-white/[0.15] transition-colors">
              <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                R
              </span>
            </div>
          </div>
          <span className="text-[13px] font-semibold text-white/60 group-hover:text-white/90 transition-colors tracking-wider hidden sm:block">
            relic<span className="text-white/30 mx-0.5">·</span>{t("freeSr")}
          </span>
        </Link>

        {/* Separator */}
        <div className="w-px h-5 bg-white/[0.08] mr-1 shrink-0" />

        {/* Nav Links */}
        <div className="flex items-center gap-0.5 flex-1 justify-center">
          {MENU_LIST.map((item) => {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 text-[13px] font-medium transition-all duration-300 rounded-xl outline-none
                ${isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                  }`}
              >
                <span className="relative z-10 tracking-wide">{t(item.label)}</span>

                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.08] rounded-xl shadow-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings Actions */}
        <div className="flex items-center gap-1.5 px-3 shrink-0 mr-2 border-r border-white/[0.08] pr-4">
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-all mr-2"
          >
            <Globe size={14} />
            <span>{language.toUpperCase()}</span>
          </button>
          <button
            onClick={() => setShowConnectionDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Settings size={14} />
            <span>{t("connectSetting")}</span>
          </button>
          <button
            onClick={() => setShowMonsterDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <Swords size={14} />
            <span>{t("monsterSetting")}</span>
          </button>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 px-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div
              className={`size-2 rounded-full transition-colors duration-500 ${isConnectPS
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                : "bg-white/20"
                }`}
            />
            <span className="text-[11px] text-muted-foreground font-medium tracking-wide hidden lg:block">
              {isConnectPS ? t("connected") : t("unconnected")}
            </span>
          </div>
        </div>
      </nav>

      <ConnectionDialog
        open={showConnectionDialog}
        onOpenChange={setShowConnectionDialog}
      />
      <MonsterSettingDialog
        open={showMonsterDialog}
        onOpenChange={setShowMonsterDialog}
      />
    </>
  );
};

export default MenuNavbar;
