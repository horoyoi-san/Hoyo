"use client";

import { useTranslation } from "@/src/hooks/use-translation.hook";

import { useGetRelicSets } from "../hooks/use-get-relic-sets.hook";
import { useGetRelics } from "../hooks/use-get-relics.hook";
import {
  DEFAULT_CREATE_RELIC,
  useCreateRelicStore,
} from "./store/use-create-relic.store";
import { useMemo } from "react";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import { useGetMainAffixes } from "../hooks/use-get-main-affixes.hook";
import TypeCreateRelic from "./components/type.create-relic";
import SetCreateRelic from "./components/set.create-relic";
import MainAffixCreateRelic from "./components/main-affix.create-relic";
import SubAffixCreateRelic from "./components/sub-affix.create-relic";
import { useUserStore } from "@/src/store/use-user.store";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { RelicConfigStore } from "@/src/store/types";
import RelicCard from "../components/relic-card";
import { Eye } from "lucide-react";

const CreateRelicPage = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const addRelic = useUserStore((state) => state.addRelic);
  const editRelic = useUserStore((state) => state.editRelic);

  const updateRelic = useCreateRelicStore((state) => state.updateRelic);
  const relic = useCreateRelicStore((state) => state.relic);

  const parsedDesc = useParsedDesc();

  // DATA
  const { data: allRelics } = useGetRelics();
  const { data: allRelicSets } = useGetRelicSets();
  const { data: mainAffixes } = useGetMainAffixes();

  const currentRelicData = useMemo(
    () => Object.values(allRelics ?? {}).find((d) => d.id === relic.relic_id),
    [allRelics, relic.relic_id],
  );

  const currentMainAffixData = useMemo(() => {
    if (!mainAffixes || !currentRelicData?.main_affix_id) return;

    return mainAffixes?.[currentRelicData?.main_affix_id];
  }, [mainAffixes, currentRelicData?.main_affix_id]);

  const mainAffixProperty = useMemo(() => {
    if (!currentMainAffixData || !relic.main_affix_id) return;

    return Object.values(currentMainAffixData ?? {}).find(
      (item) => item.AffixID === relic.main_affix_id,
    )?.Property;
  }, [currentMainAffixData, relic.main_affix_id]);

  const transformedSubAffixes = useMemo(() => {
    return relic.sub_affixes.map((sub) => {
      const totalStep = (sub.steps ?? []).reduce(
        (acc, curr) => acc + curr,
        0,
      );

      return {
        sub_affix_id: sub.sub_affix_id,
        count: sub.count,
        step: totalStep,
      };
    });
  }, [relic.sub_affixes]);

  const previewRelic = useMemo(() => {
    return {
      ...relic,
      sub_affixes: transformedSubAffixes,
    } as RelicConfigStore;
  }, [relic, transformedSubAffixes]);

  return (
    <div className="wrapper card grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="flex justify-between lg:col-span-12 -mb-6 border-b border-white/[0.08] pb-2">
        <p className="text-2xl font-bold">
          {relic.id ? "Edit" : "Create"} Relic
        </p>
        <Button
          variant={"secondary"}
          className="justify-self-end font-semibold"
          onClick={() => {
            const missingSubStat = relic.sub_affixes.some(
              (r) => !r.sub_affix_id,
            );
            if (
              !relic.type ||
              !relic.relic_set_id ||
              !relic.main_affix_id ||
              missingSubStat
            )
              return toast.warning("Please complete all relic fields.");

            if (relic.id) {
              editRelic(relic.id, previewRelic);
              toast.success(t("relicHasBeenUpdated"));
            } else {
              addRelic(previewRelic);
              toast.success(t("relicHasBeenAdded"));
            }

            updateRelic(DEFAULT_CREATE_RELIC);
            router.push("/relic");
          }}
        >
          {t("save")}
        </Button>
      </div>

      {/* LEFT COL: Set & Main Stat */}
      <div className="space-y-4 lg:col-span-5">
        <p className="text-xl font-semibold">{t("relicSet")}</p>
        <div className="flex gap-4">
          {/* TYPE */}
          <TypeCreateRelic />

          <div className="flex-1 space-y-2">
            {/* SET */}
            <SetCreateRelic />

            {/* MAIN STAT */}
            <MainAffixCreateRelic
              currentMainAffixData={currentMainAffixData}
              currentRelicData={currentRelicData}
            />
          </div>
        </div>

        {/* SET BONUS */}
        <div className="pt-2">
          {!!relic.relic_set_id &&
            allRelicSets?.[relic.relic_set_id].set_bonus.map(
              ([count, bonus]) => {
                const params = bonus.properties.map((p) => p.value);

                const htmlContent = parsedDesc(bonus.desc, params);

                return (
                  <div key={count} className="mb-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                    <h4 className="font-bold text-[#00c3ff]">{count}-Piece:</h4>
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  </div>
                );
              },
            )}
        </div>
      </div>

      {/* MID COL: Sub Stats */}
      <div className="lg:col-span-4">
        {/* SUB STAT */}
        <SubAffixCreateRelic mainAffixProperty={mainAffixProperty} />
      </div>

      {/* RIGHT COL: Live Preview */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center gap-2">
          <Eye size={20} className="text-[#00c3ff]" />
          <p className="text-xl font-semibold">{t("livePreview")}</p>
        </div>
        
        <div className="h-[300px] w-full max-w-[240px] mx-auto xl:mx-0 relative">
          {relic.relic_id ? (
            <div className="absolute inset-0 ring-1 ring-white/10 rounded-xl bg-black/20 shadow-2xl overflow-hidden">
              <RelicCard relic={previewRelic} />
            </div>
          ) : (
            <div className="h-full w-full border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-white/30 gap-2 bg-white/[0.01]">
              <Eye size={32} />
              <p className="text-sm font-medium text-center px-4">{t("selectTypeAndSet")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRelicPage;
