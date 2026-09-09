using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Pet;

public class PacketGetPetDataScRsp : BasePacket
{
    public PacketGetPetDataScRsp(PlayerInstance player) : base(CmdIds.GetPetDataScRsp)
    {
        var proto = new GetPetDataScRsp
        {
            CurPetId = (uint)player.Data.Pet
        };

        foreach (var pet in GameData.PetData.Values) proto.UnlockedPetId.Add((uint)pet.PetID);

        SetData(proto);
    }
}
