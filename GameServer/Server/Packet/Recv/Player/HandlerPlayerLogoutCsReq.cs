using March7thHoney.Kcp;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.PlayerLogoutCsReq)]
public class HandlerPlayerLogoutCsReq : PlayerHandler
{
    private readonly Logger _logger = new("GameServer");

    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var uid = player?.Uid.ToString() ?? "<none>";
        _logger.Info($"Player logout requested. remote={connection.RemoteEndPoint} uid={uid}");

        // TODO 4.3: KCP 鏃朵唬鐨?SendDisconnectPacket锛堟帶鍒跺抚锛夊湪 TCP 涓嬩笉鍐嶉渶瑕侊紝
        // 鐩存帴鍏抽棴 socket 璁╁鎴风鎰熺煡鏂繛銆?
        await Task.Delay(50);
        connection.Stop();
    }
}
