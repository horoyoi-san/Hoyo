using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Quest;

public class PacketTakeQuestOptionalRewardScRsp : BasePacket
{
    public PacketTakeQuestOptionalRewardScRsp(uint questId, Retcode retcode, List<ItemData> rewards) : base(
        CmdIds.TakeQuestOptionalRewardScRsp)
    {
        var proto = new TakeQuestOptionalRewardScRsp
        {
            QuestId = questId,
            Retcode = (uint)retcode,
            Reward = new ItemList
            {
                ItemList_ = { rewards.Select(x => x.ToProto()) }
            }
        };

        SetData(proto);
    }
}
