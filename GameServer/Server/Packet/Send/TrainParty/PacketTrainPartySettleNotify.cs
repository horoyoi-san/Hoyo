using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Send.TrainParty;

public class PacketTrainPartySettleNotify : BasePacket
{
    public PacketTrainPartySettleNotify(PlayerInstance player) : base(CmdIds.TrainPartySettleNotify)
    {
        SetData(player.TrainPartyManager!.BuildSettleNotify());
    }
}
