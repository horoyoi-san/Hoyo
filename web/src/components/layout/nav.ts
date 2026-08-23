import {
  Binary,
  Code2,
  Cpu,
  Database,
  Globe,
  Languages,
  Layers,
  Package,
  Radio,
  Server,
  Settings,
  ShieldCheck,
  Sparkle,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { NavigationPage } from '../../stores/useAppStore';

export interface NavItem {
  id: NavigationPage;
  translationKey: string;
  icon: React.ElementType;
}

export interface NavCategory {
  categoryKey: string;
  items: NavItem[];
}

export const CATEGORIES: NavCategory[] = [
  {
    categoryKey: 'nav.cat.server',
    items: [
      { id: 'robinsr', translationKey: 'nav.robinsr', icon: Server },
    ],
  },
  {
    categoryKey: 'nav.cat.re',
    items: [
      { id: 'morax', translationKey: 'nav.morax', icon: Cpu },
      { id: 'dumper', translationKey: 'nav.dumper', icon: Binary },
      { id: 'rescompiler', translationKey: 'nav.rescompiler', icon: Database },
      { id: 'sniffer', translationKey: 'nav.sniffer', icon: Radio },
      { id: 'unpacker', translationKey: 'nav.unpacker', icon: Package },
    ],
  },
  {
    categoryKey: 'nav.cat.mod',
    items: [
      { id: 'patcher', translationKey: 'nav.patcher', icon: ShieldCheck },
      { id: 'langpatcher', translationKey: 'nav.langpatcher', icon: Languages },
      { id: 'cheat', translationKey: 'nav.cheat', icon: Sparkles },
      { id: 'lua', translationKey: 'nav.lua', icon: Code2 },
      { id: 'design', translationKey: 'nav.design', icon: Layers },
    ],
  },
  {
    categoryKey: 'nav.cat.tools',
    items: [
      { id: 'gacha', translationKey: 'nav.gacha', icon: Sparkle },
      { id: 'uid', translationKey: 'nav.uid', icon: Globe },
    ],
  },
  {
    categoryKey: 'nav.cat.system',
    items: [
      { id: 'config', translationKey: 'nav.config', icon: Settings },
      { id: 'console', translationKey: 'nav.console', icon: Terminal },
      { id: 'settings', translationKey: 'nav.settings', icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = CATEGORIES.flatMap((category) => category.items);
