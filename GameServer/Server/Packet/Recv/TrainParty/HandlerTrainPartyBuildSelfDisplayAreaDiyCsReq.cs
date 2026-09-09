using March7thHoney.GameServer.Server.Packet.Send.TrainParty;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyBuildSelfDisplayAreaDiyCsReq)]
public class HandlerTrainPartyBuildSelfDisplayAreaDiyCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainPartyBuildSelfDisplayAreaDiyCsReq.Parser.ParseFrom(data);
        var player = connection.Player!;
        var selfDisplay = player.TrainPartyManager!.SetSelfDisplay(req.ACLKMFCDMED);
        await player.SendPacket(new PacketTrainPartyBuildSelfDisplayAreaDiyScRsp(selfDisplay));
    }
}
