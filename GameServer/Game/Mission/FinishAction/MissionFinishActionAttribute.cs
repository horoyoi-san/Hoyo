using March7thHoney.Enums.Mission;

namespace March7thHoney.GameServer.Game.Mission.FinishAction;

[AttributeUsage(AttributeTargets.Class)]
public class MissionFinishActionAttribute(FinishActionTypeEnum finishAction) : Attribute
{
    public FinishActionTypeEnum FinishAction { get; } = finishAction;
}
