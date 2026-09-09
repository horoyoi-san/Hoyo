using March7thHoney.GameServer.Server.Packet.Send.Mail;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mail;

[Opcode(CmdIds.GetMailCsReq)]
public class HandlerGetMailCsReq : Handler<GetMailCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetMailCsReq req)
    {
        // 4.3: GetMailCsReq 鍒嗛〉瀛楁娣锋穯鍚嶅彉鏇?(start/requestedCount)
        await connection.SendPacket(new PacketGetMailScRsp(player, req.Start, req.HFKFNFKIEON));
    }
}
