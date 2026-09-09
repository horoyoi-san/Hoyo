using March7thHoney.GameServer.Server.Packet.Send.Music;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Music;

[Opcode(CmdIds.MusicRhythmStartLevelCsReq)]
public class HandlerMusicRhythmStartLevelCsReq : Handler<MusicRhythmStartLevelCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, MusicRhythmStartLevelCsReq req)
    {
        var curLevel = req.LevelId;

        player.Data.CurMusicLevel = (int)curLevel;

        await connection.SendPacket(new PacketMusicRhythmStartLevelScRsp(curLevel));
    }
}
