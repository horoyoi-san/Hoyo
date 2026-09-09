using March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.PlayerBoard;

[Opcode(CmdIds.SetDisplayAvatarCsReq)]
public class HandlerSetDisplayAvatarCsReq : Handler<SetDisplayAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetDisplayAvatarCsReq req)
    {
        var avatars = player.AvatarManager!.Data!.DisplayAvatars;
        avatars.Clear();
        foreach (var displayAvatar in req.DisplayAvatarList.OrderBy(x => x.Pos))
        {
            var avatarData = player.AvatarManager!.Data.FormalAvatars.FirstOrDefault(x =>
                x.BaseAvatarId == (int)displayAvatar.AvatarId);
            if (avatarData != null) avatars.Add(avatarData.BaseAvatarId);
        }

        await connection.SendPacket(new PacketSetDisplayAvatarScRsp(req));
    }
}
