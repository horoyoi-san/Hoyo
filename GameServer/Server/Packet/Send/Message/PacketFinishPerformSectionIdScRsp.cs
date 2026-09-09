using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Message;

public class PacketFinishPerformSectionIdScRsp : BasePacket
{
    public PacketFinishPerformSectionIdScRsp() : base(CmdIds.FinishPerformSectionIdScRsp)
    {
        SetData(new FinishPerformSectionIdScRsp());
    }
}
