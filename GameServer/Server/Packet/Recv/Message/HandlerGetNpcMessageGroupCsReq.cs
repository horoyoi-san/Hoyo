using March7thHoney.GameServer.Server.Packet.Send.Message;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Message;

[Opcode(CmdIds.GetNpcMessageGroupCsReq)]
public class HandlerGetNpcMessageGroupCsReq : Handler<GetNpcMessageGroupCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetNpcMessageGroupCsReq req)
    {
        await connection.SendPacket(new PacketGetNpcMessageGroupScRsp(req.BJIPBBFIBPD, player));
    }
}
