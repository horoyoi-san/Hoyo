import { QueryClient } from "@tanstack/react-query"

// One client per browser tab, also used outside React.
let browserClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  // On the server every render gets its own client, so requests never share one.
  if (typeof window === "undefined") return new QueryClient()
  return (browserClient ??= new QueryClient())
}
