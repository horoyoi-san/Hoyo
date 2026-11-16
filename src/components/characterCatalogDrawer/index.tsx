"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import AvatarBar from "@/components/avatarBar";

export default function CharacterCatalogDrawer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const transI18n = useTranslations("DataPage");

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[aria-labelledby="character-filter-title"]')) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      {!isOpen && (
        <>
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
            onClick={() => router.push("/settings")}
            className="fixed bottom-[12px] left-16 z-[60] hidden h-10 w-10 items-center justify-center rounded-full border border-base-content/20 bg-base-100/35 text-base-content shadow-lg backdrop-blur-md transition-colors hover:bg-base-100/55 sm:flex"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={transI18n("avatars")}
            aria-expanded={isOpen}
            title={transI18n("avatars")}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-[12px] left-4 z-[60] hidden h-10 w-10 items-center justify-center rounded-full border border-base-content/20 bg-base-100/35 text-base-content shadow-lg backdrop-blur-md transition-colors hover:bg-base-100/55 sm:flex"
          >
            <Menu className="h-5 w-5" />
          </button>
        </>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={transI18n("cancel")}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/10"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={transI18n("avatars")}
            className="absolute inset-y-0 left-0 flex w-[382px] max-w-[88vw] flex-col border-r border-base-content/15 bg-base-100/90 shadow-2xl backdrop-blur-xl"
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <AvatarBar compact onClose={() => setIsOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
