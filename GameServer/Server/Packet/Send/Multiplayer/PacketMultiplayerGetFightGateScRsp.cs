using March7thHoney.GameServer.Game.MultiPlayer;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Multiplayer;

public class PacketMultiplayerGetFightGateScRsp : BasePacket
{
    public PacketMultiplayerGetFightGateScRsp(Retcode code) : base(CmdIds.MultiplayerGetFightGateScRsp)
    {
        var proto = new HPGIGMPBIBO
        {
            Retcode = (uint)code
        };

        SetData(proto);
    }

    public PacketMultiplayerGetFightGateScRsp(BaseMultiPlayerGameRoomInstance room) : base(
        CmdIds.MultiplayerGetFightGateScRsp)
    {
        // FGNFDGAKKAP = gate room id
        var proto = new HPGIGMPBIBO
        {
            FGNFDGAKKAP = (ulong)room.RoomId,
            GateServerAddress = ConfigManager.Config.GameServer.PublicAddress,
            Port = ConfigManager.Config.GameServer.Port
        };

        SetData(proto);
    }
}
