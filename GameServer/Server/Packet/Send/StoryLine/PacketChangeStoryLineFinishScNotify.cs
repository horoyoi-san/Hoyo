using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.StoryLine;

public class PacketChangeStoryLineFinishScNotify : BasePacket
{
    public PacketChangeStoryLineFinishScNotify(int curId, ChangeStoryLineAction reason) : base(
        CmdIds.ChangeStoryLineFinishScNotify)
    {
        var proto = new ChangeStoryLineFinishScNotify
        {
            Action = reason,
            CurStoryLineId = (uint)curId
        };

        SetData(proto);
    }
}
