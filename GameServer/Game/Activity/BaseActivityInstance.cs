namespace March7thHoney.GameServer.Game.Activity;

public class BaseActivityInstance(ActivityManager manager)
{
    public ActivityManager ActivityManager { get; private set; } = manager;
}
