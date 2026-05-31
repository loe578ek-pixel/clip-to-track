import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Handle deep links for OAuth redirects
    const setupDeepLinks = async () => {
      CapacitorApp.addListener('appUrlOpen', async (event) => {
        console.log('App opened with URL:', event.url);
        
        // Extract the search params/fragment from the URL
        const url = new URL(event.url);
        const hash = url.hash; // Supabase OAuth often uses fragments
        
        if (hash) {
          // You can use supabase.auth.getSession() or similar
          // But usually, just letting Supabase handle the URL is enough if configured
          console.log('Detected hash in deep link, session should be updated');
        }
      });
    };

    setupDeepLinks();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
