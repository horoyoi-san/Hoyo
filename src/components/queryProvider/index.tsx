"use client";

import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react';
import { getQueryClient } from '@/lib/queryClient';

export default function QueryProviderWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}