using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Activity;

public class PacketCurTrialActivityScNotify : BasePacket
{
    public PacketCurTrialActivityScNotify(uint stageId, TrialActivityStatus status) : base(
        CmdIds.CurTrialActivityScNotify)
    {
        var proto = new CurTrialActivityScNotify
        {
            ActivityStageId = stageId,
            Status = status
        };

        SetData(proto);
    }
}
