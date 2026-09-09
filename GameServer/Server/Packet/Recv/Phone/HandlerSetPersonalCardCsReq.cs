using March7thHoney.GameServer.Server.Packet.Send.Phone;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Phone;

[Opcode(CmdIds.SetPersonalCardCsReq)]
public class HandlerSetPersonalCardCsReq : Handler<SetPersonalCardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetPersonalCardCsReq req)
    {
        player.Data.PersonalCard = (int)req.Id;

        await connection.SendPacket(new PacketSetPersonalCardScRsp(req.Id));
        await player.TrainCakeCatchManager!.BroadcastPlayerStateAsync();
    }
}
