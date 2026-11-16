import Image from "next/image"

interface BrandLogoProps {
  size?: "compact" | "large"
}

export default function BrandLogo({ size = "compact" }: BrandLogoProps) {
  const isLarge = size === "large"

  return (
    <span className={`inline-flex items-center ${isLarge ? "gap-4" : "gap-2.5"}`}>
      <span
        className={`relative shrink-0 rounded-full bg-linear-to-br from-fuchsia-400 via-violet-300 to-amber-200 p-[2px] shadow-[0_0_22px_rgba(192,132,252,0.28)] ${
          isLarge ? "h-20 w-20 sm:h-24 sm:w-24" : "h-10 w-10"
        }`}
      >
        <span className="block h-full w-full overflow-hidden rounded-full border border-[#151020] bg-[#151020]">
          <Image
            src="/kafka-srtools-avatar.png"
            alt=""
            width={128}
            height={128}
            priority={isLarge}
            className="h-full w-full object-cover"
          />
        </span>
        <span
          aria-hidden="true"
          className={`absolute rounded-full border-2 border-[#101322] bg-cyan-200 shadow-[0_0_10px_rgba(103,232,249,0.85)] ${
            isLarge ? "bottom-1 right-1 h-4 w-4" : "bottom-0 right-0 h-3 w-3"
          }`}
        />
      </span>

      <span className="flex flex-col items-start leading-none">
        <span
          className={`font-black uppercase tracking-[0.16em] text-white ${
            isLarge ? "text-3xl sm:text-4xl" : "text-sm"
          }`}
        >
          Kafka
        </span>
        <span
          className={`mt-1 bg-linear-to-r from-fuchsia-200 via-violet-200 to-amber-200 bg-clip-text font-bold uppercase text-transparent ${
            isLarge ? "text-lg tracking-[0.3em] sm:text-xl" : "text-[10px] tracking-[0.28em]"
          }`}
        >
          SrTools
        </span>
      </span>
    </span>
  )
}
