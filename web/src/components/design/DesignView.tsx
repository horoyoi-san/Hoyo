import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Code,
  Layers,
  Network,
  Plus,
  Save,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Tabs } from '../ui';
import { useT } from '../../lib/hooks';

const NODE_BASE: React.CSSProperties = {
  color: '#f4f4f5',
  borderRadius: '10px',
  fontSize: '11px',
  fontFamily: 'JetBrains Mono, monospace',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
};

interface QuestPreset {
  id: string;
  name: string;
  category: string;
  isReal: boolean;
  nodes: Node[];
  edges: Edge[];
}

const QUEST_PRESETS: QuestPreset[] = [
  {
    id: '1000101',
    name: '1000101: Chaos In the Deep (Prologue)',
    category: 'Herta Space Station',
    isReal: true,
    nodes: [
      {
        id: '1',
        type: 'input',
        data: { label: '[Start] 1000101: Chaos In the Deep' },
        position: { x: 280, y: 20 },
        style: { ...NODE_BASE, background: '#18181b', border: '1px solid #71717a', color: '#f4f4f5' },
      },
      {
        id: '2',
        data: { label: '100010100: Use a fake identity past security check' },
        position: { x: 80, y: 130 },
        style: { ...NODE_BASE, background: '#121215', border: '1px solid #3f3f46' },
      },
      {
        id: '3',
        data: { label: '100010107: Traverse corridor into space station interior' },
        position: { x: 440, y: 130 },
        style: { ...NODE_BASE, background: '#121215', border: '1px solid #3f3f46' },
      },
      {
        id: '4',
        data: { label: '100010112: Eliminate Antimatter Legion Scouts (Battle)' },
        position: { x: 120, y: 250 },
        style: { ...NODE_BASE, background: '#1c1917', border: '1px solid #f97316', color: '#fed7aa' },
      },
      {
        id: '5',
        data: { label: '100010118: Dialogue with Arlan & Station Security' },
        position: { x: 420, y: 250 },
        style: { ...NODE_BASE, background: '#18181b', border: '1px solid #52525b' },
      },
      {
        id: '6',
        type: 'output',
        data: { label: '[Complete] 100010130: Mission Accomplished -> Unlock Base' },
        position: { x: 280, y: 370 },
        style: { ...NODE_BASE, background: '#064e3b', border: '1px solid #10b981', color: '#a7f3d0' },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#71717a' } },
      { id: 'e1-3', source: '1', target: '3', style: { stroke: '#71717a' } },
      { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#52525b' } },
      { id: 'e3-5', source: '3', target: '5', style: { stroke: '#52525b' } },
      { id: 'e4-6', source: '4', target: '6', style: { stroke: '#f97316' } },
      { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#10b981' } },
    ],
  },
  {
    id: '1010101',
    name: '1010101: Eye of the Storm (Jarilo-VI)',
    category: 'Jarilo-VI / Belobog',
    isReal: true,
    nodes: [
      {
        id: '1',
        type: 'input',
        data: { label: '[Start] 1010101: Eye of the Storm' },
        position: { x: 280, y: 20 },
        style: { ...NODE_BASE, background: '#18181b', border: '1px solid #71717a', color: '#f4f4f5' },
      },
      {
        id: '2',
        data: { label: '101010101: Enter the snow plains of Jarilo-VI' },
        position: { x: 100, y: 130 },
        style: { ...NODE_BASE, background: '#121215', border: '1px solid #3f3f46' },
      },
      {
        id: '3',
        data: { label: '101010104: Encounter Silvermane Guards (Gepard)' },
        position: { x: 420, y: 130 },
        style: { ...NODE_BASE, background: '#18181b', border: '1px solid #52525b' },
      },
      {
        id: '4',
        data: { label: '101010108: Dialogue with March 7th & Dan Heng' },
        position: { x: 260, y: 240 },
        style: { ...NODE_BASE, background: '#18181b', border: '1px solid #71717a' },
      },
      {
        id: '5',
        type: 'output',
        data: { label: '[Complete] 101010120: Escort to the Overworld City' },
        position: { x: 260, y: 360 },
        style: { ...NODE_BASE, background: '#064e3b', border: '1px solid #10b981', color: '#a7f3d0' },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#71717a' } },
      { id: 'e2-3', source: '2', target: '3', style: { stroke: '#52525b' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#71717a' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#10b981' } },
    ],
  },
  {
    id: '1030101',
    name: '1030101: The Sound and the Fury (Penacony)',
    category: 'Penacony',
    isReal: true,
    nodes: [
      {
        id: '1',
        type: 'input',
        data: { label: '[Start] 1030101: The Sound and the Fury' },
        position: { x: 260, y: 20 },
        style: { ...NODE_BASE, background: '#18181b', border: '1px solid #71717a', color: '#f4f4f5' },
      },
      {
        id: '2',
        data: { label: '103010102: Check-in at The Reverie Hotel' },
        position: { x: 90, y: 130 },
        style: { ...NODE_BASE, background: '#121215', border: '1px solid #3f3f46' },
      },
      {
        id: '3',
        data: { label: '103010105: Enter the Dreampool (Dreamscape)' },
        position: { x: 420, y: 130 },
        style: { ...NODE_BASE, background: '#1c1917', border: '1px solid #f59e0b', color: '#fde68a' },
      },
      {
        id: '4',
        data: { label: '103010109: Encounter Acheron in Dreamscape' },
        position: { x: 260, y: 240 },
        style: { ...NODE_BASE, background: '#18181b', border: '1px solid #52525b' },
      },
      {
        id: '5',
        type: 'output',
        data: { label: '[Complete] 103010120: Golden Hour Celebration' },
        position: { x: 260, y: 360 },
        style: { ...NODE_BASE, background: '#064e3b', border: '1px solid #10b981', color: '#a7f3d0' },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#71717a' } },
      { id: 'e2-3', source: '2', target: '3', style: { stroke: '#52525b' } },
      { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#f59e0b' } },
      { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#10b981' } },
    ],
  },
];

export function DesignView() {
  const { t, isTh } = useT();

  const [selectedPresetId, setSelectedPresetId] = useState<string>(QUEST_PRESETS[0].id);
  const currentPreset = QUEST_PRESETS.find((p) => p.id === selectedPresetId) ?? QUEST_PRESETS[0];

  const [nodes, setNodes, onNodesChange] = useNodesState(currentPreset.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentPreset.edges);
  const [activeTab, setActiveTab] = useState<'graph' | 'json'>('graph');
  const [nodeCounter, setNodeCounter] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const target = QUEST_PRESETS.find((p) => p.id === presetId);
    if (target) {
      setNodes(target.nodes);
      setEdges(target.edges);
    }
  };

  const json = useMemo(() => JSON.stringify({ missionId: selectedPresetId, nodes, edges }, null, 2), [selectedPresetId, nodes, edges]);

  const handleAddNode = () => {
    const id = `n-${Date.now()}`;
    setNodeCounter((n) => n + 1);
    const newNode: Node = {
      id,
      data: { label: `${isTh ? 'โหนดเงื่อนไขใหม่' : 'New Stage Node'} #${nodeCounter + 1}` },
      position: { x: 220 + (nodeCounter % 3) * 40, y: 280 + (nodeCounter % 3) * 30 },
      style: { ...NODE_BASE, background: '#18181b', border: '1px dashed rgba(255,255,255,0.3)', color: '#f4f4f5' },
    };
    setNodes((current) => [...current, newNode]);
  };

  const handleExportPatch = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quest-logic-patch-${selectedPresetId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 p-4 sm:p-5">
      <SectionHeader
        icon={<Layers className="h-5 w-5" />}
        title={t('design.title')}
        badge={
          <Badge variant={currentPreset.isReal ? 'emerald' : 'violet'} className="uppercase tracking-wider">
            {currentPreset.isReal
              ? (isTh ? `ข้อมูลเควสต์จริง (${currentPreset.id})` : `REAL QUEST DATA (${currentPreset.id})`)
              : (isTh ? 'เควสต์กำหนดเอง' : 'CUSTOM QUEST')}
          </Badge>
        }
        description={t('design.desc')}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Quest Preset Switcher */}
            <div className="flex items-center gap-1.5 bg-hz-navy-900 border border-hz-navy-500/50 rounded-lg px-2.5 py-1">
              <BookOpen className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
              <select
                value={selectedPresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="bg-transparent text-xs text-ink-2 focus:outline-none cursor-pointer font-sans"
              >
                {QUEST_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-hz-navy-850 text-white">
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            <Tabs
              items={[
                {
                  value: 'graph',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Network className="h-3 w-3" /> Graph
                    </span>
                  ),
                },
                {
                  value: 'json',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Code className="h-3 w-3" /> JSON
                    </span>
                  ),
                },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v as 'graph' | 'json')}
              aria-label="View mode"
            />

            <Button variant="secondary" size="sm" onClick={handleAddNode} icon={<Plus className="h-3.5 w-3.5" />}>
              {t('design.add_node')}
            </Button>

            <Button
              variant={savedSuccess ? 'emerald' : 'primary'}
              size="sm"
              onClick={handleExportPatch}
              icon={savedSuccess ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : <Save className="h-3.5 w-3.5" />}
            >
              {savedSuccess ? (isTh ? 'บันทึกแล้ว' : 'Exported') : t('design.save_patch')}
            </Button>
          </div>
        }
      />

      <Card
        className="flex-1 w-full min-h-[560px] p-0 overflow-hidden relative bg-hz-navy-900 border border-hz-navy-500/40 shadow-xl shadow-black/30"
        flat
      >
        {activeTab === 'graph' ? (
          <div className="w-full h-full min-h-[560px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              colorMode="dark"
              fitView
            >
              <Background color="#27272a" gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeStrokeColor="#52525b"
                nodeColor="#18181b"
                maskColor="rgba(9, 10, 13, 0.85)"
              />
            </ReactFlow>
          </div>
        ) : (
          <div className="w-full h-full p-4 font-mono text-xs overflow-y-auto text-hz-gray-400 selectable bg-hz-navy-850">
            <pre className="whitespace-pre-wrap">{json}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
