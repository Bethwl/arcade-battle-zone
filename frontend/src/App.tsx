import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from './config/wagmi';
import Home from './home';
import { LandingPage } from './components/LandingPage';

const queryClient = new QueryClient();

function App() {
  const [showLanding, setShowLanding] = useState(true);

  const handleStart = () => {
    setShowLanding(false);
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en">
          {showLanding ? (
            <LandingPage onStart={handleStart} />
          ) : (
            <Home />
          )}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App
