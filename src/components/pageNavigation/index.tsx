"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import useCurrentDataStore from "@/stores/currentDataStore";
import useDetailDataStore from "@/stores/detailDataStore";
import useLocaleStore from "@/stores/localeStore";
import useModelStore from "@/stores/modelStore";
import { getNameChar } from "@/helper";
import { useShallow } from "zustand/react/shallow";

const detailMenu = [
  { label: "characterInformation", path: "", action: undefined, icon: "/theme/icon/misc/IconAvatarDetail.png" },
  { label: "lightcone", path: "lightcone", action: undefined, icon: "/theme/icon/misc/IconAvatarLightCone.png" },
  { label: "trace", path: "skills-info", action: undefined, icon: "/theme/icon/misc/IconAvatarPaths.png" },
  { label: "relic", path: "relics-info", action: undefined, icon: "/theme/icon/misc/IconAvatarRelic.png" },
  { label: "eidolon", path: "eidolons-info", action: undefined, icon: "/theme/icon/misc/IconAvatarRank.png" },
  { label: "showcaseCard", path: "showcase-card", action: undefined, icon: "/theme/icon/misc/DataIcon.png" },
  { label: "pickEnemy", path: "", action: "enemy", icon: "/theme/icon/misc/MonsterIcon.webp" },
] as const

export default function PageNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const transI18n = useTranslations("DataPage");
  const locale = useLocaleStore((state) => state.locale);
  const avatarSelected = useCurrentDataStore((state) => state.avatarSelected);
  const baseType = useDetailDataStore((state) => state.baseType);
  const { isOpenMonster, setIsOpenMonster } = useModelStore(
    useShallow((state) => ({
      isOpenMonster: state.isOpenMonster,
      setIsOpenMonster: state.setIsOpenMonster,
    }))
  );
  const currentPath = pathname?.replace(/^\//, "") || "";

  const navigate = (path: string) => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
      document.querySelector("[data-page-scroll]")?.scrollTo({ top: 0, behavior: "instant" });
    }
    router.push(`/${path}`, { scroll: false });
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 px-3 py-4 md:px-1 md:py-6">
      {avatarSelected && (
        <div className="flex min-h-18 items-center gap-4.5 px-6">
          {baseType?.[avatarSelected.BaseType]?.Icon && (
            <Image
              src={`${process.env.CDN_URL}/${baseType[avatarSelected.BaseType].Icon}`}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">
              {transI18n(currentPath === "lightcone-picker" ? "lightconePicker" : currentPath === "lightcone" ? "lightcone" : "characterInformation")}
            </p>
            <p className="truncate text-xs font-medium text-base-content/80">
              {transI18n(avatarSelected.BaseType.toLowerCase())} / {getNameChar(locale, transI18n, avatarSelected)}
            </p>
          </div>
        </div>
      )}
      <nav
        aria-label="Page navigation"
        className="ml-2 mt-2 flex w-[calc(100%-3rem)] flex-col gap-2 md:ml-[64px] md:w-[calc(100%-4rem)] xl:w-[calc(100%-5.75rem)]"
      >
        {detailMenu.map((item) => {
          const isLightconePage = item.path === "lightcone" && currentPath === "lightcone-picker";
          const isActive = item.action === "enemy" ? isOpenMonster : currentPath === item.path || isLightconePage;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.action === "enemy") {
                  setIsOpenMonster(true);
                } else {
                  navigate(item.path);
                }
              }}
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center gap-4 rounded-xl px-6 py-1.5 text-left text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-transparent text-primary"
                  : "bg-transparent text-base-content/75 hover:bg-base-100/10 hover:text-base-content"
              }`}
            >
              <Image src={item.icon} alt="" width={20} height={20} className="h-8 w-8 shrink-0 object-contain" />
              <span>{transI18n(item.label)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
