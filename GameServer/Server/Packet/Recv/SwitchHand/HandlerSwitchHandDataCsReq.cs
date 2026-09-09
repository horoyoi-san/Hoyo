using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.SwitchHand;

[Opcode(CmdIds.SwitchHandDataCsReq)]
public class HandlerSwitchHandDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(CmdIds.GetSwitchHandDataScRsp);
    }
}
