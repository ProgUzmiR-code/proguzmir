
export default function handler(req, res) {
  // Bu funksiya Vercel serverida ishlaydi va .env ni o'qiy oladi
  res.status(200).json({
    ton_address: process.env.MERCHANT_TON,
    evm_address: process.env.MERCHANT_EVM,
  });
}

