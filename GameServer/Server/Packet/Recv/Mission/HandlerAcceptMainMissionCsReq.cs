using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.AcceptMainMissionCsReq)]
public class HandlerAcceptMainMissionCsReq : Handler<AcceptMainMissionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, AcceptMainMissionCsReq req)
    {
        var missionId = req.MainMissionId;

        await player.MissionManager!.AcceptMainMission((int)missionId);

        await connection.SendPacket(new PacketAcceptMainMissionScRsp(missionId));
    }
}
