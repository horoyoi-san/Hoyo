using March7thHoney.GameServer.Game.MultiPlayer;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Multiplayer;

public class PacketMultiplayerFightGameStartScNotify : BasePacket
{
    public PacketMultiplayerFightGameStartScNotify(BaseMultiPlayerGameRoomInstance room) : base(
        CmdIds.FightGameStartScNotify)
    {
        var proto = new FightGameStartScNotify
        {
            KAEDKFOMADJ = room.ToSessionInfo(),
            DFLEOIGPLNM = { room.ParentLobby.Players.Select(x => x.ToProto()) }
        };

        SetData(proto);
    }
}
