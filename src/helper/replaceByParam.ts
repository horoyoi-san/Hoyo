export function replaceByParam(desc: string, params: number[]): string {
    function formatParam(
        indexStr: string,
        format: string,
        floatDigits: string | undefined,
        percent: string | undefined
    ): string {
        const i: number = parseInt(indexStr, 10) - 1;
        const value: number | undefined = params[i];
        if (value === undefined) return "";

        if (format.startsWith("f")) {
            const digits: number = parseInt(floatDigits || "1", 10);
            const num: number = percent ? value * 100 : value;
            return `${num.toFixed(digits)}${percent ? "%" : ""}`;
        }

        if (format === "i") {
            return percent ? `${(value * 100).toFixed(0)}%` : `${Math.round(value)}`;
        }

        return `${value}`;
    }

    const desc1 = desc.replace(/<color=#[0-9a-fA-F]{8}>(.*?)<\/color>/g, (match: string, inner: string): string => {
        const colorCode: string = match.match(/#[0-9a-fA-F]{8}/)?.[0] ?? "#ffffff";
        const processed: string = inner
            .replace(/#(\d+)\[(f(\d+)|i)\](%)?/g, (
                _: string,
                index: string,
                format: string,
                floatDigits: string | undefined,
                percent: string | undefined
            ): string => formatParam(index, format, floatDigits, percent))
            .replace(/<unbreak>(.*?)<\/unbreak>/g, "$1");

        return `<span style="color:${colorCode}">${processed}</span>`;
    });

    const desc2 = desc1.replace(/<unbreak>#(\d+)\[(f(\d+)|i)\](%)?<\/unbreak>/g, (
        _: string,
        index: string,
        format: string,
        floatDigits: string | undefined,
        percent: string | undefined
    ): string => formatParam(index, format, floatDigits, percent));

    const desc3 = desc2.replace(/<unbreak>(\d+)<\/unbreak>/g, (_: string, number: string): string => number);

    const desc4 = desc3.replaceAll("\\n", "<br></br>");
    return desc4;
}
