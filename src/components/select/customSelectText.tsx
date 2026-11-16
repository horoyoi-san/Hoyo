/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import dynamic from "next/dynamic"
import type { SingleValue } from "react-select"
import { replaceByParam } from '@/helper'
import useLocaleStore from '@/stores/localeStore'
import { themeColors } from '@/constant/constant'
import type { Props as SelectProps } from "react-select"
import { JSX } from "react"
import { useShallow } from "zustand/react/shallow"
import { MENU_MAX_HEIGHT, useMenuPlacement } from "./useMenuPlacement"

const Select = dynamic(
  () => import("react-select").then(m => m.default),
  {
    ssr: false,
    loading: () => <div className="h-10 w-full rounded-xl bg-base-200/60 border border-base-content/10 animate-pulse" />,
  }
) as <Option, IsMulti extends boolean = false>(
  props: SelectProps<Option, IsMulti>
) => JSX.Element

export type SelectOption = {
  id: string
  name: string
  time?: string
  description?: string
}

type SelectCustomProp = {
  customSet: SelectOption[]
  excludeSet: SelectOption[]
  selectedCustomSet: string
  placeholder: string
  setSelectedCustomSet: (value: string) => void
}

export default function SelectCustomText({ customSet, excludeSet, selectedCustomSet, placeholder, setSelectedCustomSet }: SelectCustomProp) {
  const options: SelectOption[] = customSet
  const { theme } = useLocaleStore(
    useShallow((state) => ({ theme: state.theme }))
  )
  const c = themeColors[theme] || themeColors.winter
  const { anchorRef, menuPlacement, updateMenuPlacement } = useMenuPlacement()

  const customStyles = {
    option: (p: any, s: any) => ({
      ...p,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: s.isFocused ? c.bgHover : c.bg,
      color: c.text,
      cursor: 'pointer'
    }),

    singleValue: (p: any) => ({
      ...p,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: c.text
    }),

    control: (p: any) => ({
      ...p,
      backgroundColor: c.bg,
      borderColor: c.border,
      boxShadow: 'none'
    }),

    menu: (p: any) => ({
      ...p,
      backgroundColor: c.bg,
      color: c.text,
      zIndex: 9999
    }),

    menuPortal: (p: any) => ({
      ...p,
      zIndex: 9999
    })
  }


  const formatOptionLabel = (option: SelectOption) => (
    <div className="flex flex-col gap-1 w-full h-full">
      <div
        className="font-bold text-lg"
        dangerouslySetInnerHTML={{
          __html: replaceByParam(
            option.name,
            []
          )
        }}
      />
      {option.time && !option.time.includes("undefined") && (
        <div className='text-sm opacity-70'>{option.time}</div>
      )}
      {option.description && <div
        className="text-base"
        dangerouslySetInnerHTML={{
          __html: option.description
        }}
      />}
    </div>
  )

  return (
    <div ref={anchorRef}>
      <Select
        options={options.filter(opt => !excludeSet.some(ex => ex.id === opt.id))}
        value={options.find(opt => {
          return opt.id === selectedCustomSet
        }) || null}
        onChange={(selected: SingleValue<SelectOption>) => {
          setSelectedCustomSet(selected?.id || '')
        }}
        formatOptionLabel={formatOptionLabel}
        styles={customStyles}
        placeholder={placeholder}
        className="my-react-select-container"
        classNamePrefix="my-react-select"
        menuPlacement={menuPlacement}
        maxMenuHeight={MENU_MAX_HEIGHT}
        onMenuOpen={updateMenuPlacement}
        isSearchable
        isClearable
      />
    </div>
  )
}
