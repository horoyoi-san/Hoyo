using March7thHoney.GameServer.Server.Packet.Send.JukeBox;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.JukeBox;

[Opcode(CmdIds.PlayBackGroundMusicCsReq)]
public class HandlerPlayBackGroundMusicCsReq : Handler<FKLMGEFILDI>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FKLMGEFILDI req)
    {
        var musicId = req.JKFCKJNHLHI;

        player.Data.CurrentBgm = (int)musicId;

        await connection.SendPacket(new PacketPlayBackGroundMusicScRsp(musicId));
    }
}
