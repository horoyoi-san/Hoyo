using March7thHoney.Data.Config;
using March7thHoney.Data.Config.AdventureAbility;
using March7thHoney.Data.Config.Character;
using March7thHoney.Data.Config.Scene;
using March7thHoney.Data.Custom;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.GridFight;
using March7thHoney.Enums.Rogue;
using March7thHoney.Enums.TournRogue;
using March7thHoney.Util;
using Newtonsoft.Json;
using System.Collections.Concurrent;
using March7thHoney.Enums.Avatar;
using March7thHoney.Enums.Item;

namespace March7thHoney.Data;

public static partial class GameData
{
    #region Banners

    public static BannersConfig BannersConfig { get; set; } = new();

    #endregion

    #region VideoKeys

    public static VideoKeysConfig VideoKeysConfig { get; set; } = new();
    public static QueryProductInfoConfig QueryProductInfoConfig { get; set; } = new();

    #endregion

    #region Pam

    public static Dictionary<int, PamSkinConfigExcel> PamSkinConfigData { get; private set; } = [];

    #endregion

    #region Activity

    public static ActivityConfig ActivityConfig { get; set; } = new();

    public static Dictionary<int, List<DailyActiveConfigExcel>> DailyActiveConfigData { get; private set; } = [];
    public static Dictionary<int, DailyActiveQuestPoolExcel> DailyActiveQuestPoolData { get; private set; } = [];
    #region Marble

    public static Dictionary<int, MarbleMatchInfoExcel> MarbleMatchInfoData { get; private set; } = [];
    public static Dictionary<int, MarbleSealExcel> MarbleSealData { get; private set; } = [];

    #endregion

    #endregion

    #region Avatar

    public static Dictionary<int, AvatarConfigExcel> AvatarConfigData { get; private set; } = [];
    public static Dictionary<uint, AvatarRelicRecommendExcel> AvatarRelicRecommendData { get; private set; } = [];
    public static Dictionary<int, AvatarGlobalBuffConfigExcel> AvatarGlobalBuffConfigData { get; private set; } = [];

    public static Dictionary<int, AdventureAbilityConfigListInfo> AdventureAbilityConfigListData { get; private set; } =
        [];

    public static Dictionary<int, AvatarPromotionConfigExcel> AvatarPromotionConfigData { get; private set; } = [];
    public static Dictionary<int, AvatarExpItemConfigExcel> AvatarExpItemConfigData { get; private set; } = [];
    public static Dictionary<int, AvatarSkillTreeConfigExcel> AvatarSkillTreeConfigData { get; private set; } = [];
    public static Dictionary<int, MazeSkillExcel> MazeSkillData { get; private set; } = [];
    public static Dictionary<int, AvatarSkinExcel> AvatarSkinData { get; private set; } = [];
    public static Dictionary<int, AvatarDemoConfigExcel> AvatarDemoConfigData { get; private set; } = [];
    public static Dictionary<int, ExpTypeExcel> ExpTypeData { get; } = [];

    public static Dictionary<int, MultiplePathAvatarConfigExcel> MultiplePathAvatarConfigData { get; private set; } =
        [];

    public static Dictionary<int, AdventurePlayerExcel> AdventurePlayerData { get; private set; } = [];
    public static Dictionary<int, SummonUnitDataExcel> SummonUnitDataData { get; private set; } = [];
    public static Dictionary<int, DecideAvatarOrderExcel> DecideAvatarOrderData { get; private set; } = [];
    public static ConcurrentDictionary<int, CharacterConfigInfo> CharacterConfigInfoData { get; private set; } = [];
    public static Dictionary<AvatarBaseTypeEnum, UpgradeAvatarEquipmentExcel> UpgradeAvatarEquipmentData { get; private set; } =
        [];
    public static Dictionary<uint, UpgradeAvatarSubTypeExcel> UpgradeAvatarSubTypeData { get; private set; } = [];

    public static
        Dictionary<UpgradeAvatarSubRelicTypeEnum, Dictionary<RarityEnum,
            Dictionary<uint, Dictionary<RelicTypeEnum, UpgradeAvatarSubRelicExcel>>>> UpgradeAvatarSubRelicData
    {
        get;
        private set;
    } = [];

    #endregion

    #region Challenge

    public static Dictionary<int, ChallengeConfigExcel> ChallengeConfigData { get; private set; } = [];
    public static Dictionary<int, ChallengeMazeTierceConfigExcel> ChallengeMazeTierceConfigData { get; private set; } = [];
    public static Dictionary<int, ChallengeTargetExcel> ChallengeTargetData { get; private set; } = [];
    public static Dictionary<int, ChallengeGroupExcel> ChallengeGroupData { get; private set; } = [];

    public static Dictionary<int, ChallengePeakGroupConfigExcel> ChallengePeakGroupConfigData { get; private set; } =
        [];

    public static Dictionary<int, ChallengePeakConfigExcel> ChallengePeakConfigData { get; private set; } = [];
    public static Dictionary<int, ChallengePeakBossConfigExcel> ChallengePeakBossConfigData { get; private set; } = [];
    public static ChallengePeakOverrideConfig ChallengePeakOverrideConfig { get; set; } = new();

    /// <summary>
    ///     Selected ChallengePeak group from Config/Custom/ChallengePeak.json (switched via /peak).
    ///     Null means "use default max group_id" until explicitly set.
    /// </summary>
    public static int? CurrentChallengePeakGroupId { get; set; }

    public static Dictionary<int, List<ChallengeRewardExcel>> ChallengeRewardData { get; private set; } = [];

    public static Dictionary<int, List<ChallengePeakRewardExcel>> ChallengePeakRewardData { get; private set; } = [];

    #endregion

    #region Battle

    public static Dictionary<int, CocoonConfigExcel> CocoonConfigData { get; private set; } = [];
    public static Dictionary<int, FarmElementConfigExcel> FarmElementConfigData { get; private set; } = [];
    public static Dictionary<int, StageConfigExcel> StageConfigData { get; private set; } = [];
    public static Dictionary<int, RaidConfigExcel> RaidConfigData { get; private set; } = [];
    public static Dictionary<int, MazeBuffExcel> MazeBuffData { get; private set; } = [];
    public static Dictionary<int, StageInvasionBuffExcel> StageInvasionBuffData { get; private set; } = [];
    public static Dictionary<int, InteractConfigExcel> InteractConfigData { get; private set; } = [];
    public static Dictionary<int, NPCMonsterDataExcel> NpcMonsterDataData { get; private set; } = [];
    public static Dictionary<int, MonsterConfigExcel> MonsterConfigData { get; private set; } = [];
    public static Dictionary<int, MonsterTemplateConfigExcel> MonsterTemplateConfigData { get; private set; } = [];
    public static Dictionary<int, MonsterDropExcel> MonsterDropData { get; private set; } = [];
    public static Dictionary<int, BattleCollegeConfigExcel> BattleCollegeConfigData { get; private set; } = [];
    public static Dictionary<int, BattleTargetConfigExcel> BattleTargetConfigData { get; private set; } = [];

    #endregion

    #region GridFight

    public static GridFightBasicOrbRewardsConfig GridFightBasicOrbRewardsConfig { get; set; } = new();
    public static GridFightRewardRulesConfig GridFightRewardRulesConfig { get; set; } = new();
    public static GridFightRuntimeConfig GridFightRuntimeConfig { get; set; } = new();
    public static Dictionary<uint, GridFightBasicBonusPoolV2Excel> GridFightBasicBonusPoolV2Data { get; private set; } = [];
    public static Dictionary<uint, GridFightRoleBasicInfoExcel> GridFightRoleBasicInfoData { get; private set; } = [];
    public static Dictionary<uint, GridFightRoleStarExcel> GridFightRoleStarData { get; private set; } = [];
    public static Dictionary<uint, GridFightFrontSkillExcel> GridFightFrontSkillData { get; private set; } = [];
    public static List<GridFightRoleSkillModifyExcel> GridFightRoleSkillModifyData { get; private set; } = [];
    public static Dictionary<uint, GridFightGenderOverrideExcel> GridFightGenderOverrideData { get; private set; } = [];
    public static Dictionary<uint, GridFightRoleSwitchConfigExcel> GridFightRoleSwitchConfigData { get; private set; } = [];
    public static Dictionary<uint, List<GridFightRoleRecommendEquipExcel>> GridFightRoleRecommendEquipData { get; private set; } =
        [];
    public static Dictionary<uint, GridFightCombinationBonusExcel> GridFightCombinationBonusData { get; private set; } =
        [];
    public static Dictionary<uint, GridFightDivisionInfoExcel> GridFightDivisionInfoData { get; private set; } = [];
    public static Dictionary<uint, GridFightSettleRankExcel> GridFightSettleRankData { get; private set; } = [];
    public static Dictionary<uint, GridFightDivisionStageExcel> GridFightDivisionStageData { get; private set; } = [];
    public static Dictionary<uint, GridFightEquipmentExcel> GridFightEquipmentData { get; private set; } = [];
    public static Dictionary<uint, GridFightForgeExcel> GridFightForgeData { get; private set; } = [];
    public static Dictionary<uint, GridFightTraitEffectExcel> GridFightTraitEffectData { get; private set; } = [];
    public static Dictionary<uint, GridFightEnhanceExcel> GridFightEnhanceData { get; private set; } = [];

    public static Dictionary<uint, GridFightTraitBonusAddRuleExcel>
        GridFightTraitBonusAddRuleData { get; private set; } = [];

    public static Dictionary<uint, Dictionary<uint, GridFightTraitBonusExcel>> GridFightTraitBonusData{ get; private set; } = [];
    public static Dictionary<uint, GridFightEquipUpgradeExcel> GridFightEquipUpgradeData { get; private set; } = [];
    public static Dictionary<uint, GridFightCraftConfigExcel> GridFightCraftConfigData { get; private set; } = [];
    public static Dictionary<uint, GridFightConsumablesExcel> GridFightConsumablesData { get; private set; } = [];
    public static Dictionary<uint, GridFightCampExcel> GridFightCampData { get; private set; } = [];
    public static Dictionary<uint, GridFightShopPriceExcel> GridFightShopPriceData { get; private set; } = [];
    public static Dictionary<uint, GridFightPlayerLevelExcel> GridFightPlayerLevelData { get; private set; } = [];
    public static Dictionary<uint, GridFightMonsterExcel> GridFightMonsterData { get; private set; } = [];
    public static Dictionary<uint, GridFightAugmentExcel> GridFightAugmentData { get; private set; } = [];
    public static Dictionary<uint, GridFightAffixConfigExcel> GridFightAffixConfigData { get; private set; } = [];
    public static Dictionary<uint, GridFightOrbExcel> GridFightOrbData { get; private set; } = [];
    public static Dictionary<uint, Dictionary<GridFightAugmentQualityEnum, GridFightAugmentMonsterExcel>> GridFightAugmentMonsterData { get; private set; } = [];
    public static Dictionary<uint, Dictionary<uint, GridFightBinaryDiffAddRuleExcel>> GridFightBinaryDiffAddRuleData { get; private set; } = [];
    public static Dictionary<uint, GridFightBinaryNodeRuleExcel> GridFightBinaryNodeRuleData { get; private set; } = [];
    public static Dictionary<uint, GridFightEliteGroupExcel> GridFightEliteGroupData { get; private set; } = [];
    public static Dictionary<uint, Dictionary<uint, GridFightEnemyDifficultyLvExcel>> GridFightEnemyDifficultyLvData { get; private set; } = [];
    public static Dictionary<uint, GridFightStageLevelValueExcel> GridFightStageLevelValueData { get; private set; } = [];
    public static Dictionary<uint, GridFightFormationWaveExcel> GridFightFormationWaveData { get; private set; } = [];
    public static Dictionary<uint, GridFightPenaltyRuleExcel> GridFightPenaltyRuleData { get; private set; } = [];
    public static Dictionary<uint, GridFightVictoryBonusExcel> GridFightVictoryBonusData { get; private set; } = [];
    public static Dictionary<uint, GridFightPortalBuffExcel> GridFightPortalBuffData { get; private set; } = [];
    public static Dictionary<uint, GridFightItemsExcel> GridFightItemsData { get; private set; } = [];
    public static Dictionary<uint, GridFightTalentExcel> GridFightTalentData { get; private set; } = [];
    public static Dictionary<uint, GridFightTraitBasicInfoExcel> GridFightTraitBasicInfoData { get; private set; } = [];
    public static Dictionary<uint, Dictionary<uint, GridFightTraitLayerExcel>> GridFightTraitLayerData { get; private set; } = [];
    public static Dictionary<uint, Dictionary<uint, GridFightTraitEffectLayerPaExcel>> GridFightTraitEffectLayerPaData { get; private set; } = [];
    public static Dictionary<uint, GridFightSeasonTalentExcel> GridFightSeasonTalentData { get; private set; } = [];
    public static Dictionary<uint, List<uint>> GridFightSeasonPortalData { get; private set; } = [];
    public static Dictionary<uint, Dictionary<uint, GridFightStageRouteExcel>> GridFightStageRouteData { get; private set; } = [];
    public static Dictionary<uint, GridFightNodeTemplateExcel> GridFightNodeTemplateData { get; private set; } = [];
    public static Dictionary<string, GridFightDynamicValue> GridFightConstValueData { get; private set; } = [];
    public static List<GridFightModuleBanRoleExcel> GridFightModuleBanRoleData { get; private set; } = [];
    public static List<GridFightModuleBanPortalExcel> GridFightModuleBanPortalData { get; private set; } = [];
    public static List<GridFightModuleBanAugmentExcel> GridFightModuleBanAugmentData { get; private set; } = [];
    public static Dictionary<int, GridFightSeasonModuleExcel> GridFightSeasonModuleData { get; private set; } = [];
    public static Dictionary<uint, GridFightTutorialStageExcel> GridFightTutorialStageData { get; private set; } = [];
    public static List<GridFightTutorialStageNodeExcel> GridFightTutorialStageNodeData { get; private set; } = [];
    public static Dictionary<uint, List<uint>> GridFightSeasonAugmentData { get; private set; } = [];
    public static Dictionary<uint, GridFightBonusPoolV2Excel> GridFightBonusPoolV2Data { get; private set; } = [];

    #endregion

    #region ChessRogue

    public static Dictionary<int, ActionPointOverdrawExcel> ActionPointOverdrawData { get; private set; } = [];

    public static Dictionary<RogueDLCBlockTypeEnum, List<ChessRogueRoomConfig>>
        ChessRogueRoomData { get; private set; } = [];

    public static Dictionary<int, ChessRogueDiceSurfaceEffectConfig> ChessRogueDiceSurfaceEffectData { get; set; } = [];

    public static Dictionary<int, RogueDLCAreaExcel> RogueDLCAreaData { get; private set; } = [];
    public static Dictionary<int, RogueDLCBossDecayExcel> RogueDLCBossDecayData { get; private set; } = [];
    public static Dictionary<int, RogueDLCBossBpExcel> RogueDLCBossBpData { get; private set; } = [];
    public static Dictionary<int, RogueDLCDifficultyExcel> RogueDLCDifficultyData { get; private set; } = [];
    public static Dictionary<int, RogueNousAeonExcel> RogueNousAeonData { get; private set; } = [];
    public static Dictionary<int, RogueNousDiceBranchExcel> RogueNousDiceBranchData { get; private set; } = [];
    public static Dictionary<int, RogueNousDiceSurfaceExcel> RogueNousDiceSurfaceData { get; private set; } = [];

    public static Dictionary<int, RogueNousDifficultyLevelExcel> RogueNousDifficultyLevelData { get; private set; } =
        [];

    public static Dictionary<int, RogueNousMainStoryExcel> RogueNousMainStoryData { get; private set; } = [];
    public static Dictionary<int, RogueNousSubStoryExcel> RogueNousSubStoryData { get; private set; } = [];
    public static Dictionary<int, RogueNousTalentExcel> RogueNousTalentData { get; private set; } = [];
    public static Dictionary<int, List<RogueDLCChessBoardExcel>> RogueSwarmChessBoardData { get; private set; } = [];
    public static Dictionary<int, List<RogueDLCChessBoardExcel>> RogueNousChessBoardData { get; private set; } = [];
    public static Dictionary<uint, RogueDialogueEventConfig> SwarmRogueDialogueEventConfig { get; private set; } = [];
    public static Dictionary<uint, RogueDialogueEventConfig> NousRogueDialogueEventConfig { get; private set; } = [];

    #endregion

    #region Player

    public static Dictionary<int, AchievementDataExcel> AchievementDataData { get; private set; } = [];
    public static Dictionary<int, QuestDataExcel> QuestDataData { get; private set; } = [];
    public static Dictionary<int, FinishWayExcel> FinishWayData { get; private set; } = [];
    public static Dictionary<int, PlayerLevelConfigExcel> PlayerLevelConfigData { get; } = [];
    public static Dictionary<int, BackGroundMusicExcel> BackGroundMusicData { get; private set; } = [];
    public static Dictionary<int, ChatBubbleConfigExcel> ChatBubbleConfigData { get; private set; } = [];
    public static Dictionary<string, RechargeConfigExcel> RechargeConfigData { get; private set; } = [];
    public static Dictionary<int, RechargeGiftConfigExcel> RechargeGiftConfigData { get; private set; } = [];
    public static Dictionary<int, ExpeditionDataExcel> ExpeditionDataData { get; private set; } = [];
    public static Dictionary<int, List<ExpeditionRewardExcel>> ExpeditionRewardData { get; private set; } = [];

    #endregion

    #region Offering

    public static Dictionary<int, OfferingTypeConfigExcel> OfferingTypeConfigData { get; private set; } = [];

    public static Dictionary<int, Dictionary<int, OfferingLevelConfigExcel>> OfferingLevelConfigData
    {
        get;
        private set;
    } = [];

    #endregion

    #region Maze

    [JsonConverter(typeof(ConcurrentDictionaryConverter<string, FloorInfo>))]
    public static ConcurrentDictionary<string, FloorInfo> FloorInfoData { get; } = [];

    public static Dictionary<int, NPCDataExcel> NpcDataData { get; private set; } = [];
    public static Dictionary<int, MapEntranceExcel> MapEntranceData { get; } = [];
    public static Dictionary<int, MazePlaneExcel> MazePlaneData { get; private set; } = [];
    public static Dictionary<int, MazePuzzleSwitchHandExcel> MazePuzzleSwitchHandData { get; private set; } = [];
    public static Dictionary<int, MazeChestExcel> MazeChestData { get; private set; } = [];
    public static Dictionary<int, MazePropExcel> MazePropData { get; private set; } = [];
    public static Dictionary<int, PlaneEventExcel> PlaneEventData { get; private set; } = [];
    public static Dictionary<int, ContentPackageConfigExcel> ContentPackageConfigData { get; private set; } = [];
    public static Dictionary<int, GroupSystemUnlockDataExcel> GroupSystemUnlockDataData { get; private set; } = [];
    public static Dictionary<int, FuncUnlockDataExcel> FuncUnlockDataData { get; private set; } = [];
    public static Dictionary<int, MusicRhythmLevelExcel> MusicRhythmLevelData { get; private set; } = [];
    public static Dictionary<int, MusicRhythmGroupExcel> MusicRhythmGroupData { get; private set; } = [];
    public static Dictionary<int, MusicRhythmPhaseExcel> MusicRhythmPhaseData { get; private set; } = [];
    public static Dictionary<int, MusicRhythmSongExcel> MusicRhythmSongData { get; private set; } = [];
    public static Dictionary<int, MusicRhythmSoundEffectExcel> MusicRhythmSoundEffectData { get; private set; } = [];
    public static Dictionary<int, MusicRhythmTrackExcel> MusicRhythmTrackData { get; private set; } = [];

    public static Dictionary<string, AdventureModifierConfig> AdventureModifierData { get; set; } = [];
    public static SceneRainbowGroupPropertyConfig SceneRainbowGroupPropertyData { get; set; } = new();

    #endregion

    #region TrainParty

    public static Dictionary<int, TrainPartyPassengerConfigExcel> TrainPartyPassengerConfigData { get; private set; } =
        [];

    public static Dictionary<int, TrainPartyAreaConfigExcel> TrainPartyAreaConfigData { get; private set; } = [];

    public static Dictionary<int, TrainPartyAreaGoalConfigExcel> TrainPartyAreaGoalConfigData { get; private set; } =
        [];

    public static Dictionary<int, TrainPartyStepConfigExcel> TrainPartyStepConfigData { get; private set; } = [];
    public static Dictionary<int, TrainPartyDynamicConfigExcel> TrainPartyDynamicConfigData { get; private set; } = [];

    #endregion

    #region TrainCakeCatch

    public static Dictionary<int, CakeConfigExcel> CakeConfigData { get; private set; } = [];

    public static Dictionary<int, CakePerformanceConfigExcel> CakePerformanceConfigData { get; private set; } = [];

    public static Dictionary<string, CakeCatchConstValueCommonExcel> CakeCatchConstValueData { get; private set; } = [];

    #endregion

    #region Items

    public static Dictionary<int, MappingInfoExcel> MappingInfoData { get; private set; } = [];
    public static Dictionary<int, ItemConfigExcel> ItemConfigData { get; private set; } = [];
    public static Dictionary<int, ItemUseBuffDataExcel> ItemUseBuffDataData { get; private set; } = [];
    public static Dictionary<int, ItemUseDataExcel> ItemUseDataData { get; private set; } = [];
    public static Dictionary<int, EquipmentConfigExcel> EquipmentConfigData { get; private set; } = [];
    public static HashSet<int> BattlePassRewardItemIds { get; } = [];
    public static Dictionary<int, EquipmentExpTypeExcel> EquipmentExpTypeData { get; } = [];
    public static Dictionary<int, EquipmentExpItemConfigExcel> EquipmentExpItemConfigData { get; private set; } = [];

    public static Dictionary<int, EquipmentPromotionConfigExcel> EquipmentPromotionConfigData { get; private set; } =
        [];

    public static Dictionary<int, Dictionary<int, RelicMainAffixConfigExcel>> RelicMainAffixData { get; private set; } =
        []; // groupId, affixId

    public static Dictionary<int, Dictionary<int, RelicSubAffixConfigExcel>> RelicSubAffixData { get; private set; } =
        []; // groupId, affixId

    public static Dictionary<int, RelicConfigExcel> RelicConfigData { get; private set; } = [];
    public static Dictionary<int, RelicExpItemExcel> RelicExpItemData { get; private set; } = [];
    public static Dictionary<int, RelicExpTypeExcel> RelicExpTypeData { get; private set; } = [];
    public static Dictionary<int, PetExcel> PetData { get; private set; } = [];

    #endregion

    #region Special Avatar

    public static Dictionary<int, SpecialAvatarExcel> SpecialAvatarData { get; private set; } = [];
    public static Dictionary<int, SpecialAvatarRelicExcel> SpecialAvatarRelicData { get; private set; } = [];

    #endregion

    #region Mission

    public static Dictionary<int, MainMissionExcel> MainMissionData { get; private set; } = [];
    public static Dictionary<int, SubMissionExcel> SubMissionData { get; private set; } = [];
    public static ConcurrentDictionary<int, SubMissionData> SubMissionInfoData { get; private set; } = [];
    public static Dictionary<int, RewardDataExcel> RewardDataData { get; private set; } = [];
    public static Dictionary<int, MessageGroupConfigExcel> MessageGroupConfigData { get; private set; } = [];
    public static Dictionary<int, MessageSectionConfigExcel> MessageSectionConfigData { get; private set; } = [];
    public static Dictionary<int, MessageContactsConfigExcel> MessageContactsConfigData { get; private set; } = [];
    public static Dictionary<int, MessageItemConfigExcel> MessageItemConfigData { get; private set; } = [];
    public static Dictionary<int, PerformanceDExcel> PerformanceDData { get; private set; } = [];
    public static Dictionary<int, PerformanceEExcel> PerformanceEData { get; private set; } = [];
    public static Dictionary<int, StoryLineExcel> StoryLineData { get; private set; } = [];

    public static Dictionary<int, Dictionary<int, StoryLineFloorDataExcel>>
        StoryLineFloorDataData { get; private set; } = [];

    public static Dictionary<int, StroyLineTrialAvatarDataExcel> StroyLineTrialAvatarDataData { get; private set; } =
        [];

    public static Dictionary<int, HeartDialScriptExcel> HeartDialScriptData { get; private set; } = [];
    public static Dictionary<int, HeartDialDialogueExcel> HeartDialDialogueData { get; private set; } = [];

    #endregion

    #region Item Exchange

    public static Dictionary<int, ShopConfigExcel> ShopConfigData { get; private set; } = [];
    public static Dictionary<int, RollShopConfigExcel> RollShopConfigData { get; private set; } = [];
    public static Dictionary<int, RollShopRewardExcel> RollShopRewardData { get; private set; } = [];
    public static Dictionary<int, ItemComposeConfigExcel> ItemComposeConfigData { get; private set; } = [];

    #endregion

    #region Rogue

    public static Dictionary<int, DialogueEventExcel> DialogueEventData { get; private set; } = [];

    public static Dictionary<int, Dictionary<int, DialogueDynamicContentExcel>> DialogueDynamicContentData
    {
        get;
        private set;
    } = [];

    public static Dictionary<int, RogueAeonExcel> RogueAeonData { get; private set; } = [];
    public static Dictionary<int, RogueBuffExcel> RogueAeonBuffData { get; private set; } = [];
    public static Dictionary<int, BattleEventDataExcel> RogueBattleEventData { get; private set; } = [];
    public static Dictionary<int, List<RogueBuffExcel>> RogueAeonEnhanceData { get; private set; } = [];
    public static Dictionary<int, RogueAreaConfigExcel> RogueAreaConfigData { get; private set; } = [];
    public static Dictionary<int, RogueBonusExcel> RogueBonusData { get; private set; } = [];
    public static Dictionary<int, BaseRogueBuffExcel> RogueBuffData { get; private set; } = [];
    public static Dictionary<int, BaseRogueBuffGroupExcel> RogueBuffGroupData { get; private set; } = [];
    public static Dictionary<int, RogueHandBookEventExcel> RogueHandBookEventData { get; private set; } = [];

    public static Dictionary<int, RogueDialogueOptionDisplayExcel>
        RogueDialogueOptionDisplayData { get; private set; } = [];

    public static Dictionary<int, RogueDialogueDynamicDisplayExcel> RogueDialogueDynamicDisplayData
    {
        get;
        private set;
    } = [];

    public static Dictionary<int, RogueHandbookMiracleExcel> RogueHandbookMiracleData { get; private set; } = [];
    public static Dictionary<int, RogueManagerExcel> RogueManagerData { get; private set; } = [];
    public static Dictionary<int, Dictionary<int, RogueMapExcel>> RogueMapData { get; private set; } = [];
    public static Dictionary<int, List<int>> RogueMapGenData { get; set; } = [];
    public static Dictionary<int, RogueMazeBuffExcel> RogueMazeBuffData { get; private set; } = [];
    public static Dictionary<int, RogueMiracleExcel> RogueMiracleData { get; private set; } = [];
    public static RogueMiracleEffectConfig RogueMiracleEffectData { get; set; } = new();
    public static Dictionary<int, List<int>> RogueMiracleGroupData { get; set; } = [];
    public static Dictionary<int, RogueMiracleDisplayExcel> RogueMiracleDisplayData { get; private set; } = [];
    public static Dictionary<int, RogueMonsterExcel> RogueMonsterData { get; private set; } = [];
    public static Dictionary<int, RogueMonsterGroupExcel> RogueMonsterGroupData { get; private set; } = [];
    public static Dictionary<int, RogueNPCExcel> RogueNPCData { get; private set; } = [];
    public static Dictionary<int, RogueTalkNameConfigExcel> RogueTalkNameConfigData { get; private set; } = [];
    public static Dictionary<int, RogueRoomExcel> RogueRoomData { get; private set; } = [];
    public static Dictionary<int, RogueTalentExcel> RogueTalentData { get; private set; } = [];

    public static Dictionary<int, RogueTurntableExcel> RogueTurntableData { get; private set; } = [];

    public static Dictionary<int, RogueWolfGunMiracleTargetExcel> RogueWolfGunMiracleTargetData { get; private set; } =
        [];

    public static Dictionary<uint, RogueDialogueEventConfig> CosmosRogueDialogueEventConfig { get; private set; } = [];

    #endregion

    #region TournRogue

    public static Dictionary<int, RogueTournAreaExcel> RogueTournAreaData { get; private set; } = [];
    public static Dictionary<int, Dictionary<int, RogueTournLayerRoomExcel>> RogueTournLayerRoomData { get; private set; } = [];
    public static Dictionary<int, RogueTournWorkbenchExcel> RogueTournWorkbenchData { get; private set; } = [];
    public static Dictionary<int, RogueTournDivisionExcel> RogueTournDivisionData { get; private set; } = [];
    public static Dictionary<int, RogueTournWorkbenchFuncExcel> RogueTournWorkbenchFuncData { get; private set; } = [];
    public static Dictionary<int, RogueTournFormulaExcel> RogueTournFormulaData { get; private set; } = [];
    public static Dictionary<int, RogueTournMiracleExcel> RogueTournMiracleData { get; private set; } = [];
    public static Dictionary<int, RogueTournTitanTalentExcel> RogueTournTitanTalentData { get; private set; } = [];

    public static Dictionary<RogueTitanTypeEnum, RogueTournTitanTypeExcel>
        RogueTournTitanTypeData { get; private set; } =
        [];

    public static Dictionary<int, RogueTournTitanBlessExcel> RogueTournTitanBlessData { get; private set; } = [];

    public static Dictionary<int, RogueTournHexAvatarBaseTypeExcel> RogueTournHexAvatarBaseTypeData
    {
        get;
        private set;
    } = [];

    public static Dictionary<int, RogueTournHandBookEventExcel> RogueTournHandBookEventData { get; private set; } = [];

    public static Dictionary<int, RogueTournHandbookMiracleExcel> RogueTournHandbookMiracleData { get; private set; } =
        [];

    public static Dictionary<uint, RogueTournRoomExcel> RogueTournRoomData { get; private set; } = [];
    public static Dictionary<int, RogueTournDifficultyExcel> RogueTournDifficultyData { get; private set; } = [];

    public static Dictionary<int, RogueTournPermanentTalentExcel> RogueTournPermanentTalentData { get; private set; } =
        [];

    public static List<RogueTournRoomConfig> RogueTournRoomGenData { get; set; } =
        [];

    public static Dictionary<uint, RogueDialogueEventConfig> TournRogueDialogueEventConfig { get; private set; } = [];

    #endregion

    #region RogueMagic

    public static Dictionary<int, RogueMagicAreaExcel> RogueMagicAreaData { get; private set; } = [];
    public static Dictionary<int, RogueMagicAdventureRoomExcel> RogueMagicAdventureRoomData { get; private set; } = [];

    public static Dictionary<int, RogueMagicDifficultyCompExcel> RogueMagicDifficultyCompData { get; private set; } =
        [];

    public static Dictionary<int, RogueMagicStoryExcel> RogueMagicStoryData { get; private set; } = [];
    public static Dictionary<int, RogueMagicScepterExcel> RogueMagicScepterData { get; private set; } = [];
    public static Dictionary<int, RogueMagicRoomExcel> RogueMagicRoomData { get; private set; } = [];
    public static Dictionary<int, RogueMagicUnitExcel> RogueMagicUnitData { get; private set; } = [];
    public static Dictionary<int, RogueMagicTalentExcel> RogueMagicTalentData { get; private set; } = [];

    public static List<RogueMagicRoomConfig> RogueMagicRoomGenData { get; set; } =
        [];

    public static Dictionary<int, int> RogueMagicLayerIdRoomCountDict { get; set; } = [];

    public static Dictionary<uint, RogueDialogueEventConfig> MagicRogueDialogueEventConfig { get; private set; } = [];

    #endregion

    #region MatchThree

    public static Dictionary<int, MatchThreeLevelExcel> MatchThreeLevelData { get; private set; } = [];
    public static Dictionary<int, MatchThreeBirdExcel> MatchThreeBirdData { get; private set; } = [];

    #endregion

    #region Tutorial

    public static Dictionary<int, TutorialDataExcel> TutorialDataData { get; private set; } = [];
    public static Dictionary<int, TutorialGuideDataExcel> TutorialGuideDataData { get; private set; } = [];

    #endregion

    #region Actions

    public static void GetFloorInfo(int planeId, int floorId, out FloorInfo outer)
    {
        FloorInfoData.TryGetValue("P" + planeId + "_F" + floorId, out outer!);
    }

    public static FloorInfo? GetFloorInfo(int floorId)
    {
        var entrance = MapEntranceData.FirstOrDefault(x => x.Value.FloorID == floorId);
        if (entrance.Value == null) return null;

        GetFloorInfo(entrance.Value.PlaneID, floorId, out var floorInfo);
        return floorInfo;
    }

    public static int GetPlayerExpRequired(int level)
    {
        var excel = PlayerLevelConfigData[level];
        var prevExcel = PlayerLevelConfigData[level - 1];
        return excel != null && prevExcel != null ? excel.PlayerExp - prevExcel.PlayerExp : 0;
    }

    public static int GetAvatarExpRequired(int group, int level)
    {
        ExpTypeData.TryGetValue(group * 100 + level, out var expType);
        return expType?.Exp ?? 0;
    }

    public static int GetEquipmentExpRequired(int group, int level)
    {
        EquipmentExpTypeData.TryGetValue(group * 100 + level, out var expType);
        return expType?.Exp ?? 0;
    }

    public static int GetMinPromotionForLevel(int level)
    {
        return Math.Max(Math.Min((int)((level - 11) / 10D), 6), 0);
    }

    public static int GetCurrentChallengePeakGroupId()
    {
        if (CurrentChallengePeakGroupId is { } selected &&
            IsChallengePeakGroupAvailable(selected))
            return selected;

        // Prefer explicit group order from Config/Custom/ChallengePeak.json overrides.
        if (ChallengePeakOverrideConfig.ChallengePeak.Count > 0)
            return ChallengePeakOverrideConfig.ChallengePeak.Max(x => x.GroupId);

        if (ChallengePeakGroupConfigData.Count > 0)
            return ChallengePeakGroupConfigData.Keys.Max();

        return 1;
    }

    public static bool TrySetCurrentChallengePeakGroupId(int groupId)
    {
        if (!IsChallengePeakGroupAvailable(groupId)) return false;
        CurrentChallengePeakGroupId = groupId;
        return true;
    }

    public static bool IsChallengePeakGroupAvailable(int groupId)
    {
        return ChallengePeakOverrideConfig.ChallengePeak.Any(x => x.GroupId == groupId);
    }

    public static IEnumerable<int> GetAvailableChallengePeakGroupIds()
    {
        return ChallengePeakOverrideConfig.ChallengePeak
            .Select(x => x.GroupId)
            .Distinct()
            .OrderBy(x => x);
    }

    /// <summary>
    ///     After (re)loading ChallengePeak.json, use its latest group as the global default.
    /// </summary>
    public static void SyncCurrentChallengePeakGroupId()
    {
        CurrentChallengePeakGroupId = ChallengePeakOverrideConfig.ChallengePeak.Count > 0
            ? ChallengePeakOverrideConfig.ChallengePeak.Max(x => x.GroupId)
            : null;
    }

    #endregion
}
