using March7thHoney.GameServer.Game.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketEnterSceneByServerScNotify : BasePacket
{
    public PacketEnterSceneByServerScNotify(SceneInstance scene) : base(CmdIds.EnterSceneByServerScNotify)
    {
        var sceneInfo = scene.ToProto();
        scene.MarkClientSceneSnapshotSynced();

        scene.Player.LineupManager!.RecalculateExtraMpCount();
        var lineupProto = scene.Player.LineupManager!.GetCurLineup()!.ToProto();
        var maxMp = (uint)scene.Player.LineupManager.GetMaxMp();
        lineupProto.MaxMp = maxMp;
        if (lineupProto.Mp > maxMp)
            lineupProto.Mp = maxMp;

        var notify = new EnterSceneByServerScNotify
        {
            Scene = sceneInfo,
            Lineup = lineupProto
        };

        SetData(notify);
    }
}
