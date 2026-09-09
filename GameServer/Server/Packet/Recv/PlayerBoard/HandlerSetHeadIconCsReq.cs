using March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.PlayerBoard;

[Opcode(CmdIds.SetHeadIconCsReq)]
public class HandlerSetHeadIconCsReq : Handler<SetHeadIconCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetHeadIconCsReq req)
    {
        if (req == null) return;
        player.Data.HeadIcon = (int)req.Id;

        await connection.SendPacket(new PacketSetHeadIconScRsp(player));
        await player.TrainCakeCatchManager!.BroadcastPlayerStateAsync();
    }
}
