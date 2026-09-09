using MemoryPack;
using March7thHoney.Data;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Inventory;
using March7thHoney.Database.Quests;
using March7thHoney.Proto;
using March7thHoney.Util;
using LineupInfo = March7thHoney.Database.Lineup.LineupInfo;

namespace March7thHoney.Database.Player;

[DbTable("Player")]
public class PlayerData : BaseDatabaseDataHelper
{
    public string? Name { get; set; } = "";
    public string? Signature { get; set; } = "";
    public int Birthday { get; set; } = 0;
    public int CurBasicType { get; set; } = 8002;
    public int HeadIcon { get; set; } = 208002;
    public int PhoneTheme { get; set; } = 221000;
    public int ChatBubble { get; set; } = 220000;
    public int PersonalCard { get; set; } = 253000;
    public int PhoneCase { get; set; } = 254000;
    public int CurrentBgm { get; set; } = 210007;
    public int CurrentPamSkin { get; set; } = 252000;
    public bool IsGenderSet { get; set; } = false;
    public Gender CurrentGender { get; set; } = Gender.Woman;
    public int Level { get; set; } = 1;
    public int Exp { get; set; } = 0;
    public int WorldLevel { get; set; } = 0;
    public int Scoin { get; set; } = 0; // Credits
    public int Hcoin { get; set; } = 0; // Jade
    public int Mcoin { get; set; } = 0; // Crystals
    public int TalentPoints { get; set; } = 0; // Rogue talent points
    public long MonthCardExpireTime { get; set; } = 0;
    public int LastMonthCardRewardDate { get; set; } = 0;
    public bool WelcomeAnnouncePending { get; set; } = false;

    public int Pet { get; set; } = 0;
    public int CurMusicLevel { get; set; }

    public int Stamina { get; set; } = 300;
    public double StaminaReserve { get; set; } = 0;
    public long NextStaminaRecover { get; set; } = 0;

    public Position? Pos { get; set; }

    public Position? Rot { get; set; }

    public PlayerHeadFrameInfo HeadFrame { get; set; } = new();
    public List<int> PlayerOutfitList { get; set; } = [];

    public int PlaneId { get; set; }

    public int FloorId { get; set; }

    public int EntryId { get; set; }

    public long LastActiveTime { get; set; }

    public List<int> TakenLevelReward { get; set; } = [];
    public PrivacySettingsPb PrivacySettings { get; set; } = new();

    public int FakeTimeDate { get; set; } = 0; // yyyyMMdd, 0 = off

    public static PlayerData? GetPlayerByUid(long uid)
    {
        var result = DatabaseHelper.Instance?.GetInstance<PlayerData>((int)uid);
        return result;
    }

    public PlayerBasicInfo ToProto()
    {
        return new PlayerBasicInfo
        {
            Nickname = Name,
            Level = (uint)Level,
            Exp = (uint)Exp,
            WorldLevel = (uint)WorldLevel,
            Scoin = (uint)Scoin,
            Hcoin = (uint)Hcoin,
            Mcoin = (uint)Mcoin,
            Stamina = (uint)Stamina
        };
    }

    // 4.4 lobby member basic info (MOHAGOFLGAP = pre-4.2 LobbyPlayerBasicInfo)
    public MOHAGOFLGAP ToLobbyProto()
    {
        return new MOHAGOFLGAP
        {
            Nickname = Name,
            Level = (uint)Level,
            Icon = (uint)HeadIcon,
            Platform = PlatformType.Pc,
            Uid = (uint)Uid
        };
    }

    public PlayerSimpleInfo ToSimpleProto(FriendOnlineStatus status)
    {
        if (!GameData.ChatBubbleConfigData.ContainsKey(ChatBubble)) // to avoid npe
            ChatBubble = 220000;

        var info = new PlayerSimpleInfo
        {
            Nickname = Name,
            Level = (uint)Level,
            Signature = Signature,
            Uid = (uint)Uid,
            OnlineStatus = status,
            HeadIcon = (uint)HeadIcon,
            Platform = PlatformType.Pc,
            LastActiveTime = LastActiveTime,
            ChatBubbleId = (uint)ChatBubble,
            PersonalCard = (uint)PersonalCard,
            HeadFrameInfo = HeadFrame.ToProto(),
            Gender = (uint)CurrentGender
        };

        if (PlayerOutfitList.Count > 0)
            info.PlayerOutfitData = ToPlayerOutfitProto();

        var pos = 0;
        var instance = DatabaseHelper.Instance!.GetInstance<AvatarData>(Uid);
        if (instance == null)
        {
            // Handle server profile
            var serverProfile = ConfigManager.Config.ServerOption.ServerProfile;
            if (Uid == serverProfile.Uid)
            {
                info.OnlineStatus = FriendOnlineStatus.Online;
                info.AssistSimpleInfoList.AddRange(
                    serverProfile.AssistInfo.Select((x, index) =>
                        new AssistSimpleInfo
                        {
                            AvatarId = (uint)x.AvatarId,
                            Level = (uint)x.Level,
                            DressedSkinId = (uint)x.SkinId,
                            Pos = (uint)index
                        }));
            }

            return info;
        }

        foreach (var avatar in instance.AssistAvatars.Select(
                     assist => instance.FormalAvatars.Find(x => x.AvatarId == assist)))
            if (avatar != null)
                info.AssistSimpleInfoList.Add(new AssistSimpleInfo
                {
                    AvatarId = (uint)avatar.AvatarId,
                    Level = (uint)avatar.Level,
                    DressedSkinId = (uint)avatar.GetCurPathInfo().Skin,
                    Pos = (uint)pos++
                });

        return info;
    }

    public PlayerDetailInfo ToDetailProto()
    {
        var info = new PlayerDetailInfo
        {
            Nickname = Name,
            Level = (uint)Level,
            Signature = Signature,
            IsBanned = false,
            HeadIcon = (uint)HeadIcon,
            Platform = PlatformType.Pc,
            Uid = (uint)Uid,
            WorldLevel = (uint)WorldLevel,
            RecordInfo = new PlayerRecordInfo(),
            HeadFrameInfo = HeadFrame.ToProto()
        };

        var avatarInfo = DatabaseHelper.Instance!.GetInstance<AvatarData>(Uid);
        var inventoryInfo = DatabaseHelper.Instance.GetInstance<InventoryData>(Uid);
        var questInfo = DatabaseHelper.Instance.GetInstance<QuestData>(Uid);

        if (avatarInfo == null || inventoryInfo == null || questInfo == null)
        {
            // Handle server profile
            var serverProfile = ConfigManager.Config.ServerOption.ServerProfile;
            if (Uid == serverProfile.Uid)
                info.AssistAvatarList.AddRange(
                    serverProfile.AssistInfo.Select((x, index) =>
                        new DisplayAvatarDetailInfo
                        {
                            AvatarId = (uint)x.AvatarId,
                            Level = (uint)x.Level,
                            DressedSkinId = (uint)x.SkinId,
                            Pos = (uint)index
                        }));
            return info;
        }

        info.RecordInfo = new PlayerRecordInfo
        {
            DIOIIFAHAKK = (uint)avatarInfo.FormalAvatars.Count,
            NECKJBHEKHE = (uint)inventoryInfo.EquipmentItems.Select(x => x.ItemId).ToHashSet().Count,
            KCBINJNIBNO = (uint)inventoryInfo.RelicItems.Count,
            ALGEOLGNFBL = (uint)GameData.AchievementDataData.Values.Select(x => x.QuestID).ToHashSet()
                .Count(x => questInfo.Quests.GetValueOrDefault(x)?.QuestStatus is QuestStatus.QuestFinish
                    or QuestStatus.QuestClose), // count finished achievements
            MHOIJFEBAPA = (uint)GameData.BackGroundMusicData.Count
        };

        var pos = 0;
        foreach (var avatar in avatarInfo.AssistAvatars.Select(assist =>
                     avatarInfo.FormalAvatars.Find(x => x.BaseAvatarId == assist)))
            if (avatar != null)
                info.AssistAvatarList.Add(avatar.ToDetailProto(pos++,
                    new PlayerDataCollection(this, inventoryInfo, new LineupInfo())));

        pos = 0;
        foreach (var avatar in avatarInfo.DisplayAvatars.Select(display =>
                     avatarInfo.FormalAvatars.Find(x => x.BaseAvatarId == display)))
            if (avatar != null)
                info.DisplayAvatarList.Add(avatar.ToDetailProto(pos++,
                    new PlayerDataCollection(this, inventoryInfo, new LineupInfo())));

        return info;
    }

    public CJLCPMDGIBO ToPlayerOutfitProto() =>
        new() { EAKOLIJOEPA = { PlayerOutfitList.Select(x => (uint)x) } };
}

[MemoryPackable]
public partial class PlayerHeadFrameInfo
{
    public long HeadFrameExpireTime { get; set; }
    public uint HeadFrameId { get; set; }

    public HeadFrameInfo ToProto()
    {
        return new HeadFrameInfo
        {
            HeadFrameExpireTime = HeadFrameExpireTime,
            HeadFrameItemId = HeadFrameId
        };
    }
}

[MemoryPackable]
public partial class PrivacySettingsPb
{
    public bool DisplayChallengeLineup { get; set; } = true;
    public bool DisplayActiveState { get; set; } = true;
    public bool DisplayRecentlyState { get; set; } = true;
    public bool DisplayBattleRecord { get; set; } = true;
    public bool DisplayCollection { get; set; } = true;

    public PlayerSettingInfo ToSettingProto()
    {
        return new PlayerSettingInfo
        {
            // TODO 4.3: PlayerSettingInfo 字段在 4.3 重排，DisplayActiveState/RecentlyState/BattleRecord 暂未映射
            GNFDDPEMMFN = DisplayChallengeLineup,
            FDHEPCKLCAM = DisplayCollection
        };
    }
}
