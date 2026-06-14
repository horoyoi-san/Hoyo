"use client";

import { useUserStore } from "@/src/store/use-user.store";
import { motion } from "motion/react";
import { ArrowRight, Download, Upload, Database, Layers, Users, Gem } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/src/hooks/use-translation.hook";

const statCards = [
  {
    label: "characters",
    icon: Users,
    selector: (state: ReturnType<typeof useUserStore.getState>) =>
      Object.keys(state.characters).length,
    href: "/character",
    delay: 0.1,
  },
  {
    label: "relics",
    icon: Gem,
    selector: (state: ReturnType<typeof useUserStore.getState>) =>
      Object.keys(state.relics).length,
    href: "/relic",
    delay: 0.15,
  },
  {
    label: "equipped",
    icon: Layers,
    selector: (state: ReturnType<typeof useUserStore.getState>) =>
      Object.values(state.relics).filter(
        (r) => r.equipped_by && r.equipped_by.length > 0,
      ).length,
    href: "/relic",
    delay: 0.2,
  },
];

const quickActions = [
  {
    label: "importData",
    desc: "importDataDesc",
    icon: Download,
    href: "/import",
    delay: 0.25,
  },
  {
    label: "exportConfig",
    desc: "exportConfigDesc",
    icon: Upload,
    href: "/export",
    delay: 0.3,
  },
  {
    label: "database",
    desc: "databaseDesc",
    icon: Database,
    href: "/database",
    delay: 0.35,
  },
];

export default function Home() {
  const { t } = useTranslation();
  const charCount = useUserStore(
    (state) => Object.keys(state.characters).length,
  );
  const relicCount = useUserStore(
    (state) => Object.keys(state.relics).length,
  );
  const equippedCount = useUserStore(
    (state) =>
      Object.values(state.relics).filter(
        (r) => r.equipped_by && r.equipped_by.length > 0,
      ).length,
  );

  const counts = [charCount, relicCount, equippedCount];

  return (
    <div className="wrapper py-4 space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-8 relative overflow-hidden"
      >
        {/* Decorative gradient orb */}
        <div className="absolute -top-20 -right-20 size-60 rounded-full bg-gradient-to-br from-white/[0.03] to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            relic<span className="text-muted-foreground">·</span>{t("freeSr")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-lg leading-relaxed">
            {t("homeDescription")}
          </p>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: card.delay, duration: 0.4 }}
            >
              <Link
                href={card.href}
                className="glass-panel p-5 flex items-center gap-4 group hover:bg-white/[0.05] transition-colors duration-300 block"
                prefetch={false}
              >
                <div className="size-11 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                  <Icon size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {counts[idx]}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium tracking-wide">
                    {t(card.label)}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-semibold text-muted-foreground tracking-wider uppercase px-1"
        >
          {t("quickActions")}
        </motion.h2>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: action.delay, duration: 0.4 }}
              >
                <Link
                  href={action.href}
                  className="glass-panel p-5 group hover:bg-white/[0.05] transition-all duration-300 flex flex-col justify-between h-full block"
                  prefetch={false}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="size-10 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                      <Icon
                        size={18}
                        className="text-muted-foreground group-hover:text-foreground transition-colors"
                      />
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-white/0 group-hover:text-muted-foreground transition-all duration-300 translate-x-0 group-hover:translate-x-0.5"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {t(action.label)}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(action.desc)}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
