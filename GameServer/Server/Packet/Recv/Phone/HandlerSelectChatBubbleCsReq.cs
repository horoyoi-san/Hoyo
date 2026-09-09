using March7thHoney.GameServer.Server.Packet.Send.Phone;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Phone;

[Opcode(CmdIds.SelectChatBubbleCsReq)]
public class HandlerSelectChatBubbleCsReq : Handler<SelectChatBubbleCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SelectChatBubbleCsReq req)
    {
        player.Data.ChatBubble = (int)req.BubbleId;

        await connection.SendPacket(new PacketSelectChatBubbleScRsp(req.BubbleId));
        await player.TrainCakeCatchManager!.BroadcastPlayerStateAsync();
    }
}
