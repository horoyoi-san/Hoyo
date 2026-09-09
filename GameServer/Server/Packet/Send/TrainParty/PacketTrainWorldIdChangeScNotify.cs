using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TrainParty;

public class PacketTrainWorldIdChangeScNotify : BasePacket
{
    public PacketTrainWorldIdChangeScNotify(uint worldId) : base(CmdIds.TrainWorldIdChangeScNotify)
    {
        SetData(new TrainWorldIdChangeScNotify
        {
            CFDCEEMIOCO = worldId
        });
    }
}
