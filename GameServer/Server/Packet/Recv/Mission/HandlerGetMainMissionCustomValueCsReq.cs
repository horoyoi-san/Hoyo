using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.GetMainMissionCustomValueCsReq)]
public class HandlerGetMainMissionCustomValueCsReq : Handler<GetMainMissionCustomValueCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetMainMissionCustomValueCsReq req)
    {
        await connection.SendPacket(new PacketGetMainMissionCustomValueScRsp(req, player));
    }
}
