//api/wallet.js
import { createAppKit } from "@reown/appkit";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, arbitrum } from "@reown/appkit/networks";

// 1. Get projectId from https://dashboard.reown.com
const projectId = "4d9838cef79b26992ff9102c92999f79";

// 2. Create your application's metadata object
const metadata = {
  name: "ProgUzmiR",
  description: "AppKit Example",
  url: "https://proguzmir.vercel.app/", // origin must match your domain & subdomain
  icons: ["https://proguzmir.vercel.app/images/logotiv.png"],
};

// 3. Create a AppKit instance
const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [mainnet, arbitrum],
  metadata,
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

export default function handler(req, res) {
  // Bu funksiya Vercel serverida ishlaydi va .env ni o'qiy oladi
  res.status(200).json({
    ton_address: process.env.MERCHANT_TON,
    evm_address: process.env.MERCHANT_EVM,
  });
}

