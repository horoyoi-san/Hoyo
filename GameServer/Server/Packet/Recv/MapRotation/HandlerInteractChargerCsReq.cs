using March7thHoney.GameServer.Server.Packet.Send.MapRotation;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.MapRotation;

[Opcode(CmdIds.InteractChargerCsReq)]
public class HandlerInteractChargerCsReq : Handler<ICBEPDGBHMM>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ICBEPDGBHMM req)
    {
        player.ChargerNum = 5;
        await connection.SendPacket(new PacketInteractChargerScRsp());
        await connection.SendPacket(new PacketUpdateEnergyScNotify(player.ChargerNum, 5));
    }
}
