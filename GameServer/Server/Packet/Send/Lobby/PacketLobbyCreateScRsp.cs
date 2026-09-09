using March7thHoney.GameServer.Game.Lobby;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lobby;

public class PacketLobbyCreateScRsp : BasePacket
{
    public PacketLobbyCreateScRsp(LobbyRoomInstance room) : base(CmdIds.LobbyCreateScRsp)
    {
        var proto = new LobbyCreateScRsp
        {
            RoomId = (ulong)room.RoomId,
            GJNMHILINHC = room.GameMode,
            DFLEOIGPLNM = { room.Players.Select(x => x.ToProto()) },
            HDJFGMGAOOF = (uint)room.LobbyMode
        };

        SetData(proto);
    }

    public PacketLobbyCreateScRsp(Retcode retCode) : base(CmdIds.LobbyCreateScRsp)
    {
        var proto = new LobbyCreateScRsp
        {
            Retcode = (uint)retCode
        };

        SetData(proto);
    }
}
