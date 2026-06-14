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

/**
 * Determines if a stat property uses percentage display.
 * Flat stats contain 'Delta' in their name (e.g., HPDelta, SpeedDelta).
 * Everything else (Ratio, Base) is a percentage stat.
 */
export const isPercent = (property: string): boolean => {
  if (!property) return false;
  return !property.includes("Delta");
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

export const rawCdnUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  // If the path starts with a slash, remove it for consistency
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `https://cdn.neonteam.dev/${cleanPath}`;
};
