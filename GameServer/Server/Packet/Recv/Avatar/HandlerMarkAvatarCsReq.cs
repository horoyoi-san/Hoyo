using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.MarkAvatarCsReq)]
public class HandlerMarkAvatarCsReq : Handler<MarkAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, MarkAvatarCsReq req)
    {
        var avatar = await player.MarkAvatar((int)req.AvatarId, req.IsMarked);
        await connection.SendPacket(new PacketMarkAvatarScRsp(avatar));
    }
}
