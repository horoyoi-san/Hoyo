"use client";

import { Button } from "@/src/components/ui/button";
import { Plus, Gem } from "lucide-react";
import { useRouter } from "next/navigation";
import RelicList from "./components/relic-list";
import {
  DEFAULT_CREATE_RELIC,
  useCreateRelicStore,
} from "./modules/store/use-create-relic.store";
import { motion } from "motion/react";
import { useUserStore } from "@/src/store/use-user.store";
import { useTranslation } from "@/src/hooks/use-translation.hook";

const RelicPage = () => {
  const updateRelic = useCreateRelicStore((state) => state.updateRelic);
  const router = useRouter();
  const { t } = useTranslation();
  const relicCount = useUserStore(
    (state) => Object.keys(state.relics).length,
  );

  return (
    <div className="wrapper py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <Gem size={18} className="text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t("relicStore")}</h1>
              <p className="text-sm text-muted-foreground">
                {relicCount} {t("relicsInCollection")}
              </p>
            </div>
          </div>
          <Button
            className="bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12] text-foreground font-medium"
            onClick={() => {
              updateRelic(DEFAULT_CREATE_RELIC);
              router.push("/relic/create");
            }}
          >
            <Plus size={16} className="mr-1.5" />
            {t("create")}
          </Button>
        </div>

        {/* Relic List */}
        <RelicList />
      </motion.div>
    </div>
  );
};

export default RelicPage;
