using March7thHoney.Database.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketPlayerHeartBeatScRsp : BasePacket
{
    public PacketPlayerHeartBeatScRsp(long clientTime, PlayerData? playerData) : base(CmdIds.PlayerHeartBeatScRsp)
    {
        SetData(new PlayerHeartBeatScRsp
        {
            ClientTimeMs = (ulong)clientTime,
            ServerTimeMs = (ulong)ServerTimeProvider.GetServerUnixMs(playerData)
        });
    }
}
