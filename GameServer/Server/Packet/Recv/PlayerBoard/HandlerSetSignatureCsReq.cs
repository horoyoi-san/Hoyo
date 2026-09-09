using March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.PlayerBoard;

[Opcode(CmdIds.SetSignatureCsReq)]
public class HandlerSetSignatureCsReq : Handler<SetSignatureCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetSignatureCsReq req)
    {
        player.Data.Signature = req.Signature;

        await connection.SendPacket(new PacketSetSignatureScRsp(req.Signature));
    }
}
