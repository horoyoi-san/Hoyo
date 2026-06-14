export interface CharacterDataList {
  [key: string]: CharacterDetails;
}

export interface CharacterDetails {
  id: number;
  tag: string;
  rarity: number;
  path: string;
  element: string;
  max_sp: number;
  max_sp_enhanced: number | null;
  ranks: Record<string, CharacterRank>;
  ranks_enhanced: Record<string, CharacterRank>;
  skills: Record<string, CharacterSkill>;
  skills_enhanced: Record<string, CharacterSkill>;
  skill_trees: Record<string, SkillTreePoint>;
  skill_trees_enhanced: Record<string, SkillTreePoint>;
  promotions: Record<string, PromotionStats>;
  technique_buff: Array<{ id: number }>;
  icon: string;
  desc: number;
  name: string;
  preview: string;
  portrait: string;
  enhanced_id: number | null;
}

export interface CharacterRank {
  id: number;
  name: string;
  rank: number;
  desc: string;
  level_up_skills: Array<{ id: number; num: number }>;
  skill_add_level_map: Record<string, number>;
  params: number[];
  icon: string;
  picture: string;
}

export interface CharacterSkill {
  id: number;
  max_level: number;
  element: string;
  type: string;
  type_text: string;
  effect: string;
  effect_text: string;
  simple_desc: string;
  params: Array<number[]>;
  icon: string;
  desc: string;
  name: string;
  toughness: number;
  ability_cost: number;
  energy_cost: number;
  skill_point_cost: number;
}

export interface SkillTreePoint {
  id: number;
  name: string;
  max_level: number;
  anchor: string;
  pre_points: number[];
  level_up_skills: number[];
  levels: any[];
  status_add_list: Array<{
    type: string;
    value: number;
  }>;
  servants: Record<string, ServantsTreePoint> | null;
  icon: string;
  desc: string;
  params: Array<number[]>;
  enhanced_id: number | null;
}

export interface ServantsTreePoint {
  name: string;
  desc: string;
  icon: string;
  id: number;
  params: Array<number[]>;
  tag: string;
}

export interface StatDetail {
  base: number;
  step: number;
}

export interface PromotionStats {
  hp: StatDetail;
  atk: StatDetail;
  def: StatDetail;
  spd: StatDetail;
  taunt: StatDetail;
  crit_rate: StatDetail;
  crit_dmg: StatDetail;
}
