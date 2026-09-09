using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.HeartDial;

public class PacketChangeScriptEmotionScRsp : BasePacket
{
    public PacketChangeScriptEmotionScRsp(uint scriptId, HeartDialEmotionType emotion) : base(
        CmdIds.ChangeScriptEmotionScRsp)
    {
        var proto = new ChangeScriptEmotionScRsp
        {
            ScriptId = scriptId,
            EmotionType = emotion
        };

        SetData(proto);
    }
}
