import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia, hardhat } from "wagmi/chains";
import { createPublicClient, fallback } from "viem";

const customRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

const sepoliaTransports = [
  ...(customRpcUrl ? [http(customRpcUrl)] : []),
  http("https://ethereum-sepolia-rpc.publicnode.com"),
  http("https://1rpc.io/sepolia"),
  http("https://rpc.sepolia.org"),
];

export const wagmiConfig = createConfig({
  chains: [sepolia, hardhat],
  connectors: [injected()],
  transports: {
    [sepolia.id]: fallback(sepoliaTransports),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: fallback(sepoliaTransports),
});
