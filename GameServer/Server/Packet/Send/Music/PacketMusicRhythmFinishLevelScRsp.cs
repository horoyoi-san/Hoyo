using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Music;

public class PacketMusicRhythmFinishLevelScRsp : BasePacket
{
    public PacketMusicRhythmFinishLevelScRsp(uint curLevel) : base(CmdIds.MusicRhythmFinishLevelScRsp)
    {
        var proto = new MusicRhythmFinishLevelScRsp
        {
            LevelId = curLevel
        };

        SetData(proto);
    }
}
