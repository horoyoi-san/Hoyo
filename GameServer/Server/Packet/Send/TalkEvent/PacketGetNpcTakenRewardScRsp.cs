using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TalkEvent;

public class PacketGetNpcTakenRewardScRsp : BasePacket
{
    public PacketGetNpcTakenRewardScRsp(uint npcId) : base(CmdIds.GetNpcTakenRewardScRsp)
    {
        var proto = new GetNpcTakenRewardScRsp
        {
            NpcId = npcId
        };
        SetData(proto);
    }
}
