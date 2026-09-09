using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TrainParty;

public class PacketTrainPartyBuildSelfDisplayAreaDiyScRsp : BasePacket
{
    public PacketTrainPartyBuildSelfDisplayAreaDiyScRsp(OIIPJFDNPAH selfDisplay) : base(CmdIds.TrainPartyBuildSelfDisplayAreaDiyScRsp)
    {
        SetData(new TrainPartyBuildSelfDisplayAreaDiyScRsp
        {
            ACLKMFCDMED = selfDisplay
        });
    }
}
