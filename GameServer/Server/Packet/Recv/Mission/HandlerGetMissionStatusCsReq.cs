using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.GetMissionStatusCsReq)]
public class HandlerGetMissionStatusCsReq : Handler<GetMissionStatusCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetMissionStatusCsReq req)
    {
        if (req != null) await connection.SendPacket(new PacketGetMissionStatusScRsp(req, player));
    }
}
