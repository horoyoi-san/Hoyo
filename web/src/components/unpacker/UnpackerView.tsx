import React, { useMemo, useState } from 'react';
import { Box, Download, Image as ImageIcon, Layers, Music, Package, Search } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, SectionHeader, SelectRow, Tabs } from '../ui';
import { useT, useDebouncedValue } from '../../lib/hooks';
import { cn } from '../../lib/utils';

type AssetKind = 'texture' | 'mesh' | 'audio' | 'text';

interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  size: string;
  path: string;
}

const SAMPLE_ASSETS: Asset[] = [
  { id: '1', name: 'char_1209_kafka diffuse', kind: 'texture', size: '4.2 MB', path: 'Avatar/Char_1209/Tex' },
  { id: '2', name: 'char_1209_body.mesh', kind: 'mesh', size: '1.8 MB', path: 'Avatar/Char_1209/Model' },
  { id: '3', name: 'bgm_penacony_theme.ogg', kind: 'audio', size: '6.4 MB', path: 'Audio/BGM' },
  { id: '4', name: 'TextMap_TH.json', kind: 'text', size: '2.9 MB', path: 'TextMap' },
  { id: '5', name: 'stage_20120_view', kind: 'texture', size: '8.1 MB', path: 'Stage/20120' },
  { id: '6', name: 'monster_9002010.mesh', kind: 'mesh', size: '3.3 MB', path: 'Monster/9002010' },
];

const KIND_META: Record<AssetKind, { icon: React.ElementType; tone: string }> = {
  texture: { icon: ImageIcon, tone: 'bg-violet-500/10 text-violet-300' },
  mesh: { icon: Box, tone: 'bg-emerald-500/10 text-emerald-400' },
  audio: { icon: Music, tone: 'bg-amber-500/10 text-amber-300' },
  text: { icon: Layers, tone: 'bg-sky-500/10 text-sky-300' },
};

type KindFilter = 'all' | AssetKind;

export function UnpackerView() {
  const { t } = useT();
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [selected, setSelected] = useState<Asset | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm, 150);
  const needle = debouncedSearch.trim().toLowerCase();

  const filteredAssets = useMemo(
    () =>
      SAMPLE_ASSETS.filter(
        (asset) =>
          (kindFilter === 'all' || asset.kind === kindFilter) &&
          (!needle || asset.name.toLowerCase().includes(needle) || asset.path.toLowerCase().includes(needle))
      ),
    [needle, kindFilter]
  );

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-hidden">
      <SectionHeader
        icon={<Package className="h-5 w-5" />}
        title={t('unpacker.title')}
        badge={
          <Badge variant="gold" className="uppercase tracking-wider">
            {t('demo.badge')}
          </Badge>
        }
        description={t('unpacker.desc')}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Asset browser */}
        <Card className="lg:col-span-6 flex flex-col p-0 overflow-hidden" flat>
          <div className="p-3.5 border-b border-hz-navy-500/40 bg-hz-navy-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex-1 min-w-[140px]">
              <Input
                icon={<Search className="h-3.5 w-3.5 text-zinc-400" />}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                placeholder={t('common.search')}
                className="text-xs"
                aria-label={t('common.search')}
              />
            </div>
            <Tabs
              items={[
                { value: 'all', label: 'ALL' },
                { value: 'texture', label: 'TEX' },
                { value: 'mesh', label: 'MESH' },
                { value: 'audio', label: 'AUD' },
                { value: 'text', label: 'TXT' },
              ]}
              value={kindFilter}
              onChange={(v) => setKindFilter(v as KindFilter)}
              aria-label="Asset type filter"
              className="shrink-0"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-hairline">
            {filteredAssets.length === 0 ? (
              <EmptyState
                className="h-full"
                icon={<Search className="h-5 w-5" />}
                title={t('unpacker.empty.title')}
                description={t('unpacker.empty.desc')}
              />
            ) : (
              filteredAssets.map((asset) => {
                const Icon = KIND_META[asset.kind].icon;
                return (
                  <SelectRow
                    key={asset.id}
                    selected={selected?.id === asset.id}
                    onClick={() => setSelected(asset)}
                  >
                    <div className={cn('p-1.5 rounded-md shrink-0', KIND_META[asset.kind].tone)}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink-2 font-mono truncate">{asset.name}</div>
                      <div className="text-[10px] text-ink-4 truncate">{asset.path}</div>
                    </div>
                    <span className="font-mono text-[10px] text-ink-4">{asset.size}</span>
                  </SelectRow>
                );
              })
            )}
          </div>
        </Card>

        {/* Inspector */}
        <Card className="lg:col-span-6 flex flex-col p-4 overflow-hidden">
          {selected ? (
            <div className="flex flex-col h-full gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white font-mono break-all">{selected.name}</h2>
                  <p className="text-[11px] text-ink-4 mt-0.5">{selected.path}</p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {selected.size}
                </Badge>
              </div>

              <div className="flex-1 min-h-32 rounded-lg log-pane border border-edge flex items-center justify-center text-ink-4 text-xs">
                {t('unpacker.preview')}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-surface-1 border border-hairline">
                  <span className="text-ink-4">kind</span>
                  <div className="text-ink-2">{selected.kind}</div>
                </div>
                <div className="p-2 rounded-lg bg-surface-1 border border-hairline">
                  <span className="text-ink-4">size</span>
                  <div className="text-ink-2">{selected.size}</div>
                </div>
              </div>

              <Button variant="primary" size="sm" className="w-full" disabled title={t('demo.badge.desc')} icon={<Download className="h-3.5 w-3.5" />}>
                {t('unpacker.export')}
              </Button>
            </div>
          ) : (
            <EmptyState
              className="h-full"
              icon={<Package className="h-5 w-5" />}
              title={t('unpacker.select.title')}
              description={t('unpacker.select.desc')}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
