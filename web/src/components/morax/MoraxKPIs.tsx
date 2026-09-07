import { CheckCircle2, Clock, Code2, FileCode, Binary } from 'lucide-react';
import { Badge, Card } from '../ui';
import { useT } from '../../lib/hooks';
import type { DecryptStats } from './types';

interface MoraxKPIsProps {
  stats: DecryptStats | null;
}

export function MoraxKPIs({ stats }: MoraxKPIsProps) {
  const { isTh } = useT();

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <Code2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'โครงสร้างคลาส' : 'Total Types'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats.types.toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-500">Classes & Structs</span>
          </div>
        </div>

        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <FileCode className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'เมธอดและ RVA' : 'Methods & RVAs'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats.methods.toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-500">Addresses Resolved</span>
          </div>
        </div>

        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <Binary className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'ฟิลด์และตัวแปร' : 'Fields & Enums'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats.fields.toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-500">Class Fields</span>
          </div>
        </div>

        <div className="bg-hz-navy-700 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex items-center gap-3.5 shadow-md shadow-black/20 transition-all">
          <div className="p-3 rounded-xl border shrink-0 bg-zinc-800 border-zinc-700/60 text-zinc-200">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              {isTh ? 'เวลาถอดรหัส' : 'Process Time'}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-0.5 truncate">
              {stats.timeSeconds}s
            </div>
            <Badge variant="neutral" className="text-[9px] mt-0.5">Ready</Badge>
          </div>
        </div>
      </div>

      {/* Generated Artifacts Pills */}
      {stats.outputFiles.length > 0 && (
        <Card className="p-3 bg-hz-navy-800/90 border border-zinc-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 mr-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isTh ? 'ไฟล์ที่สร้างเสร็จ:' : 'Generated Artifacts:'}
          </span>
          {stats.outputFiles.map((file, idx) => {
            const sizeHint = file.includes('dump.cs')
              ? '~28.4 MB'
              : file.includes('proto')
                ? '~1.45 MB'
                : file.includes('methods')
                  ? '~12.8 MB'
                  : file.includes('il2cpp.h')
                    ? '~3.2 MB'
                    : file.includes('Dummy') || file.includes('dll')
                      ? '~4.5 MB'
                      : null;
            return (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-hz-navy-900 border border-hz-navy-500 font-mono text-[10px] text-ink-2 flex items-center gap-1.5"
              >
                <span>{file}</span>
                {sizeHint && <span className="text-emerald-400 text-[9px]">({sizeHint})</span>}
              </span>
            );
          })}
        </Card>
      )}
    </div>
  );
}
