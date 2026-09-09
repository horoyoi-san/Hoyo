using March7thHoney.Data;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.UnlockSkilltreeCsReq)]
public class HandlerUnlockSkilltreeCsReq : Handler<UnlockSkillTreeCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UnlockSkillTreeCsReq req)
    {
        GameData.AvatarSkillTreeConfigData.TryGetValue((int)(req.PointId * 100 + req.Level), out var config);
        if (config == null)
        {
            await connection.SendPacket(new PacketUnlockSkilltreeScRsp(Retcode.RetSkilltreeConfigNotExist));
            return;
        }

        var avatar = player.AvatarManager!.GetFormalAvatar(config.AvatarID);
        if (avatar == null)
        {
            await connection.SendPacket(new PacketUnlockSkilltreeScRsp(Retcode.RetAvatarNotExist));
            return;
        }

        foreach (var cost in req.ItemList)
            await player.InventoryManager!.RemoveItem((int)cost.PileItem.ItemId,
                (int)cost.PileItem.ItemNum);

        avatar.GetCurPathInfo().GetSkillTree()[(int)req.PointId] = (int)req.Level;

        await connection.SendPacket(new PacketPlayerSyncScNotify(avatar));

        player.MissionManager?.HandleFinishType(MissionFinishTypeEnum.UnlockSkilltreeCnt, "UnlockSkillTree");
        player.MissionManager?.HandleFinishType(MissionFinishTypeEnum.UnlockSkilltree, "UnlockSkillTree");
        player.MissionManager?.HandleFinishType(MissionFinishTypeEnum.AllAvatarUnlockSkilltreeCnt, "UnlockSkillTree");

        await connection.SendPacket(new PacketUnlockSkilltreeScRsp(req.PointId, req.Level));
    }
}

