using March7thHoney.GameServer.Server.Packet.Send.Chat;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Chat;

[Opcode(CmdIds.GetChatFriendHistoryCsReq)]
public class HandlerGetChatFriendHistoryCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var history = player.FriendManager!.FriendData.ChatHistory;

        await connection.SendPacket(new PacketGetChatFriendHistoryScRsp(history));
    }
}
