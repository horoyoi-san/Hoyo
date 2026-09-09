using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Tutorial;

public class PacketGetTutorialGuideScRsp : BasePacket
{
    public PacketGetTutorialGuideScRsp(PlayerInstance player) : base(CmdIds.GetTutorialGuideScRsp)
    {
        var proto = new GetTutorialGuideScRsp();
        foreach (var data in player.TutorialGuideData?.Tutorials ?? [])
            proto.TutorialGuideList.Add(new TutorialGuide
            {
                Id = (uint)data.Key,
                Status = data.Value
            });

        SetData(proto);
    }
}
