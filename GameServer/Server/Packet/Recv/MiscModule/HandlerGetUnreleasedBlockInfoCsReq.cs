using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.MiscModule;

[Opcode(CmdIds.GetUnreleasedBlockInfoCsReq)]
public class HandlerGetUnreleasedBlockInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(CmdIds.GetUnreleasedBlockInfoScRsp);
    }
}
