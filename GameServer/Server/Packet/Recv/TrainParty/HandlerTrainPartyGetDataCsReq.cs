using March7thHoney.GameServer.Server.Packet.Send.TrainParty;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyGetDataCsReq)]
public class HandlerTrainPartyGetDataCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketTrainPartyGetDataScRsp());
    }
}
