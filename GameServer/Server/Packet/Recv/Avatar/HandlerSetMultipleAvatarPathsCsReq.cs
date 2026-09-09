using March7thHoney.Enums.Avatar;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.SetMultipleAvatarPathsCsReq)]
public class HandlerSetMultipleAvatarPathsCsReq : Handler<SetMultipleAvatarPathsCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetMultipleAvatarPathsCsReq req)
    {
        foreach (var targetAvatarType in req.AvatarIdList)
        {
            var avatarId = (int)targetAvatarType;
            var baseAvatarId = player.AvatarManager!.GetFormalAvatar(avatarId)!.BaseAvatarId;
            if (baseAvatarId == 8001 && avatarId % 2 == 0) avatarId--;
            await player.ChangeAvatarPathType(baseAvatarId, (MultiPathAvatarTypeEnum)avatarId);
        }

        await connection.SendPacket(CmdIds.SetMultipleAvatarPathsScRsp);
    }
}
