namespace March7thHoney.Util;

/// <summary>
///     A list that can be used to randomly select an element with a certain weight from it.
/// </summary>
/// <typeparam name="T"></typeparam>
public class RandomList<T>
{
    private readonly List<T> _list = [];

    public RandomList()
    {
    }

    public RandomList(IEnumerable<T> collection)
    {
        _list.AddRange(collection);
    }

    public void Add(T item, int weight)
    {
        for (var i = 0; i < weight; i++) _list.Add(item);
    }

    public void Remove(T item)
    {
        var temp = _list.Clone().ToList();
        _list.Clear();
        foreach (var i in temp)
            if (i?.Equals(item) == false)
                _list.Add(i);
    }

    public void AddRange(IEnumerable<T> collection, IEnumerable<int> weights)
    {
        var list = collection.ToList();
        for (var i = 0; i < list.Count; i++) Add(list[i], weights.ElementAt(i));
    }

    public T? GetRandom()
    {
        if (_list.Count == 0) return default;
        return _list[Random.Shared.Next(_list.Count)];
    }

    public void Clear()
    {
        _list.Clear();
    }

    public int GetCount()
    {
        return _list.Count;
    }
}