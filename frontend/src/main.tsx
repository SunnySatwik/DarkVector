import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App";
import "./index.css";

import { queryClient } from "./lib/queryClient";

import { AlertProvider } from "./context/AlertContext";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AlertProvider>
      <App />
    </AlertProvider>

    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);