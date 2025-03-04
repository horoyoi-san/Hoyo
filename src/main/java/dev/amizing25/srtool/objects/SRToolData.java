package dev.amizing25.srtool.objects;

import com.mongodb.lang.Nullable;
import lombok.Getter;
import lombok.Setter;
import com.google.gson.annotations.SerializedName;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class SRToolData {

    @Getter
    @Setter
    public static class RelicSubAffixData {
        @SerializedName("sub_affix_id")
        private int subAffixId;

        @SerializedName("count")
        private int count;

        @SerializedName("step")
        private int step;
    }

    @Getter
    @Setter
    public static class RelicData {
        @SerializedName("level")
        private int level;

        @SerializedName("relic_id")
        private int relicID;

        @SerializedName("relic_set_id")
        private int relicSetID;

        @SerializedName("main_affix_id")
        private int mainAffixID;

        @SerializedName("sub_affixes")
        private List<RelicSubAffixData> subAffixes;

        @SerializedName("internal_uid")
        private int internalUID;

        @SerializedName("equip_avatar")
        private int equipAvatar;
    }

    @Getter
    @Setter
    public static class LightconeData {
        @SerializedName("level")
        private int level;

        @SerializedName("internal_uid")
        private int internalUID;

        @SerializedName("equip_avatar")
        private int equipAvatar;

        @SerializedName("item_id")
        private int itemID;

        @SerializedName("rank")
        private int rank;

        @SerializedName("promotion")
        private int promotion;
    }

    @Getter
    @Setter
    public static class AvatarData {
        @SerializedName("owner_uid")
        private int ownerUid;

        @SerializedName("avatar_id")
        private int avatarID;

        @SerializedName("data")
        private AvatarInnerData data;

        @SerializedName("level")
        private int level;

        @SerializedName("promotion")
        private int promotion;

        @SerializedName("techniques")
        private List<Integer> techniques;

        @SerializedName("sp_value")
        private int spValue;

        @SerializedName("sp_max")
        private int spMax;
    }

    @Getter
    @Setter
    public static class AvatarInnerData {
        @SerializedName("rank")
        private int rank;

        @SerializedName("skills")
        private Map<Integer, Integer> skills;
    }

    @Getter
    @Setter
    public static class DynamicKey {
        @SerializedName("key")
        private String key;

        @SerializedName("value")
        private int value;
    }

    @Getter
    @Setter
    public static class BlessingData {
        @SerializedName("level")
        private int level;

        @SerializedName("id")
        private int id;

        @SerializedName("dynamic_key")
        private DynamicKey dynamicKey;
    }

    @Getter
    @Setter
    public static class MonsterData {
        @SerializedName("level")
        private int level;

        @SerializedName("monster_id")
        private int monsterID;

        @SerializedName("max_hp")
        private int maxHp;

        public MonsterData(int level, int monsterID, int maxHp) {
            this.level = level;
            this.monsterID = monsterID;
            this.maxHp = maxHp;
        }
    }

    @Getter
    @Setter
    public static class BattleConfigData {
        @SerializedName("battle_type")
        private String battleType;

        @SerializedName("blessings")
        private BlessingData[] blessings;

        @SerializedName("custom_stats")
        private RelicSubAffixData[] customStats;

        @SerializedName("cycle_count")
        private int cycleCount;

        @SerializedName("monsters")
        private MonsterData[][] monsters;

        @SerializedName("path_resonance_id")
        private int pathResonanceID;

        @SerializedName("stage_id")
        private int stageID;
    }

    @SerializedName("relics")
    private List<RelicData> relics;

    @SerializedName("lightcones")
    private List<LightconeData> lightcones;

    @SerializedName("avatars")
    private Map<Integer, AvatarData> avatars;

    @SerializedName("battle_config")
    private BattleConfigData battleConfig;
}

