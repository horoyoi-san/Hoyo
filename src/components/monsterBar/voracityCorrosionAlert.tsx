import { Invasion } from "@/types";
import { getLocaleName } from "@/helper";
import { useTranslations } from "next-intl";

interface VoracityCorrosionAlertProps {
  invasion: Invasion;
  invasionPercent?: number;
  locale: string;
}

export default function VoracityCorrosionAlert({
  invasion,
  invasionPercent,
  locale,
}: VoracityCorrosionAlertProps) {
  const transI18n = useTranslations("DataPage");
  const percent = invasionPercent ?? (invasion?.MazeBuff?.Param?.[1] || 0.4);

  const rawDesc =
    getLocaleName(locale, invasion?.Desc) ||
    invasion?.Desc?.[locale] ||
    invasion?.Desc?.["vi"] ||
    invasion?.Desc?.["en"] ||
    "";
  const cleanDesc = rawDesc.replace(/\\n/g, "\n");

  return (
    <div className="mb-4 rounded-r-xl border-l-4 border-rose-500 bg-rose-500/10 p-3 sm:p-3.5 text-rose-100">
      <div className="flex items-start gap-3">
        <span className="text-rose-400 shrink-0 mt-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </span>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-rose-400 uppercase">
                {transI18n("voracityCorrosion")}
              </span>
              <span className="text-xs font-bold text-rose-100 px-2 py-0.5 rounded bg-rose-500/25">
                {transI18n("corrosionLv")} {invasion.ID}
              </span>
            </div>
            <span className="text-xs font-bold text-rose-300">
              {transI18n("voracityHp")}: {Math.round(percent * 100)}% {transI18n("ofMaxHp")}
            </span>
          </div>

          <p className="text-xs text-rose-200/90 leading-relaxed whitespace-pre-line">
            {cleanDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
