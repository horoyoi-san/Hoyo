using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketRankUpEquipmentScRsp : BasePacket
{
    public PacketRankUpEquipmentScRsp(Retcode retcode) : base(CmdIds.RankUpEquipmentScRsp)
    {
        SetData(new RankUpEquipmentScRsp
        {
            Retcode = (uint)retcode
        });
    }
}
