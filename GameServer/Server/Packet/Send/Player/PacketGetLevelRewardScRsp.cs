using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketGetLevelRewardScRsp : BasePacket
{
    public PacketGetLevelRewardScRsp(uint level, List<ItemData> reward) : base(CmdIds.GetLevelRewardScRsp)
    {
        var proto = new GetLevelRewardScRsp
        {
            Level = level,
            Reward = new ItemList()
        };

        foreach (var item in reward) proto.Reward.ItemList_.Add(item.ToProto());

        SetData(proto);
    }

    public PacketGetLevelRewardScRsp(Retcode retCode) : base(CmdIds.GetLevelRewardScRsp)
    {
        var proto = new GetLevelRewardScRsp
        {
            Retcode = (uint)retCode
        };

        SetData(proto);
    }
}
