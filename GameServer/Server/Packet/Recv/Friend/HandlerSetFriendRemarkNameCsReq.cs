using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.SetFriendRemarkNameCsReq)]
public class HandlerSetFriendRemarkNameCsReq : Handler<SetFriendRemarkNameCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetFriendRemarkNameCsReq req)
    {
        player.FriendManager!.RemarkFriendName((int)req.Uid, req.RemarkName);

        await connection.SendPacket(new PacketSetFriendRemarkNameScRsp(req.Uid, req.RemarkName));
    }
}
