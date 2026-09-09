using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.DeleteBlacklistCsReq)]
public class HandlerDeleteBlacklistCsReq : Handler<DeleteBlacklistCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DeleteBlacklistCsReq req)
    {
        player.FriendManager!.RemoveBlackList((int)req.Uid);

        await connection.SendPacket(new PacketDeleteBlacklistScRsp(req.Uid));
    }
}
