namespace March7thHoney.ProtoOrganizer;

public sealed record CompatibilityTypeResult(int Added, int Unresolved);

public static class CompatibilityTypes
{
    public static CompatibilityTypeResult Add(
        List<TypeDef> definitions,
        IEnumerable<TypeDef> seedDefinitions,
        IEnumerable<string> manifestPaths)
    {
        var seed = seedDefinitions
            .GroupBy(definition => definition.Name, StringComparer.Ordinal)
            .Where(group => group.Count() == 1)
            .ToDictionary(group => group.Key, group => group.Single(), StringComparer.Ordinal);
        var existing = definitions.Select(definition => definition.Name).ToHashSet(StringComparer.Ordinal);
        var requested = manifestPaths
            .Where(File.Exists)
            .SelectMany(File.ReadLines)
            .Select(line => line.Split('#', 2)[0].Trim())
            .Where(line => line.Length > 0)
            .Distinct(StringComparer.Ordinal);
        var pending = new Queue<string>(requested);
        var added = 0;
        var unresolved = 0;

        while (pending.TryDequeue(out var name))
        {
            if (existing.Contains(name)) continue;
            if (!seed.TryGetValue(name, out var definition))
            {
                unresolved++;
                continue;
            }
            definitions.Add(definition);
            existing.Add(name);
            added++;
            foreach (var reference in definition.Refs)
                if (!existing.Contains(reference)) pending.Enqueue(reference);
        }
        return new CompatibilityTypeResult(added, unresolved);
    }
}
