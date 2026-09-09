using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketCocoonSweepScRsp : BasePacket
{
    public PacketCocoonSweepScRsp(Retcode code, int cocoonId) : base(CmdIds.CocoonSweepScRsp)
    {
        SetData(new CocoonSweepScRsp
        {
            Retcode = (uint)code,
            CocoonId = (uint)cocoonId
        });
    }

    public PacketCocoonSweepScRsp(int cocoonId, int sweepCount, List<ItemData> drops) : base(CmdIds.CocoonSweepScRsp)
    {
        var multiple = new ItemList();
        foreach (var drop in drops) multiple.ItemList_.Add(drop.ToProto());

        SetData(new CocoonSweepScRsp
        {
            Retcode = (uint)Retcode.RetSucc,
            CocoonId = (uint)cocoonId,
            MultipleDropData = multiple,
            NCEFJFOHGBI = (uint)sweepCount
        });
    }
}
