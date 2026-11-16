"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import { motion, useAnimation } from "framer-motion";
import useModelStore from "@/stores/modelStore";
import useCurrentDataStore from "@/stores/currentDataStore";
import useLocaleStore from "@/stores/localeStore";
import { usePathname } from "next/navigation";
import { getLocaleName } from "@/helper";
import QuickView from "./index";
import { NeedAvatarDetail, NeedLightconeAndRelic } from "../requireData";
import { useShallow } from "zustand/react/shallow";

export default function QuickViewBubble() {
  const pathname = usePathname();
  const transI18n = useTranslations("DataPage");
  const { isOpenQuickView, setIsOpenQuickView } = useModelStore(
    useShallow((state) => ({
      isOpenQuickView: state.isOpenQuickView,
      setIsOpenQuickView: state.setIsOpenQuickView,
    }))
  );

  const { avatarSelected } = useCurrentDataStore(
    useShallow((state) => ({ avatarSelected: state.avatarSelected }))
  );

  const { locale } = useLocaleStore(
    useShallow((state) => ({ locale: state.locale }))
  );

  const controls = useAnimation();
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenQuickView) {
        setIsOpenQuickView(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpenQuickView, setIsOpenQuickView]);

  useEffect(() => {
    const handleResize = () => {
      controls.start((current) => {
        const curX = typeof current?.x === "number" ? current.x : 0;
        const curY = typeof current?.y === "number" ? current.y : 0;
        const btnSize = window.innerWidth < 640 ? 48 : 56;
        const baseLeft = pathname === "/"
          ? (window.innerWidth < 640 ? 12 : 208)
          : window.innerWidth - btnSize - 24;
        const currentLeft = baseLeft + curX;
        const isLeft = currentLeft < window.innerWidth / 2;
        const targetLeft = isLeft ? 24 : window.innerWidth - btnSize - 24;
        const targetX = targetLeft - baseLeft;
        const restingTop = window.innerHeight - 112 - btnSize;
        const curTop = restingTop + curY;
        const clampedTop = Math.max(72, Math.min(window.innerHeight - btnSize - 60, curTop));
        const targetY = clampedTop - restingTop;
        return { x: targetX, y: targetY };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [controls, pathname]);

  if (!avatarSelected) return null;

  const charName = avatarSelected.Name
    ? getLocaleName(locale, avatarSelected.Name) || transI18n("character")
    : transI18n("character");

  const handleDragStart = (_: unknown, info: { point: { x: number; y: number } }) => {
    isDraggingRef.current = false;
    dragStartPosRef.current = { x: info.point.x, y: info.point.y };
  };

  const handleDrag = (_: unknown, info: { point: { x: number; y: number } }) => {
    const dx = Math.abs(info.point.x - dragStartPosRef.current.x);
    const dy = Math.abs(info.point.y - dragStartPosRef.current.y);
    if (dx > 5 || dy > 5) {
      isDraggingRef.current = true;
    }
  };

  const handleDragEnd = (_: unknown, info: { point: { x: number; y: number } }) => {
    const btnSize = window.innerWidth < 640 ? 48 : 56;
    const padding = 24;
    const currentX = info.point.x;
    const currentY = info.point.y;

    const isLeft = currentX < window.innerWidth / 2;
    const baseLeft = pathname === "/"
      ? (window.innerWidth < 640 ? 12 : 208)
      : window.innerWidth - btnSize - padding;
    const targetLeft = isLeft ? padding : window.innerWidth - padding - btnSize;
    const targetX = targetLeft - baseLeft;

    const restingTop = window.innerHeight - 112 - btnSize;
    const targetTop = Math.max(72, Math.min(window.innerHeight - btnSize - 60, currentY - btnSize / 2));
    const targetY = targetTop - restingTop;

    controls.start({
      x: targetX,
      y: targetY,
      transition: { type: "spring", stiffness: 450, damping: 30 },
    });

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleBubbleClick = () => {
    if (!isDraggingRef.current) {
      setIsOpenQuickView(true);
    }
  };

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.12}
        animate={controls}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={`fixed bottom-24 z-9990 select-none touch-none cursor-grab active:cursor-grabbing ${
          pathname === "/" ? "left-3 right-auto sm:left-52" : "right-5 sm:right-6"
        } sm:bottom-28`}
      >
        <button
          type="button"
          onClick={handleBubbleClick}
          className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-base-100/85 dark:bg-base-200/90 border border-primary/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-primary hover:shadow-[0_0_24px_rgba(var(--color-primary),0.45)] hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
          title={`${transI18n("quickView")} (${charName})`}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-primary via-accent to-secondary flex items-center justify-center text-primary-content shadow-sm group-hover:rotate-12 transition-transform duration-300">
            <Layers className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
          </div>

          <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        </button>
      </motion.div>

      {isOpenQuickView && (
        <dialog
          id="global_quick_view_modal"
          className="modal modal-open z-9995"
          open
        >
          <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] flex flex-col bg-base-100 text-base-content border border-base-content/10 shadow-2xl rounded-2xl p-0 overflow-hidden">
            <div className="sticky top-0 z-20 flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-base-content/10 bg-base-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-linear-to-b from-primary to-accent rounded-full" />
                <h3 className="font-bold text-lg sm:text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary via-accent to-secondary">
                  {transI18n("quickView").toUpperCase()}
                </h3>
                <span className="hidden sm:inline-block text-xs font-bold text-base-content/60 px-2 py-0.5 rounded-lg bg-base-200 border border-base-content/10">
                  {charName}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
                onClick={() => setIsOpenQuickView(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <NeedLightconeAndRelic><NeedAvatarDetail><QuickView /></NeedAvatarDetail></NeedLightconeAndRelic>
            </div>
          </div>

          <div
            className="modal-backdrop bg-black/60 cursor-pointer"
            onClick={() => setIsOpenQuickView(false)}
          />
        </dialog>
      )}
    </>
  );
}
