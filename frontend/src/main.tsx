import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import App from "@/App"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/AuthContext"
import { FavoritesProvider } from "@/features/favorites/FavoritesContext"
import "@/index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

function lockDocumentZoom() {
  const preventZoom = (event: Event) => event.preventDefault()
  document.addEventListener("gesturestart", preventZoom, { passive: false })
  document.addEventListener("gesturechange", preventZoom, { passive: false })
  document.addEventListener("gestureend", preventZoom, { passive: false })
}

lockDocumentZoom()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <TooltipProvider>
            <BrowserRouter>
              <App />
              <Toaster position="top-center" />
            </BrowserRouter>
          </TooltipProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
