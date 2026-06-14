export interface CharacterRawDataList {
  [key: string]: CharacterRawDetails;
}

export interface CharacterRawDetails {
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
  name: number;
  preview: string;
  portrait: string;
  enhanced_id: number | null;
}

export interface CharacterRank {
  id: number;
  name: number;
  rank: number;
  desc: number;
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
  type_text: number;
  effect: string;
  effect_text: number;
  simple_desc: number;
  params: Array<number[]>;
  icon: string;
  desc: number;
  name: number;
  toughness: number;
  ability_cost: number;
  energy_cost: number;
  skill_point_cost: number;
}

export interface SkillTreePoint {
  id: number;
  name: number;
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
  desc: number;
  params: Array<number[]>;
  enhanced_id: number | null;
}

export interface ServantsTreePoint {
  name: number;
  desc: number;
  icon: string;
  id: number;
  params: Array<number[]>;
  tag: number;
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
