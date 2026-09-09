using March7thHoney.GameServer.Server.Packet.Send.Chat;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Chat;

[Opcode(CmdIds.GetPrivateChatHistoryCsReq)]
public class HandlerGetPrivateChatHistoryCsReq : Handler<GetPrivateChatHistoryCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetPrivateChatHistoryCsReq req)
    {
        await connection.SendPacket(
            new PacketGetPrivateChatHistoryScRsp(req.ContactSide, req.TargetSide, player));
    }
}
