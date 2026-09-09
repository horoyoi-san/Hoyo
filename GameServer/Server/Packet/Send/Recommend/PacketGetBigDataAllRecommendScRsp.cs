using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Recommend;

public class PacketGetBigDataAllRecommendScRsp : BasePacket
{
    public PacketGetBigDataAllRecommendScRsp(BigDataRecommendType type) : base(CmdIds.GetBigDataAllRecommendScRsp)
    {
        var proto = new GetBigDataAllRecommendScRsp
        {
            BigDataRecommendType = type
        };

        SetData(proto);
    }
}
