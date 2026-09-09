using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    public async ValueTask<(Retcode, List<ItemData>? returnItems)> UseItem(int itemId, int count = 1,
        int baseAvatarId = 0)
    {
        GameData.ItemConfigData.TryGetValue(itemId, out var itemConfig);
        if (itemConfig == null) return (Retcode.RetItemNotExist, null);
        var dataId = itemConfig.ID;

        List<ItemData> resItemDatas = [];
        if (GameData.ItemUseBuffDataData.TryGetValue(dataId, out var useConfig))
        {
            for (var i = 0; i < count; i++) // do count times
            {
                if (useConfig.PreviewSkillPoint != 0)
                    await Player.LineupManager!.GainMp((int)useConfig.PreviewSkillPoint);

                if (baseAvatarId > 0)
                {
                    // single use
                    var avatar = Player.AvatarManager!.GetFormalAvatar(baseAvatarId);
                    if (avatar == null) return (Retcode.RetAvatarNotExist, null);

                    var extraLineup = Player.LineupManager!.GetCurLineup()?.IsExtraLineup() == true;

                    if (useConfig.PreviewHPRecoveryPercent != 0)
                    {
                        avatar.SetCurHp(
                            Math.Min(Math.Max(avatar.CurrentHp + (int)(useConfig.PreviewHPRecoveryPercent * 10000), 0),
                                10000), extraLineup);

                        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager.GetCurLineup()!));
                    }

                    if (useConfig.PreviewHPRecoveryValue != 0)
                    {
                        avatar.SetCurHp(
                            Math.Min(Math.Max(avatar.CurrentHp + (int)useConfig.PreviewHPRecoveryValue, 0), 10000),
                            extraLineup);

                        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager.GetCurLineup()!));
                    }

                    if (useConfig.PreviewPowerPercent != 0)
                    {
                        avatar.SetCurSp(
                            Math.Min(Math.Max(avatar.CurrentHp + (int)(useConfig.PreviewPowerPercent * 10000), 0),
                                10000),
                            extraLineup);

                        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager.GetCurLineup()!));
                    }
                }
                else
                {
                    // team use
                    if (useConfig.PreviewHPRecoveryPercent != 0)
                    {
                        Player.LineupManager!.GetCurLineup()!.Heal((int)(useConfig.PreviewHPRecoveryPercent * 10000),
                            true);

                        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager.GetCurLineup()!));
                    }

                    if (useConfig.PreviewHPRecoveryValue != 0)
                    {
                        Player.LineupManager!.GetCurLineup()!.Heal((int)useConfig.PreviewHPRecoveryValue, true);

                        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager.GetCurLineup()!));
                    }

                    if (useConfig.PreviewPowerPercent != 0)
                    {
                        Player.LineupManager!.GetCurLineup()!.AddPercentSp((int)(useConfig.PreviewPowerPercent *
                            10000));

                        await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager.GetCurLineup()!));
                    }
                }
            }

            //maze buff
            if (useConfig.MazeBuffID > 0)
                foreach (var info in Player.SceneInstance?.AvatarInfo.Values.ToList() ?? [])
                    if (baseAvatarId == 0 || info.AvatarInfo.BaseAvatarId == baseAvatarId)
                        await info.AddBuff(new SceneBuff(useConfig.MazeBuffID, 1, info.AvatarInfo.AvatarId));

            if (useConfig.MazeBuffID2 > 0)
                foreach (var info in Player.SceneInstance?.AvatarInfo.Values.ToList() ?? [])
                    if (baseAvatarId == 0 || info.AvatarInfo.BaseAvatarId == baseAvatarId)
                        await info.AddBuff(new SceneBuff(useConfig.MazeBuffID2, 1, info.AvatarInfo.AvatarId));
        }

        if (GameData.ItemUseDataData.TryGetValue(dataId, out var useData))
            foreach (var rewardId in useData.UseParam)
                resItemDatas.AddRange(await HandleReward(rewardId, true));

        // remove item
        await RemoveItem(itemId, count);

        return (Retcode.RetSucc, resItemDatas);
    }
}
