const formatValue = (value: number, format: string, floatDigits?: string, hasPercent?: boolean): string => {
    if (format.startsWith('f')) {
        const digits = parseInt(floatDigits || "1", 10);
        const num = hasPercent ? value * 100 : value;
        return `${num.toFixed(digits)}${hasPercent ? "%" : ""}`;
    }

    if (format === 'i') {
        const num = hasPercent ? value * 100 : value;
        return `${Math.round(num)}${hasPercent ? "%" : ""}`;
    }

    return String(value);
};

export function replaceByParam(desc?: string, params: number[] = []): string {
    if (!desc) return "";

    const PARAM_REGEX = /#(\d+)\[(f(\d+)|i)\](%)?/g;

    const processor = (_match: string, index: string, format: string, digits?: string, percent?: string): string => {
        const i = parseInt(index, 10) - 1;
        const val = params[i];
        return val !== undefined ? formatValue(val, format, digits, !!percent) : "";
    };

    let result = desc.replace(/<color=(#[0-9a-fA-F]{8})>(.*?)<\/color>/g, (_, color, inner) => {
        const processedInner = inner.replace(PARAM_REGEX, processor);
        return `<span style="color: ${color}">${processedInner}</span>`;
    });

    result = result.replace(/<unbreak>(.*?)<\/unbreak>/g, (_, inner) => {
        return inner.replace(PARAM_REGEX, processor);
    });

    result = result.replace(PARAM_REGEX, processor);

    return result.split("\\n").join("<br/>");
}
