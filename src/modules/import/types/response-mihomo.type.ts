export interface Player {
  avatar: {
    icon: string;
    id: string;
    name: string;
  };
  friend_count: number;
  is_display: true;
  level: number;
  nickname: string;
  signature: string;
  space_info: {
    achievement_count: number;
    avatar_count: number;
    book_count: number;
    light_cone_count: number;
    memory_data: {
      chaos_id: null | any;
      chaos_level: number;
      chaos_star_count: number;
      level: number;
    };
    music_count: number;
    relic_count: number;
    universe_level: number;
  };
  uid: string;
  world_level: number;
}

export interface Attributes {
  display: string;
  field: string;
  icon: string;
  name: string;
  percent: boolean;
  value: number;
}

export interface Properties extends Attributes {
  type: string;
}

export interface Path {
  icon: string;
  id: string;
  name: string;
}

export interface Element {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  max_level: number;
  element: Element | null;
  type: string;
  type_text: string;
  effect: string;
  effect_text: string;
  simple_desc: string;
  desc: string;
  icon: string;
}

export interface SkillTree {
  id: string;
  level: number;
  anchor: string;
  max_level: number;
  icon: string;
  parent: string | null;
}

export interface RelicAffix {
  type: string;
  field: string;
  name: string;
  icon: string;
  value: number;
  display: string;
  percent: boolean;
  count?: number;
  step?: number;
}

export interface Relic {
  id: string;
  name: string;
  type: number;
  set_id: string;
  set_name: string;
  rarity: number;
  level: number;
  icon: string;
  main_affix: RelicAffix;
  sub_affix: RelicAffix[];
}

export interface RelicSet {
  id: string;
  name: string;
  icon: string;
  num: number;
  desc: string;
  properties: Attributes[];
}

export interface LightCone {
  id: string;
  name: string;
  rarity: number;
  rank: number;
  level: number;
  promotion: number;
  icon: string;
  preview: string;
  portrait: string;
  path: Path;
  attributes: Attributes[];
  properties: Properties[];
}

export interface Character {
  id: string;
  name: string;
  rarity: number;
  rank: number;
  level: number;
  promotion: number;
  enhanced: boolean;
  icon: string;
  preview: string;
  portrait: string;
  rank_icons: string[];
  path: Path;
  element: Element;
  skills: Skill[];
  skill_trees: SkillTree[];
  light_cone: LightCone;
  relics: Relic[];
  relic_sets: RelicSet[];
  attributes: Attributes[];
  additions: Attributes[];
  properties: Properties[];
  statistics: Attributes[];
  pos: number[];
}

export interface ResponseMihomo {
  characters: Character[];
  player: Player;
}
