import { env } from "@/src/env";
import { getMetadata } from "./get-metadata";
import { getTextmaps } from "./get-textmaps";
import { CharacterRawDataList } from "@/src/types/neonteam/character";

export const getCharacters = async () => {
  const [metadata, textmaps] = await Promise.all([
    getMetadata(),
    getTextmaps(),
  ]);

  const res = await fetch(
    `${env.NEONTEAM_BASE_URL}/${metadata.CurrentVersion}/avatars.json`,
    {
      next: { revalidate: 60 * 60 },
    },
  );

  const data: CharacterRawDataList = await res.json();

  const allCharacters = Object.entries(data).map(([id, character]) => {
    const ranks = Object.entries(character.ranks).map(([id, rank]) => {
      const parsedRank = {
        ...rank,
        name: textmaps?.[rank.name],
        desc: textmaps?.[rank.desc],
      };
      return [id, parsedRank];
    });

    const ranksEnhanced = Object.entries(character.ranks_enhanced).map(
      ([id, rank]) => {
        const parsedRank = {
          ...rank,
          name: textmaps?.[rank.name],
          desc: textmaps?.[rank.desc],
        };
        return [id, parsedRank];
      },
    );

    const skillTrees = Object.entries(character.skill_trees).map(
      ([id, skillTree]) => {
        let srvnt = null;
        if (skillTree.servants) {
          srvnt = Object.entries(skillTree.servants).map(([id, servant]) => {
            const parseServant = {
              ...servant,
              name: textmaps?.[servant.name] || servant.name,
              desc: textmaps?.[servant.desc] || servant.desc,
            };
            return [id, parseServant];
          });
        }

        const parsedSkillTrees = {
          ...skillTree,
          name: textmaps?.[skillTree.name],
          desc: textmaps?.[skillTree.desc],
          servants: srvnt ? Object.fromEntries(srvnt) : null,
        };
        return [id, parsedSkillTrees];
      },
    );

    const skillTreesEnhanced = Object.entries(
      character.skill_trees_enhanced,
    ).map(([id, skillTreeEnhanced]) => {
      const parsed = {
        ...skillTreeEnhanced,
        name: textmaps?.[skillTreeEnhanced.name],
        desc: textmaps?.[skillTreeEnhanced.desc],
      };

      return [id, parsed];
    });

    const skills = Object.entries(character.skills).map(([id, skill]) => {
      const parsedSkill = {
        ...skill,
        name: textmaps?.[skill.name],
        desc: textmaps?.[skill.desc],
        effect_text: textmaps?.[skill.effect_text],
        simple_desc: textmaps?.[skill.simple_desc],
        type_text: textmaps?.[skill.type_text],
      };
      return [id, parsedSkill];
    });

    const skillsEnhanced = Object.entries(character.skills_enhanced).map(
      ([id, skill]) => {
        const parsedSkill = {
          ...skill,
          name: textmaps?.[skill.name],
          desc: textmaps?.[skill.desc],
          effect_text: textmaps?.[skill.effect_text],
          simple_desc: textmaps?.[skill.simple_desc],
          type_text: textmaps?.[skill.type_text],
        };
        return [id, parsedSkill];
      },
    );

    const parsedCharacter = {
      ...character,
      name: textmaps?.[character.name],
      ranks: Object.fromEntries(ranks),
      ranks_enhanced: Object.fromEntries(ranksEnhanced),
      skill_trees: Object.fromEntries(skillTrees),
      skill_trees_enhanced: Object.fromEntries(skillTreesEnhanced),
      skills: Object.fromEntries(skills),
      skills_enhanced: Object.fromEntries(skillsEnhanced),
    };

    return [id, parsedCharacter];
  });

  const parsedData = Object.fromEntries(allCharacters);

  return parsedData;
};
