import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Binary,
  Code,
  Play,
  Radio,
  Search,
  Send,
  SlidersHorizontal,
  Square,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, SectionHeader, SelectRow, Tabs } from '../ui';
import { usePacketStore } from '../../stores/usePacketStore';
import { useT } from '../../lib/hooks';
import { useDebouncedValue } from '../../lib/hooks';
import { ipc } from '../../lib/ipc-client';
import { formatTime, hexDump } from '../../lib/utils';

const HEX_PREVIEW_BYTES = 4096;

export function SnifferView() {
  const { t, isTh } = useT();

  const packets = usePacketStore((state) => state.packets);
  const isSniffing = usePacketStore((state) => state.isSniffing);
  const selectedPacket = usePacketStore((state) => state.selectedPacket);
  const setIsSniffing = usePacketStore((state) => state.setIsSniffing);
  const setSelectedPacket = usePacketStore((state) => state.setSelectedPacket);
  const clearPackets = usePacketStore((state) => state.clearPackets);
  const filterText = usePacketStore((state) => state.filterText);
  const setFilterText = usePacketStore((state) => state.setFilterText);
  const sourceFilter = usePacketStore((state) => state.sourceFilter);
  const setSourceFilter = usePacketStore((state) => state.setSourceFilter);

  const [activeTab, setActiveTab] = useState<'proto' | 'hex'>('proto');
  const [hexExpanded, setHexExpanded] = useState(false);

  // Debounce keystrokes; filtering up to 2000 packets only re-runs after idle.
  const debouncedSearch = useDebouncedValue(filterText, 150);
  const needle = debouncedSearch.trim().toLowerCase();

  const filteredPackets = useMemo(() => {
    if (!needle && sourceFilter === 'all') return packets;
    return packets.filter((p) => {
      if (sourceFilter !== 'all' && p.source !== sourceFilter) return false;
      if (!needle) return true;
      const name = (p.name || `Cmd_${p.cmd_id}`).toLowerCase();
      return name.includes(needle) || p.cmd_id.toString().includes(needle);
    });
  }, [packets, needle, sourceFilter]);

  /* Virtualized packet stream */
  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredPackets.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 48,
    overscan: 12,
  });

  const toggleSniffing = () => {
    if (isSniffing) {
      ipc.stopSniffer();
      setIsSniffing(false);
    } else {
      ipc.startSniffer();
      setIsSniffing(true);
    }
  };

  const handleClear = () => {
    ipc.clearSniffer();
    clearPackets();
  };

  const handleReplay = () => {
    if (!selectedPacket) return;
    ipc.send({
      type: 'send_packet',
      source: selectedPacket.source,
      cmd_id: selectedPacket.cmd_id,
      head: selectedPacket.head,
      body: selectedPacket.body,
    });
  };

  const hexContent = useMemo(() => {
    if (!selectedPacket) return '';
    const limit = hexExpanded ? selectedPacket.body.length : HEX_PREVIEW_BYTES;
    return hexDump(selectedPacket.body, limit);
  }, [selectedPacket, hexExpanded]);

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-hidden">
      <SectionHeader
        icon={<Radio className="h-5 w-5" />}
        title={t('sniffer.title')}
        badge={
          <Badge variant={isSniffing ? 'emerald' : 'neutral'} dot={isSniffing}>
            {isSniffing ? t('status.live') : t('status.idle')}
          </Badge>
        }
        description={t('sniffer.desc')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={isSniffing ? 'destructive' : 'emerald'}
              size="sm"
              icon={isSniffing ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              onClick={toggleSniffing}
            >
              {isSniffing ? t('sniffer.stop') : t('sniffer.start')}
            </Button>
            <Button variant="outline" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={handleClear}>
              {t('sniffer.clear')}
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-6 flex flex-col p-0 overflow-hidden" flat>
          <div className="p-3.5 border-b border-hz-navy-500/40 bg-hz-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex-1 min-w-[140px]">
              <Input
                icon={<Search className="h-3.5 w-3.5 text-hz-gray-400" />}
                value={filterText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
                placeholder={t('sniffer.filter_placeholder')}
                className="text-xs"
                aria-label={t('sniffer.filter_placeholder')}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Tabs
                items={[
                  { value: 'all', label: 'ALL' },
                  { value: 'client', label: 'C→S' },
                  { value: 'server', label: 'S→C' },
                ]}
                value={sourceFilter}
                onChange={(v) => setSourceFilter(v)}
                aria-label="Direction filter"
                className="shrink-0"
              />
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                {filteredPackets.length}
              </Badge>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto bg-hz-navy-900">
            {filteredPackets.length === 0 ? (
              <EmptyState
                className="h-full text-hz-gray-400"
                icon={<SlidersHorizontal className="h-5 w-5 text-hz-brand-400" />}
                title={t('sniffer.empty.title')}
                description={t('sniffer.empty.desc')}
                action={
                  !isSniffing ? (
                    <Button variant="emerald" size="xs" onClick={toggleSniffing} icon={<Play className="h-3 w-3 fill-current" />}>
                      {t('sniffer.start')}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((row) => {
                  const pkt = filteredPackets[row.index];
                  const isClient = pkt.source === 'client';
                  return (
                    <div
                      key={pkt.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: row.size,
                        transform: `translateY(${row.start}px)`,
                      }}
                    >
                      <SelectRow
                        selected={selectedPacket?.id === pkt.id}
                        onClick={() => {
                          setSelectedPacket(pkt);
                          setHexExpanded(false);
                        }}
                        className="h-full"
                      >
                        <div
                          className={`p-1.5 rounded-xl shrink-0 ${
                            isClient ? 'bg-hz-brand-400/15 text-hz-brand-300' : 'bg-hz-green-400/15 text-hz-green-400'
                          }`}
                        >
                          {isClient ? (
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-white truncate">
                              {pkt.name || `Cmd_${pkt.cmd_id}`}
                            </span>
                            <span className="text-[10px] text-hz-gray-500 font-mono">#{pkt.cmd_id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-hz-gray-400">
                            <span>{formatTime(pkt.timestamp)}</span>
                            <span>·</span>
                            <span>{pkt.body.length} B</span>
                          </div>
                        </div>
                      </SelectRow>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-6 flex flex-col p-4 justify-between overflow-hidden shadow-lg shadow-black/20">
          <div className="min-h-0 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-hz-navy-500/40">
              <Tabs
                items={[
                  { value: 'proto', label: <span className="flex items-center gap-1.5"><Code className="h-3 w-3" /> Protobuf</span> },
                  { value: 'hex', label: <span className="flex items-center gap-1.5"><Binary className="h-3 w-3" /> Hex</span> },
                ]}
                value={activeTab}
                onChange={(v) => setActiveTab(v as 'proto' | 'hex')}
                aria-label="Inspector mode"
              />
              {selectedPacket && (
                <Badge variant={selectedPacket.source === 'client' ? 'violet' : 'emerald'}>
                  {selectedPacket.source === 'client' ? 'CS_REQ' : 'SC_RSP'}
                </Badge>
              )}
            </div>

            {selectedPacket ? (
              <div className="flex-1 min-h-0 flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2.5 p-2.5 rounded-xl bg-hz-navy-900 border border-hz-navy-500 text-[11px] font-mono">
                  <div>
                    <span className="text-hz-gray-500">CmdId:</span> <span className="text-white font-medium">{selectedPacket.cmd_id}</span>
                  </div>
                  <div>
                    <span className="text-hz-gray-500">Length:</span>{' '}
                    <span className="text-white font-medium">{selectedPacket.body.length} B</span>
                  </div>
                  <div>
                    <span className="text-hz-gray-500">Dir:</span>{' '}
                    <span className="text-white font-medium">{selectedPacket.source === 'client' ? 'C→S' : 'S→C'}</span>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3.5 rounded-xl bg-hz-navy-900 border border-hz-navy-500 font-mono text-xs text-hz-gray-400 selectable">
                  {activeTab === 'proto' ? (
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {selectedPacket.body_json || '{\n  "status": "RAW_PAYLOAD_UNMAPPED"\n}'}
                    </pre>
                  ) : (
                    <>
                      <pre className="whitespace-pre leading-relaxed">{hexContent}</pre>
                      {selectedPacket.body.length > HEX_PREVIEW_BYTES && !hexExpanded && (
                        <Button variant="ghost" size="xs" className="mt-2" onClick={() => setHexExpanded(true)}>
                          {isTh
                            ? `แสดงทั้งหมด ${selectedPacket.body.length} bytes`
                            : `Show all ${selectedPacket.body.length} bytes`}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                className="flex-1 text-hz-gray-400"
                icon={<SlidersHorizontal className="h-5 w-5 text-hz-brand-400" />}
                title={t('sniffer.select.title')}
                description={t('sniffer.select.desc')}
              />
            )}
          </div>

          <div className="pt-3 border-t border-hz-navy-500/40 flex gap-2">
            <Button
              variant="primary"
              size="xs"
              className="flex-1 font-bold"
              disabled={!selectedPacket}
              icon={<Send className="h-3 w-3" />}
              onClick={handleReplay}
            >
              {t('sniffer.replay')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
