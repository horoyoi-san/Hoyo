using March7thHoney.GameServer.Server.Packet.Send.Battle;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Battle;

[Opcode(CmdIds.GetFarmStageGachaInfoCsReq)]
public class HandlerGetFarmStageGachaInfoCsReq : Handler<GetFarmStageGachaInfoCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetFarmStageGachaInfoCsReq req)
    {
        await connection.SendPacket(new PacketGetFarmStageGachaInfoScRsp(req));
    }
}
