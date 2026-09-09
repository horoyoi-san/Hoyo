namespace March7thHoney.Database;

/// <summary>Maps an entity (BaseDatabaseDataHelper subclass) to its database table name.</summary>
[AttributeUsage(AttributeTargets.Class)]
public sealed class DbTableAttribute(string name) : Attribute
{
    public string Name { get; } = name;
}

/// <summary>Marks a property that must not be persisted (replaces SqlSugar IsIgnore).</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class DbIgnoreAttribute : Attribute;
