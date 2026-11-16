'use client'
import { useCallback, useRef, useState } from "react"

/**
 * Must match the maxMenuHeight handed to react-select. Otherwise this hook
 * decides the menu fits while react-select renders it taller than expected and
 * the last option is still clipped.
 */
export const MENU_MAX_HEIGHT = 280

export type MenuPlacement = "top" | "bottom"

/**
 * Pick the menu direction from the room actually available around the field.
 *
 * react-select's own `menuPlacement="auto"` measures against the viewport, so a
 * field in the lower half of a dialog still opened downwards: the window had
 * room below it, the dialog did not, and the options were cut off by the dialog
 * edge. Deciding here means the menu flips up as soon as the space below cannot
 * hold it.
 */
export function useMenuPlacement() {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>("bottom")

  const updateMenuPlacement = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    setMenuPlacement(
      spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow ? "top" : "bottom"
    )
  }, [])

  return { anchorRef, menuPlacement, updateMenuPlacement }
}
