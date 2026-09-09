using March7thHoney.Enums.Mission;

namespace March7thHoney.GameServer.Game.Mission.FinishType;

public class MissionFinishTypeAttribute(MissionFinishTypeEnum finishType) : Attribute
{
    public MissionFinishTypeEnum FinishType { get; private set; } = finishType;
}
