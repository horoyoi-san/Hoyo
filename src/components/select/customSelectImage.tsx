/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import dynamic from "next/dynamic"
import type { SingleValue } from "react-select"
import Image from "next/image"
import useLocaleStore from "@/stores/localeStore"
import { useShallow } from "zustand/react/shallow"
import ParseText from "../parseText"
import { themeColors } from "@/constant/constant"
import type { Props as SelectProps } from "react-select"
import { JSX } from "react"
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
  value: string
  label: string
  imageUrl: string
}

type SelectCustomProp = {
  customSet: SelectOption[]
  excludeSet: SelectOption[]
  selectedCustomSet: string
  placeholder: string
  setSelectedCustomSet: (value: string) => void
}

export default function SelectCustomImage({ customSet, excludeSet, selectedCustomSet, placeholder, setSelectedCustomSet }: SelectCustomProp) {
  const options: SelectOption[] = customSet
  const { locale, theme } = useLocaleStore(
    useShallow((state) => ({
      locale: state.locale,
      theme: state.theme,
    }))
  )

  const c = themeColors[theme] || themeColors.winter
  const { anchorRef, menuPlacement, updateMenuPlacement } = useMenuPlacement()

  const customStyles = {
    option: (p: any, s: any) => ({
      ...p,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 14px',
      backgroundColor: s.isFocused ? c.bgHover : c.bg,
      color: c.text,
      cursor: 'pointer',
      opacity: 1,
    }),

    singleValue: (p: any) => ({
      ...p,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: c.text,
      opacity: 1,
    }),

    control: (p: any) => ({
      ...p,
      backgroundColor: c.bg,
      borderColor: c.border,
      boxShadow: 'none',
      opacity: 1,
      minHeight: '38px',
      borderRadius: '12px',
    }),

    menu: (p: any) => ({
      ...p,
      backgroundColor: c.bg,
      color: c.text,
      zIndex: 99999,
      opacity: 1,
      border: `1px solid ${c.border}`,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      borderRadius: '12px',
      overflow: 'hidden',
    }),

    menuList: (p: any) => ({
      ...p,
      backgroundColor: c.bg,
      padding: 0,
      opacity: 1,
    }),

    menuPortal: (p: any) => ({
      ...p,
      zIndex: 99999,
      opacity: 1,
    })
  }

  const formatOptionLabel = (option: SelectOption) => (
    <div className="flex items-center gap-1 w-full h-full">
      <Image
        unoptimized
        src={option.imageUrl}
        alt=""
        width={125}
        height={125}
        className="w-8 h-8 object-contain bg-warning-content rounded-full"
      />
      <ParseText className='font-bold' text={option.label} locale={locale} />
    </div>
  )

  return (
    <div ref={anchorRef}>
      <Select
        options={options.filter(opt => !excludeSet.some(ex => ex.value === opt.value))}
        value={options.find(opt => {
          return opt.value === selectedCustomSet
        }) || null}
        onChange={(selected: SingleValue<SelectOption>) => {
          setSelectedCustomSet(selected?.value || '')
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
