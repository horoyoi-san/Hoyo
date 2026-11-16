// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function downloadJson(fileName: string, data: any): boolean {
  if (typeof document === "undefined") return false

  try {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error("Failed to download JSON:", error)
    return false
  }
}
