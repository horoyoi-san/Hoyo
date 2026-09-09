using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.GetFriendRecommendListInfoCsReq)]
public class HandlerGetFriendRecommendListInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var friends = player.FriendManager!.GetRandomFriend();

        await connection.SendPacket(new PacketGetFriendRecommendListInfoScRsp(friends));
    }
}
