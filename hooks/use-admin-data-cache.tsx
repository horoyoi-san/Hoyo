"use client"

import { useState, useCallback, useRef } from "react"

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
}

interface UseAdminDataCacheOptions {
  cacheTimeout?: number // 缓存超时时间（毫秒）
}

export function useAdminDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseAdminDataCacheOptions = {}
) {
  const { cacheTimeout = 5 * 60 * 1000 } = options // 默认5分钟缓存
  
  const cache = useRef<Map<string, CacheEntry<any>>>(new Map())
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    const cached = cache.current.get(key)
    
    // 检查缓存是否有效
    if (!forceRefresh && cached && (now - cached.timestamp) < cacheTimeout && !cached.loading) {
      setData(cached.data)
      setLoading(false)
      setError(null)
      return cached.data
    }

    // 如果正在加载，直接返回
    if (cached?.loading) {
      return cached.data
    }

    try {
      setLoading(true)
      setError(null)
      
      // 标记为正在加载
      cache.current.set(key, {
        data: cached?.data || null,
        timestamp: now,
        loading: true
      })

      const result = await fetcher()
      
      // 更新缓存
      cache.current.set(key, {
        data: result,
        timestamp: now,
        loading: false
      })
      
      setData(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取数据失败"
      setError(errorMessage)
      
      // 移除加载状态
      if (cached) {
        cache.current.set(key, {
          ...cached,
          loading: false
        })
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, cacheTimeout])

  const invalidateCache = useCallback(() => {
    cache.current.delete(key)
    setData(null)
    setError(null)
  }, [key])

  const updateCache = useCallback((newData: T) => {
    const now = Date.now()
    cache.current.set(key, {
      data: newData,
      timestamp: now,
      loading: false
    })
    setData(newData)
  }, [key])

  const getCachedData = useCallback(() => {
    const cached = cache.current.get(key)
    return cached?.data || null
  }, [key])

  const isCacheValid = useCallback(() => {
    const cached = cache.current.get(key)
    if (!cached) return false
    
    const now = Date.now()
    return (now - cached.timestamp) < cacheTimeout
  }, [key, cacheTimeout])

  return {
    data,
    loading,
    error,
    fetchData,
    invalidateCache,
    updateCache,
    getCachedData,
    isCacheValid
  }
}
