using March7thHoney.GameServer.Server.Packet.Send.Pet;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Pet;

[Opcode(CmdIds.RecallPetCsReq)]
public class HandlerRecallPetCsReq : Handler<RecallPetCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RecallPetCsReq req)
    {
        player.Data.Pet = 0;

        await connection.SendPacket(new PacketRecallPetScRsp(req.SummonedPetId));
        await player.TrainCakeCatchManager!.BroadcastPlayerStateAsync();
    }
}
