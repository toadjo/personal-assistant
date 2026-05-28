import { useState } from "react";
import type { PropsWithChildren, ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createQueryTestWrapper(): ({ children }: PropsWithChildren) => ReactElement {
  return function QueryTestWrapper({ children }: PropsWithChildren): ReactElement {
    const [client] = useState(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
              gcTime: Infinity
            }
          }
        })
    );
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

