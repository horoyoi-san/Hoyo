export const JSONParse = (data: unknown) => {
  if (!data) return null;

  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (key === "client" || key === "_tasks" || key === "cachedAssetsManager")
        return undefined;
      if (typeof value === "bigint") return value.toString();
      return value;
    }),
  );
};

export const isPercent = (string: string) => {
  if (!string) return "";

  return !string.includes("Delta");
};

export const calculateSubAffixValue = (
  baseValue: number,
  stepValue: number,
  steps: number[] | number,
  count: number,
) => {
  if (typeof steps === "number") {
    return baseValue * count + steps * stepValue;
  }

  const total = steps.reduce((acc, stepQuality) => {
    const rollValue = baseValue + stepQuality * stepValue;
    return acc + rollValue;
  }, 0);

  return total;
};

export const imgUrl = (icon: string, category: string, isSplit = true) => {
  const imgName = isSplit ? icon?.split("/").pop()?.replace(".webp", "") : icon;

  return `https://static.nanoka.cc/assets/hsr/${category}/${imgName}.webp`;
};
