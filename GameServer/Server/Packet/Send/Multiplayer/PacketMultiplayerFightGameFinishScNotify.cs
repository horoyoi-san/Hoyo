using March7thHoney.GameServer.Game.MultiPlayer;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Multiplayer;

public class PacketMultiplayerFightGameFinishScNotify : BasePacket
{
    public PacketMultiplayerFightGameFinishScNotify(BaseMultiPlayerGameRoomInstance room) : base(
        CmdIds.MultiplayerFightGameFinishScNotify)
    {
        // 4.4 MultiplayerFightGameFinishScNotify = HFFCEACMEIG { KAEDKFOMADJ = session info }
        var proto = new HFFCEACMEIG
        {
            KAEDKFOMADJ = room.ToSessionInfo()
        };

        SetData(proto);
    }
}
