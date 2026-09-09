using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketFarmElementSweepScRsp : BasePacket
{
    public PacketFarmElementSweepScRsp(Retcode code, int farmElementId) : base(CmdIds.FarmElementSweepScRsp)
    {
        SetData(new FarmElementSweepScRsp
        {
            Retcode = (uint)code,
            PAOFHFLFFHD = (uint)farmElementId
        });
    }

    public PacketFarmElementSweepScRsp(int farmElementId, List<ItemData> drops) : base(CmdIds.FarmElementSweepScRsp)
    {
        var multiple = new ItemList();
        foreach (var drop in drops) multiple.ItemList_.Add(drop.ToProto());

        SetData(new FarmElementSweepScRsp
        {
            Retcode = (uint)Retcode.RetSucc,
            PAOFHFLFFHD = (uint)farmElementId,
            MultipleDropData = multiple
        });
    }
}
