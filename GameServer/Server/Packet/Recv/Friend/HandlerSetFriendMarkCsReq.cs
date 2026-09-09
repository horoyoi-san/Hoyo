using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.SetFriendMarkCsReq)]
public class HandlerSetFriendMarkCsReq : Handler<SetFriendMarkCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetFriendMarkCsReq req)
    {
        player.FriendManager!.MarkFriend((int)req.Uid, req.BIJJOJNJHDO);

        await connection.SendPacket(new PacketSetFriendMarkScRsp(req.Uid, req.BIJJOJNJHDO));
    }
}

