using March7thHoney.Data;
using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.SetAvatarEnhancedIdCsReq)]
public class HandlerSetAvatarEnhancedIdCsReq : Handler<SetAvatarEnhancedIdCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetAvatarEnhancedIdCsReq req)
    {
        var targetAvatarId = (int)req.AvatarId;
        var targetEnhancedId = (int)req.EnhancedId;

        var avatar = player.AvatarManager!.GetFormalAvatar(targetAvatarId);
        if (avatar == null)
        {
            await connection.SendPacket(new PacketSetAvatarEnhancedIdScRsp(Retcode.RetAvatarNotExist));
            return;
        }

        // Prefer explicit path id from request, fallback to current path for base-avatar requests.
        var path = avatar.GetPathInfo(targetAvatarId) ?? avatar.GetCurPathInfo();
        if (path == null)
        {
            await connection.SendPacket(new PacketSetAvatarEnhancedIdScRsp(Retcode.RetAvatarNotExist));
            return;
        }

        // Keep requested enhance id when it exists in config; otherwise fallback to default(0) to avoid invalid state.
        if (GameData.AvatarConfigData.TryGetValue(path.PathId, out var pathExcel))
        {
            var exists = pathExcel.SkillTree.ContainsKey(targetEnhancedId) ||
                         pathExcel.DefaultSkillTree.ContainsKey(targetEnhancedId);
            path.EnhanceId = exists ? targetEnhancedId : 0;
        }
        else
        {
            path.EnhanceId = targetEnhancedId;
        }

        _ = path.GetSkillTree();

        await player.SendPacket(new PacketSetAvatarEnhancedIdScRsp((uint)path.PathId, path.EnhanceId));
        await player.SendPacket(new PacketPlayerSyncScNotify(avatar));
    }
}

