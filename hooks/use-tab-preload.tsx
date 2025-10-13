"use client"

import { useState, useCallback, useRef } from "react"

interface UseTabPreloadOptions {
  defaultTab?: string
  preloadDelay?: number
}

export function useTabPreload(options: UseTabPreloadOptions = {}) {
  const { defaultTab = "users", preloadDelay = 100 } = options
  
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set([defaultTab]))
  const [isTransitioning, setIsTransitioning] = useState(false)
  const preloadTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleTabChange = useCallback((value: string) => {
    if (value === activeTab) return

    // 开始过渡动画
    setIsTransitioning(true)
    
    // 立即切换到新 Tab
    setActiveTab(value)
    
    // 标记新 Tab 为已加载
    setLoadedTabs(prev => new Set([...prev, value]))
    
    // 结束过渡动画
    setTimeout(() => {
      setIsTransitioning(false)
    }, 150)
  }, [activeTab])

  // 预加载指定的 Tab（鼠标悬停时调用）
  const preloadTab = useCallback((tabValue: string) => {
    if (loadedTabs.has(tabValue)) return

    // 清除之前的预加载定时器
    const existingTimeout = preloadTimeouts.current.get(tabValue)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // 设置新的预加载定时器
    const timeout = setTimeout(() => {
      setLoadedTabs(prev => new Set([...prev, tabValue]))
      preloadTimeouts.current.delete(tabValue)
    }, preloadDelay)

    preloadTimeouts.current.set(tabValue, timeout)
  }, [loadedTabs, preloadDelay])

  // 取消预加载（鼠标离开时调用）
  const cancelPreload = useCallback((tabValue: string) => {
    const timeout = preloadTimeouts.current.get(tabValue)
    if (timeout) {
      clearTimeout(timeout)
      preloadTimeouts.current.delete(tabValue)
    }
  }, [])

  // 检查 Tab 是否已加载
  const isTabLoaded = useCallback((tabValue: string) => {
    return loadedTabs.has(tabValue)
  }, [loadedTabs])

  // 强制加载所有 Tab（可选）
  const preloadAllTabs = useCallback((tabValues: string[]) => {
    setLoadedTabs(prev => new Set([...prev, ...tabValues]))
  }, [])

  return {
    activeTab,
    loadedTabs,
    isTransitioning,
    handleTabChange,
    preloadTab,
    cancelPreload,
    isTabLoaded,
    preloadAllTabs
  }
}
