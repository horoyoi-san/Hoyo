using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.DeleteFriendCsReq)]
public class HandlerDeleteFriendCsReq : Handler<DeleteFriendCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DeleteFriendCsReq req)
    {
        var uid = await player.FriendManager!.RemoveFriend((int)req.Uid);
        if (uid == null)
            await connection.SendPacket(new PacketDeleteFriendScRsp());
        else
            await connection.SendPacket(new PacketDeleteFriendScRsp((uint)uid));
    }
}
