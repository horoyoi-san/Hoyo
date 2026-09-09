using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TrainParty;

public class PacketTrainPartyBuildRoomScNotify : BasePacket
{
    public PacketTrainPartyBuildRoomScNotify(PlayerInstance player) : base(CmdIds.TrainPartyBuildRoomScNotify)
    {
        SetData(new TrainPartyBuildRoomScNotify
        {
            CPMHKECPBOJ = player.TrainPartyManager!.ToPartyInfo()
        });
    }
}
