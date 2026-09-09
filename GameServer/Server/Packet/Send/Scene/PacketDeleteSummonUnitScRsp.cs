using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketDeleteSummonUnitScRsp : BasePacket
{
    public PacketDeleteSummonUnitScRsp(IEnumerable<uint> deletedEntityIds) : base(CmdIds.DeleteSummonUnitScRsp)
    {
        var proto = new DeleteSummonUnitScRsp { Retcode = (uint)Retcode.RetSucc };
        proto.EntityIdList.Add(deletedEntityIds);
        SetData(proto);
    }
}
