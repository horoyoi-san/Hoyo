using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.RndOption;

[Opcode(CmdIds.GetRndOptionCsReq)]
public class HandlerGetRndOptionCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(CmdIds.GetRndOptionScRsp);
    }
}
