using March7thHoney.GameServer.Server.Packet.Send.Music;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Music;

[Opcode(CmdIds.MusicRhythmFinishLevelCsReq)]
public class HandlerMusicRhythmFinishLevelCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var curLevel = player.Data.CurMusicLevel;
        await connection.SendPacket(new PacketMusicRhythmFinishLevelScRsp((uint)curLevel));
    }
}
