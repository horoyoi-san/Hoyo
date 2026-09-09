using March7thHoney.Data;
using March7thHoney.Enums.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.SetAvatarPathCsReq)]
public class HandlerSetAvatarPathCsReq : Handler<SetAvatarPathCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetAvatarPathCsReq req)
    {
        GameData.MultiplePathAvatarConfigData.TryGetValue((int)req.AvatarId, out var avatar);

        if (avatar != null)
        {
            if (avatar.BaseAvatarID == 8001)
                await player.ChangeAvatarPathType(avatar.BaseAvatarID,
                    (MultiPathAvatarTypeEnum)(avatar.AvatarID - (player.Data.CurrentGender - 1)));
            else
                await player.ChangeAvatarPathType(avatar.BaseAvatarID,
                    (MultiPathAvatarTypeEnum)avatar.AvatarID);
            await connection.SendPacket(new PacketSetAvatarPathScRsp(avatar.AvatarID));
        }
        else
        {
            await connection.SendPacket(CmdIds.SetAvatarPathScRsp);
        }
    }
}
