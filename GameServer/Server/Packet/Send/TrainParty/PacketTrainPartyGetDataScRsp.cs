using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TrainParty;

public class PacketTrainPartyGetDataScRsp : BasePacket
{
    public PacketTrainPartyGetDataScRsp() : base(CmdIds.TrainPartyGetDataScRsp)
    {
        SetData(new TrainPartyGetDataScRsp());
    }
}
