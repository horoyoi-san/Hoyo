"use client";


interface ModalLoadingProps {
  type?: "spinner" | "grid" | "form";
  message?: string;
}

export default function ModalLoading({ type = "spinner", message }: ModalLoadingProps) {
  if (type === "grid") {
    return (
      <div className="w-full h-full p-4 space-y-4 animate-pulse">
        <div className="h-10 bg-base-200/80 rounded-xl border border-base-content/10" />
        <div className="flex gap-2">
          <div className="h-7 w-24 bg-base-200/80 rounded-lg" />
          <div className="h-7 w-24 bg-base-200/80 rounded-lg" />
          <div className="h-7 w-24 bg-base-200/80 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-xl overflow-hidden bg-base-200/60 border border-base-content/10 aspect-3/4"
            >
              <div className="w-full flex-1 bg-base-300/40" />
              <div className="w-full h-10 p-2 space-y-1 bg-base-200/80">
                <div className="h-2.5 bg-base-300 rounded w-4/5 mx-auto" />
                <div className="h-2 bg-base-300/70 rounded w-1/2 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "form") {
    return (
      <div className="w-full p-6 space-y-5 animate-pulse max-w-xl mx-auto">
        <div className="space-y-2">
          <div className="h-4 bg-base-300 rounded w-1/4" />
          <div className="h-10 bg-base-200 rounded-xl border border-base-content/10" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-base-300 rounded w-1/3" />
          <div className="h-24 bg-base-200 rounded-xl border border-base-content/10" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <div className="h-9 w-20 bg-base-200 rounded-lg" />
          <div className="h-9 w-24 bg-primary/30 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-75 sm:min-h-105 w-full gap-3 p-8 text-center animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center p-3 rounded-2xl bg-base-200/50 border border-base-content/10 shadow-inner">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-base-content/80 tracking-tight">
          {message || "Loading module..."}
        </p>
        <p className="text-xs text-base-content/50 font-mono">
          Readying assets in background
        </p>
      </div>
    </div>
  );
}
