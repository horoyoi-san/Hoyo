using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketEnterSceneScRsp : BasePacket
{
    public PacketEnterSceneScRsp(bool overMapTp = false, bool tpByMap = false, int storyLineId = 0,
        uint floorId = 0, uint teleportId = 0) : base(
        CmdIds.EnterSceneScRsp)
    {
        var sceneIdentifier = new SceneIdentifier
        {
            FloorId = floorId,
            GameStoryLineId = (uint)storyLineId
        };
        if (teleportId != 0)
            sceneIdentifier.TeleportInfo = new TeleportInfo
            {
                TeleportId = teleportId
            };

        var proto = new EnterSceneScRsp
        {
            IsCloseMap = tpByMap,
            IsOverMap = overMapTp,
            SceneIdentifier = sceneIdentifier
        };

        SetData(proto);
    }

    public PacketEnterSceneScRsp(Retcode retcode) : base(
        CmdIds.EnterSceneScRsp)
    {
        var proto = new EnterSceneScRsp
        {
            Retcode = (uint)retcode
        };

        SetData(proto);
    }
}

