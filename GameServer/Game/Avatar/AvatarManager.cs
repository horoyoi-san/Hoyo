using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Friend;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Avatar;

public class AvatarManager(PlayerInstance player) : BasePlayerManager<AvatarData>(player)
{
    public async ValueTask<AvatarConfigExcel?> AddAvatar(int avatarId, bool sync = true, bool notify = true,
        bool isGacha = false)
    {
        GameData.AvatarConfigData.TryGetValue(avatarId, out var avatarExcel);
        if (avatarExcel == null) return null;
        if (avatarExcel.MaxRank < 6) return null;

        GameData.MultiplePathAvatarConfigData.TryGetValue(avatarId, out var multiPathAvatar);
        if (multiPathAvatar != null && multiPathAvatar.BaseAvatarID != avatarId)
        {
            // Is path
            foreach (var avatarData in Data.FormalAvatars)
                if (avatarData.AvatarId == multiPathAvatar.BaseAvatarID)
                {
                    // Add path for the character
                    avatarData.PathInfos.Add(avatarId, new PathInfo(avatarId));
                    break;
                }

            return null;
        }

        var avatar = new FormalAvatarInfo(multiPathAvatar?.BaseAvatarID ?? avatarId, avatarId, true)
        {
            Level = 1,
            Timestamp = Extensions.GetUnixSec(),
            CurrentHp = 10000,
            CurrentSp = 0
        };

        Data.FormalAvatars.Add(avatar);

        if (avatarExcel.Rarity == RarityEnum.CombatPowerAvatarRarityType5 && avatarExcel.AvatarID <= 3000)
            // add development
            Player.FriendRecordData!.AddAndRemoveOld(new FriendDevelopmentInfoPb
            {
                DevelopmentType = (DevelopmentType)10,
                Params = { { "AvatarId", (uint)avatarExcel.AvatarID } }
            });

        if (sync)
            await Player.SendPacket(new PacketPlayerSyncScNotify(avatar));

        if (notify) await Player.SendPacket(new PacketAddAvatarScNotify(avatar.BaseAvatarId, isGacha));

        return avatarExcel;
    }

    public FormalAvatarInfo? GetFormalAvatar(int avatarId)
    {
        GameData.MultiplePathAvatarConfigData.TryGetValue(avatarId, out var multiPathAvatar);
        return Data.FormalAvatars.Find(avatar => avatar.BaseAvatarId ==
                                                       (multiPathAvatar?.BaseAvatarID ?? avatarId));
    }

    public SpecialAvatarInfo? GetTrialAvatar(int avatarId, bool refresh = false)
    {
        var avatar = Data.TrialAvatars.Find(avatar => avatar.SpecialAvatarId == avatarId);
        if (avatar != null)
        {
            if (refresh)
                Data.TrialAvatars.Remove(avatar);
            else
                return avatar;
        }

        if (!GameData.SpecialAvatarData.TryGetValue(avatarId * 10 + 0, out var excel)) return null;

        var baseAvatarId = excel.AvatarID;
        if (GameData.MultiplePathAvatarConfigData.TryGetValue(baseAvatarId, out var multiple))
            baseAvatarId = multiple.BaseAvatarID;
        avatar = new SpecialAvatarInfo
        {
            SpecialAvatarId = excel.SpecialAvatarID,
            AvatarId = excel.AvatarID,
            BaseAvatarId = baseAvatarId,
            Level = excel.Level,
            Promotion = excel.Promotion
        };

        avatar.PathInfos.Add(excel.AvatarID, new PathInfo(excel.AvatarID)
        {
            Rank = excel.Rank,
            EquipData = new ItemData
            {
                ItemId = excel.EquipmentID,
                Level = excel.EquipmentLevel,
                Promotion = excel.EquipmentPromotion,
                Rank = excel.EquipmentRank
            }
        });

        if (!GameData.AvatarConfigData.TryGetValue(avatar.BaseAvatarId, out _)) return avatar;
        avatar.GetCurPathInfo().GetSkillTree();
        Data.TrialAvatars.Add(avatar);
        return avatar;
    }

    public SpecialAvatarInfo? GetTrialAvatarByWorldLevel(int specialAvatarId, int worldLevel)
    {
        var avatar = Data.TrialAvatars.Find(a => a.SpecialAvatarId == specialAvatarId);
        if (avatar != null) return avatar;

        SpecialAvatarExcel? excel = null;
        for (var wl = worldLevel; wl >= 0 && excel == null; wl--)
            GameData.SpecialAvatarData.TryGetValue(specialAvatarId * 10 + wl, out excel);
        if (excel == null) return null;

        var baseAvatarId = excel.AvatarID;
        if (GameData.MultiplePathAvatarConfigData.TryGetValue(baseAvatarId, out var multiple))
            baseAvatarId = multiple.BaseAvatarID;
        avatar = new SpecialAvatarInfo
        {
            SpecialAvatarId = excel.SpecialAvatarID,
            AvatarId = excel.AvatarID,
            BaseAvatarId = baseAvatarId,
            Level = excel.Level,
            Promotion = excel.Promotion
        };
        avatar.PathInfos.Add(excel.AvatarID, new PathInfo(excel.AvatarID)
        {
            Rank = excel.Rank,
            EquipData = new ItemData
            {
                ItemId = excel.EquipmentID,
                Level = excel.EquipmentLevel,
                Promotion = excel.EquipmentPromotion,
                Rank = excel.EquipmentRank
            }
        });

        if (!GameData.AvatarConfigData.TryGetValue(avatar.BaseAvatarId, out _)) return avatar;
        avatar.GetCurPathInfo().GetSkillTree();
        Data.TrialAvatars.Add(avatar);
        return avatar;
    }

    public FormalAvatarInfo? GetHero()
    {
        return Data.FormalAvatars.Find(avatar => avatar.BaseAvatarId == 8001);
    }

    public async ValueTask ReforgeRelic(int uniqueId)
    {
        var relic = Player.InventoryManager!.Data.RelicItems.FirstOrDefault(x => x.UniqueId == uniqueId);
        if (relic == null) return;
        await Player.InventoryManager!.RemoveItem(238, 1);

        var subAffixesClone = relic.SubAffixes.Select(x => x.Clone()).ToList();

        var levelUpCnt = 0;
        foreach (var subAffix in relic.SubAffixes)
        {
            levelUpCnt += subAffix.Count - 1;
            subAffix.Count = 1;
            subAffix.Step = 0;
        }

        relic.IncreaseRandomRelicSubAffix(levelUpCnt);
        relic.ReforgeSubAffixes = relic.SubAffixes;
        relic.SubAffixes = subAffixesClone;

        await Player.SendPacket(new PacketPlayerSyncScNotify(relic));
    }

    public async ValueTask ConfirmReforgeRelic(int uniqueId, bool isCancel)
    {
        var relic = Player.InventoryManager!.Data.RelicItems.FirstOrDefault(x => x.UniqueId == uniqueId);
        if (relic == null) return;
        if (relic.ReforgeSubAffixes.Count == 0) return;

        if (!isCancel)
            relic.SubAffixes = relic.ReforgeSubAffixes;
        relic.ReforgeSubAffixes = [];

        await Player.SendPacket(new PacketPlayerSyncScNotify(relic));
    }

    public List<RelicSmartWearPlan> GetRelicPlan(int avatarId)
    {
        var planList = new List<RelicSmartWearPlan>();
        foreach (var plan in Player.InventoryManager!.Data.RelicPlans)
        {
            if (plan.Value.EquipAvatar != avatarId) continue;
            if (plan.Value.InsideRelic.Count == 0 && plan.Value.OutsideRelic.Count == 0) continue;

            planList.Add(new RelicSmartWearPlan
            {
                AvatarId = (uint)avatarId,
                UniqueId = (uint)plan.Key,
                OutsideRelicList = { plan.Value.OutsideRelic.Select(x => (uint)x) },
                InsideRelicList = { plan.Value.InsideRelic.Select(x => (uint)x) }
            });
        }

        return planList;
    }

    public RelicSmartWearPlan AddRelicPlan(RelicSmartWearPlan plan)
    {
        var curUnique = Player.InventoryManager!.Data.RelicPlans.Keys;
        var uniqueId = curUnique.Count > 0 ? curUnique.Max() + 1 : 1;
        Player.InventoryManager!.Data.RelicPlans[uniqueId] = new RelicPlanData
        {
            EquipAvatar = (int)plan.AvatarId,
            InsideRelic = [.. plan.InsideRelicList.Select(x => (int)x)],
            OutsideRelic = [.. plan.OutsideRelicList.Select(x => (int)x)]
        };

        plan.UniqueId = (uint)uniqueId;
        return plan;
    }

    public void UpdateRelicPlan(RelicSmartWearPlan plan)
    {
        Player.InventoryManager!.Data.RelicPlans[(int)plan.UniqueId] = new RelicPlanData
        {
            EquipAvatar = (int)plan.AvatarId,
            InsideRelic = [.. plan.InsideRelicList.Select(x => (int)x)],
            OutsideRelic = [.. plan.OutsideRelicList.Select(x => (int)x)]
        };
    }

    public void DeleteRelicPlan(int uniqueId)
    {
        Player.InventoryManager!.Data.RelicPlans[uniqueId] = new RelicPlanData();
    }
}
