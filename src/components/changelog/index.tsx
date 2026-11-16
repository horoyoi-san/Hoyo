import useLocaleStore from '@/stores/localeStore';
import { useShallow } from 'zustand/react/shallow';
import { Sparkles, Bug, Zap, Package, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ChangelogBar() {
    const transI18n = useTranslations("DataPage");
    const { changelog } = useLocaleStore(
        useShallow((state) => ({ changelog: state.changelog }))
    )

    const getIcon = (type: string) => {
        switch (type) {
            case 'feature':
                return <Sparkles className="w-3.5 h-3.5" />;
            case 'fix':
                return <Bug className="w-3.5 h-3.5" />;
            case 'improvement':
                return <Zap className="w-3.5 h-3.5" />;
            default:
                return <Package className="w-3.5 h-3.5" />;
        }
    };

    const getBadgeClass = (type: string) => {
        switch (type) {
            case 'feature':
                return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            case 'fix':
                return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
            case 'improvement':
                return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            default:
                return 'bg-primary/15 text-primary border-primary/30';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'feature':
                return transI18n("feature");
            case 'fix':
                return transI18n("fix");
            case 'improvement':
                return transI18n("improvement");
            default:
                return transI18n("update");
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {changelog.map((change, index) => (
                    <div key={index} className="p-4 sm:p-5 rounded-2xl bg-base-200/60 border border-white/10 shadow-lg space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-base-content/10">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${getBadgeClass(change.type)}`}>
                                    {getIcon(change.type)}
                                    {getTypeLabel(change.type)}
                                </span>
                                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                                    {transI18n("version")} {change.version}
                                </h3>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-base-content/50 font-mono">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{change.date}</span>
                            </div>
                        </div>

                        <ul className="space-y-2 pt-1 text-xs sm:text-sm text-base-content/85">
                            {change.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-2.5">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <span className="leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}