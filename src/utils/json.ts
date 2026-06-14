/**
 * JSON download utility.
 * Ported from firefly_srtools_1.0 helper/json.ts.
 */

/**
 * Trigger a browser download of a JSON file.
 * @param fileName - Name for the downloaded file (without .json extension)
 * @param data - The data to serialize as JSON
 * @returns true if download was triggered, false on error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function downloadJson(fileName: string, data: any): boolean {
  if (typeof document === "undefined") return false;

  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error("Failed to download JSON:", error);
    return false;
  }
}
