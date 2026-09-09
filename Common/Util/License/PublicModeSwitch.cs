namespace March7thHoney.Util.License;

public static class PublicModeSwitch
{
#if PUBLIC_MODE
    public const bool Enabled = true;
#else
    public const bool Enabled = false;
#endif
}

