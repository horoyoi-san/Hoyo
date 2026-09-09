using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.AddBlacklistCsReq)]
public class HandlerAddBlacklistCsReq : Handler<AddBlacklistCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, AddBlacklistCsReq req)
    {
        var blocked = await player.FriendManager!.AddBlackList((int)req.Uid);

        if (blocked != null)
            await connection.SendPacket(new PacketAddBlacklistScRsp(blocked));
        else
            await connection.SendPacket(new PacketAddBlacklistScRsp());
    }
}
