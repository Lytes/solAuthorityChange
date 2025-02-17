### 🏆 Solana Token Authority Manager

A **Next.js** application for securely **transferring Solana token account ownership** from a **compromised wallet** to a **safe wallet**.

Live at https://sol-authority-change-reto7sdmi-kurolytes-projects.vercel.app/

---

## 🔒 Why This Tool?

From my experience with **white hat wallet recoveries**, threat actors don’t just brick wallets—they often **take control of token accounts**, especially in **airdrop situations**. \

Most users are unaware of this risk and **reach out too late** when hackers have already taken control of the token account \

This tool helps **balance the scales** by allowing users with **compromised wallets** to **securely transfer token account authority** **before** attackers can take control.

## 🔒 Why This Tool?

This tool helps **balance the scales** by allowing users with **compromised wallets** to **securely transfer token account authority** **before** attackers can take control. 🚀

## 🚀 Features

- Connect **Compromised & Safe Wallets**
- **Transfer token authority** from compromised wallet to safe wallet
- **Automatic token account creation** if missing (optional)

---

## 📦 Installation

```sh
git clone https://github.com/Lytes/solAuthorityChange.git
cd solAuthorityChange
npm install
```

---

## ▶️ Usage

1. **Start the app**
   ```sh
   npm run dev
   ```
2. Connect both **Compromised** and **Safe** wallets
3. Enter the **Mint Address** of the token
4. Click **"Change Authority"** to transfer ownership
5. View transaction on **Solana Explorer**

---

## 🔧 Configuration

Set **RPC Endpoint** in `.env`. See `.env.example` for example

```sh
CLUSTER_URL="https://api.devnet.solana.com"
```

Web app defaults to devnet if not CLUSTER URL is not set

---

## 📜 License

MIT

---
