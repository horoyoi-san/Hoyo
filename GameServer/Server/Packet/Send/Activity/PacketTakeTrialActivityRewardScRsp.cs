using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Activity;

public class PacketTakeTrialActivityRewardScRsp : BasePacket
{
    public PacketTakeTrialActivityRewardScRsp(uint stageId, List<ItemData> rewards) : base(
        CmdIds.TakeTrialActivityRewardScRsp)
    {
        var proto = new TakeTrialActivityRewardScRsp
        {
            StageId = stageId,
            Reward = new ItemList()
        };
        proto.Reward.ItemList_.Add(rewards.Select(x => x.ToProto()).ToArray());

        SetData(proto);
    }
}
