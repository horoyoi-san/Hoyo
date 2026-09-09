using March7thHoney.GameServer.Server.Packet.Send.Pet;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Pet;

[Opcode(CmdIds.SummonPetCsReq)]
public class HandlerSummonPetCsReq : Handler<SummonPetCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SummonPetCsReq req)
    {
        var curPetId = player.Data.Pet;
        if (curPetId != req.SummonedPetId)
            await connection.SendPacket(new PacketCurPetChangedScNotify(req.SummonedPetId));

        player.Data.Pet = (int)req.SummonedPetId;

        await connection.SendPacket(new PacketSummonPetScRsp(curPetId, req.SummonedPetId));
        await player.TrainCakeCatchManager!.BroadcastPlayerStateAsync();
    }
}
