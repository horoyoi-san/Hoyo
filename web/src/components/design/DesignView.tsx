import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Code, Layers, Network, Plus, Save } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Tabs, Tooltip } from '../ui';
import { useT } from '../../lib/hooks';

const NODE_BASE: React.CSSProperties = {
  color: '#f4f4f5',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'JetBrains Mono, monospace',
  padding: '6px 10px',
};

const INITIAL_NODES: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Quest_Penacony_Main_01: Start Act' },
    position: { x: 250, y: 30 },
    style: { ...NODE_BASE, background: '#161A24', border: '1px solid #7c3aed' },
  },
  {
    id: '2',
    data: { label: 'Dialogue: Sunday Interrogation' },
    position: { x: 100, y: 140 },
    style: { ...NODE_BASE, background: '#10131A', border: '1px solid rgba(255,255,255,0.1)' },
  },
  {
    id: '3',
    data: { label: 'Condition: Talked to Acheron' },
    position: { x: 380, y: 140 },
    style: { ...NODE_BASE, background: '#10131A', border: '1px solid rgba(255,255,255,0.1)' },
  },
  {
    id: '4',
    type: 'output',
    data: { label: 'Battle_Stage_Dominicus: Boss Encounter' },
    position: { x: 250, y: 260 },
    style: { ...NODE_BASE, background: '#1e1428', border: '1px solid #a855f7', color: '#e9d5ff' },
  },
];

const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#7c3aed' } },
  { id: 'e1-3', source: '1', target: '3', style: { stroke: '#7c3aed' } },
  { id: 'e2-4', source: '2', target: '4', style: { stroke: '#a855f7' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#a855f7' } },
];

export function DesignView() {
  const { t, isTh } = useT();

  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [activeTab, setActiveTab] = useState<'graph' | 'json'>('graph');
  const [nodeCounter, setNodeCounter] = useState(0);

  const json = useMemo(() => JSON.stringify({ nodes, edges }, null, 2), [nodes, edges]);

  const handleAddNode = () => {
    const id = `n-${Date.now()}`;
    setNodeCounter((n) => n + 1);
    setNodes((current) => [
      ...current,
      {
        id,
        data: { label: `${isTh ? 'โหนดใหม่' : 'New Node'} #${nodeCounter + 1}` },
        position: { x: 200 + nodeCounter * 40, y: 360 },
        style: { ...NODE_BASE, background: '#10131A', border: '1px dashed rgba(139,92,246,0.5)' },
      },
    ]);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-hidden">
      <SectionHeader
        icon={<Layers className="h-5 w-5" />}
        title={t('design.title')}
        badge={
          <Badge variant="gold" className="uppercase tracking-wider">
            {t('demo.badge')}
          </Badge>
        }
        description={t('design.desc')}
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              items={[
                { value: 'graph', label: <span className="flex items-center gap-1.5"><Network className="h-3 w-3" /> Graph</span> },
                { value: 'json', label: <span className="flex items-center gap-1.5"><Code className="h-3 w-3" /> JSON</span> },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v as 'graph' | 'json')}
              aria-label="View mode"
            />
            <Button variant="secondary" size="sm" onClick={handleAddNode} icon={<Plus className="h-3.5 w-3.5" />}>
              {t('design.add_node')}
            </Button>
            <Tooltip content={t('demo.badge.desc')} side="bottom">
              <Button variant="emerald" size="sm" disabled icon={<Save className="h-3.5 w-3.5" />}>
                {t('design.save_patch')}
              </Button>
            </Tooltip>
          </div>
        }
      />

      <Card className="flex-1 min-h-0 p-0 overflow-hidden relative bg-hz-navy-900 border border-hz-navy-500/40 shadow-lg shadow-black/20" flat>
        {activeTab === 'graph' ? (
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              colorMode="dark"
              fitView
            >
              <Background color="#1b254b" gap={18} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeStrokeColor="#7551ff"
                nodeColor="#1b254b"
                maskColor="rgba(11, 20, 55, 0.85)"
              />
            </ReactFlow>
          </div>
        ) : (
          <div className="w-full h-full p-4 log-pane text-xs overflow-y-auto text-zinc-300 selectable">
            <pre>{json}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
