using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.HeartDial;

public class PacketFinishEmotionDialoguePerformanceScRsp : BasePacket
{
    public PacketFinishEmotionDialoguePerformanceScRsp(uint scriptId, uint dialogueId) : base(
        CmdIds.FinishEmotionDialoguePerformanceScRsp)
    {
        var proto = new FinishEmotionDialoguePerformanceScRsp
        {
            DialogueId = dialogueId,
            ScriptId = scriptId,
            RewardList = new ItemList()
        };

        SetData(proto);
    }
}
