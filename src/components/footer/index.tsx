export default function Footer() {
    return (
        <footer className="w-full bg-transparent py-2 px-4 mt-auto">
            <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-base-content/60 font-medium">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-base-content/80">Kafka SrTools</span>
                    <span>•</span>
                    <span>Honkai: Star Rail Toolkit</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>© {new Date().getFullYear()}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded-full bg-base-100/20 text-base-content/70 border border-base-content/10">Next.js & DaisyUI</span>
                </div>
            </div>
        </footer>
    )
}
