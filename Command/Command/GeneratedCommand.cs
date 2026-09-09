using March7thHoney.Command;

namespace March7thHoney.Command.Command;

/// <summary>
///     A single command method entry: its name (for diagnostics), the parsed match conditions and a compiled
///     invoker delegate. Produced by the source generator (<c>GeneratedCommandRegistry</c>) to replace reflection.
/// </summary>
public sealed class GeneratedCommandMethod(
    string name,
    List<CommandCondition> conditions,
    Func<ICommand, CommandArg, object?> invoke)
{
    public string Name { get; } = name;
    public List<CommandCondition> Conditions { get; } = conditions;
    public Func<ICommand, CommandArg, object?> Invoke { get; } = invoke;
}

/// <summary>
///     A registered command: its metadata attribute, a singleton instance, the method dispatch table and an
///     optional default method. Produced by the source generator.
/// </summary>
public sealed class GeneratedCommand(
    CommandInfoAttribute info,
    ICommand instance,
    GeneratedCommandMethod[] methods,
    GeneratedCommandMethod? @default)
{
    public CommandInfoAttribute Info { get; } = info;
    public ICommand Instance { get; } = instance;
    public GeneratedCommandMethod[] Methods { get; } = methods;
    public GeneratedCommandMethod? Default { get; } = @default;
}
