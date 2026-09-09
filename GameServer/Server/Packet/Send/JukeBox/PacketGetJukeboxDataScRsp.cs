using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.JukeBox;

public class PacketGetJukeboxDataScRsp : BasePacket
{
    public PacketGetJukeboxDataScRsp(PlayerInstance player) : base(CmdIds.GetJukeboxDataScRsp)
    {
        // 4.4: JukeBox proto 混淆名变更
        //   now-playing wrapper: GFFOBALDBPM (type MNCBEDBDDHL), inner JKNLCEEDAHJ (type KHADHDLCNOI)
        //   UnlockedMusicList -> IOKAJIBHLMP (repeated, element MusicData -> LHHGCDLCJDA, IsPlayed -> BIMDKNLMICG)
        var proto = new GetJukeboxDataScRsp
        {
            GFFOBALDBPM = new MNCBEDBDDHL
            {
                JKNLCEEDAHJ = new KHADHDLCNOI
                {
                    Id = (uint)player.Data.CurrentBgm
                }
            }
        };

        foreach (var music in GameData.BackGroundMusicData.Values)
            proto.IOKAJIBHLMP.Add(new LHHGCDLCJDA
            {
                Id = (uint)music.ID,
                GroupId = (uint)music.GroupID,
                BIMDKNLMICG = true
            });

        SetData(proto);
    }
}

