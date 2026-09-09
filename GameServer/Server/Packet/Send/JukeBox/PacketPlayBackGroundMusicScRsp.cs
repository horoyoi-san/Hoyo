using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.JukeBox;

public class PacketPlayBackGroundMusicScRsp : BasePacket
{
    public PacketPlayBackGroundMusicScRsp(uint musicId) : base(CmdIds.PlayBackGroundMusicScRsp)
    {
        var proto = new EGDFPDHNOKO
        {
            JKFCKJNHLHI = musicId
        };

        SetData(proto);
    }
}
