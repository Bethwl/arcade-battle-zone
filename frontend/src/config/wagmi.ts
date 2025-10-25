import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

const WALLETCONNECT_PROJECT_ID = '00000000000000000000000000000000';

export const config = getDefaultConfig({
  appName: 'FHE Rock Paper Scissors',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [sepolia],
  ssr: false,
});
