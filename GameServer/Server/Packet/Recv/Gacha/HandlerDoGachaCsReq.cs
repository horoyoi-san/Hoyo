using March7thHoney.GameServer.Server.Packet.Send.Gacha;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Gacha;

[Opcode(CmdIds.DoGachaCsReq)]
public class HandlerDoGachaCsReq : Handler<DoGachaCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DoGachaCsReq req)
    {
        var gain = await player.GachaManager!.DoGacha((int)req.GachaId, (int)req.GachaNum);

        if (gain != null)
            await connection.SendPacket(new PacketDoGachaScRsp(gain));
        else
            await connection.SendPacket(new PacketDoGachaScRsp());
    }
}
