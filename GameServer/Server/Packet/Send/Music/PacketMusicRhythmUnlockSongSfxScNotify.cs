using March7thHoney.Data;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Music;

public class PacketMusicRhythmUnlockSongSfxScNotify : BasePacket
{
    public PacketMusicRhythmUnlockSongSfxScNotify() : base(CmdIds.MusicRhythmUnlockSongSfxScNotify)
    {
        var proto = new MusicRhythmUnlockSongSfxScNotify();

        SetData(proto);
    }
}

