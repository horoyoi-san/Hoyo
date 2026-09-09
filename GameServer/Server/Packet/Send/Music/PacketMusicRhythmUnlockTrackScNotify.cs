using March7thHoney.Data;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Music;

public class PacketMusicRhythmUnlockTrackScNotify : BasePacket
{
    public PacketMusicRhythmUnlockTrackScNotify() : base(CmdIds.MusicRhythmUnlockTrackScNotify)
    {
        var proto = new MusicRhythmUnlockTrackScNotify();

        SetData(proto);
    }
}

