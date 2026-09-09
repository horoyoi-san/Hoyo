using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.HeartDial;

public class PacketSubmitEmotionItemScRsp : BasePacket
{
    public PacketSubmitEmotionItemScRsp(uint scriptId) : base(CmdIds.SubmitEmotionItemScRsp)
    {
        var proto = new SubmitEmotionItemScRsp
        {
            ScriptId = scriptId
        };

        SetData(proto);
    }
}
