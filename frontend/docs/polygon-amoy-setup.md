# Polygon Amoy Setup

Follow these steps to configure the frontend for the Polygon Amoy testnet.

## 1. Copy the environment template

```bash
cp frontend/.env.example frontend/.env.local
```

## 2. Populate required variables

Open `frontend/.env.local` and update the values:

- `THIRDWEB_SECRET_KEY` – Server-side thirdweb secret key.
- `THIRDWEB_SERVER_WALLET_ADDRESS` – Wallet address that receives settled payments.
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` – Client ID for the browser SDK.
- `NEXT_PUBLIC_RPC_URL` – Recommended: `https://rpc-amoy.polygon.technology/`.

## 3. Restart the frontend

After saving the file, restart the Next.js dev server or rebuild the project so the new values are applied.
