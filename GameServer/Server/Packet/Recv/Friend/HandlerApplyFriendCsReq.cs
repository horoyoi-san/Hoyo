using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.ApplyFriendCsReq)]
public class HandlerApplyFriendCsReq : Handler<ApplyFriendCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ApplyFriendCsReq req)
    {
        var ret = await player.FriendManager!.AddFriend((int)req.Uid);

        await connection.SendPacket(new PacketApplyFriendScRsp(ret, req.Uid));
    }
}
