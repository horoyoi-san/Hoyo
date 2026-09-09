using March7thHoney.GameServer.Game.Lobby;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lobby;

public class PacketLobbySyncInfoScNotify : BasePacket
{
    public PacketLobbySyncInfoScNotify(int uid, LobbyRoomInstance room, LobbyModifyType modifyType) : base(
        CmdIds.LobbySyncInfoScNotify)
    {
        var proto = new LobbySyncInfoScNotify
        {
            DFLEOIGPLNM = { room.Players.Select(x => x.ToProto()) },
            Uid = (uint)uid,
            Type = modifyType
        };

        SetData(proto);
    }
}
