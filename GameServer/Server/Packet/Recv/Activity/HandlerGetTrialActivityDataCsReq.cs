using March7thHoney.GameServer.Server.Packet.Send.Activity;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Activity;

[Opcode(CmdIds.GetTrialActivityDataCsReq)]
public class HandlerGetTrialActivityDataCsReq : Handler<GetTrialActivityDataCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetTrialActivityDataCsReq req)
    {
        await connection.SendPacket(new PacketGetTrialActivityDataScRsp(player));
    }
}
