export const useParsedDesc = () => {
  const parseDesc = (desc: string, params: number[]) => {
    if (!desc) return "";

    let parsed = desc.replace(
      /#(\d+)\[(i|f\d+)\]%?/g,
      (match, index, format) => {
        const i = Number(index) - 1;
        const value = params[i];

        if (value == null) return "";

        // percent check
        const isPercent = match.includes("%");

        // format handler
        if (format === "i") {
          const val = isPercent ? `${(value * 100).toFixed(0)}%` : `${value}`;
          return val;
        }

        // float format (f1, f2)
        if (format.startsWith("f")) {
          const digits = Number(format.slice(1)) || 0;

          const val = isPercent
            ? `${(value * 100).toFixed(digits)}%`
            : `${value.toFixed(digits)}`;

          return val;
        }

        return `${value}`;
      },
    );

    parsed = parsed
      .replace(/<unbreak>/g, "<strong>")
      .replace(/<\/unbreak>/g, "</strong>")
      .replace(/\\N/g, "<br/>")
      .replace(/\\n/g, "<br/>");

    return parsed;
  };

  return parseDesc;
};
