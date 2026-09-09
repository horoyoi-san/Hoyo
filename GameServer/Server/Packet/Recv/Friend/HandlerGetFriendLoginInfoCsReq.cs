using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.GetFriendLoginInfoCsReq)]
public class HandlerGetFriendLoginInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var friends = player.FriendManager!
            .GetFriendPlayerData().Select(x => x.Uid).ToList();

        await connection.SendPacket(new PacketGetFriendLoginInfoScRsp(friends));
    }
}
