using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Avatar;

public class PacketTakePromotionRewardScRsp : BasePacket
{
    public PacketTakePromotionRewardScRsp(Retcode retcode, List<Proto.Item>? rewards = null) : base(CmdIds.TakePromotionRewardScRsp)
    {
        var rsp = new TakePromotionRewardScRsp
        {
            Retcode = (uint)retcode
        };

        if (retcode == Retcode.RetSucc)
        {
            rsp.RewardList = new ItemList();
            if (rewards != null)
                rsp.RewardList.ItemList_.AddRange(rewards);
        }

        SetData(rsp);
    }
}
