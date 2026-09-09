using March7thHoney.GameServer.Server.Packet.Send.Raid;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Raid;

[Opcode(CmdIds.GetSaveRaidCsReq)]
public class HandlerGetSaveRaidCsReq : Handler<GetSaveRaidCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetSaveRaidCsReq req)
    {
        await connection.SendPacket(
            new PacketGetSaveRaidScRsp(player, (int)req.RaidId, (int)req.WorldLevel));
    }
}
