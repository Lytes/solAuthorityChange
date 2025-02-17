import { NextPage, FC } from "next";
import { JSX, useState } from "react";
import {
  useWallet,
  // useAnchorWallet,
  ConnectionProvider,
  WalletProvider,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  clusterApiUrl,
  Connection,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import {
  AuthorityType,
  createSetAuthorityInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

import "@solana/wallet-adapter-react-ui/styles.css";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

const App: NextPage = () => {
  const endpoint =
    process.env.NEXT_PUBLIC_CLUSTER_URL || clusterApiUrl("devnet");
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* Wallet Provider for compromised wallet */}
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <CompromisedWallet>
            {(compromisedWallet: WalletContextState) => (
              <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                  <SafeWallet>
                    {(safeWallet: WalletContextState) => (
                      <TransactionExecutor
                        compromisedWallet={compromisedWallet}
                        safeWallet={safeWallet}
                      />
                    )}
                  </SafeWallet>
                </WalletModalProvider>
              </WalletProvider>
            )}
          </CompromisedWallet>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Component for compromised wallet
const CompromisedWallet: NextPage<{
  children: (compromisedWallet: WalletContextState) => JSX.Element;
}> = ({ children }) => {
  const compromisedWallet = useWallet();
  return (
    <div>
      <h3>⚠️ Compromised wallet</h3>
      <WalletMultiButton />
      <p>
        {compromisedWallet.publicKey
          ? `Compromised wallet connected: ${compromisedWallet.publicKey.toBase58()}`
          : "Compromised wallet not Connected"}
      </p>
      {children(compromisedWallet)}
    </div>
  );
};

// Component for safe wallet
const SafeWallet: NextPage<{
  children: (safeWallet: WalletContextState) => JSX.Element;
}> = ({ children }) => {
  const safeWallet = useWallet();
  return (
    <div>
      <h3>✅ Safe wallet</h3>
      <WalletMultiButton />
      <p>
        {safeWallet?.publicKey
          ? `Safe wallet connected: ${safeWallet.publicKey.toBase58()}`
          : "Safe wallet Not Connected"}
      </p>
      {children(safeWallet)}
    </div>
  );
};

interface TransactionExecutorProps {
  compromisedWallet: WalletContextState;
  safeWallet: WalletContextState;
}

// ✅ Transaction Executor with Proper TypeScript Typing
const TransactionExecutor: FC<TransactionExecutorProps> = (props) => {
  const [mintAddress, setMintAddress] = useState<string>("");
  const [createTokenAccount, setCreateTokenAccount] = useState<boolean>(false); // Checkbox state

  const compromisedWallet: WalletContextState = props.compromisedWallet;
  const safeWallet: WalletContextState = props.safeWallet;

  // const logWallets = () => {
  //   console.log(
  //     compromisedWallet.publicKey
  //       ? `✅ compromised wallet: ${compromisedWallet.publicKey.toBase58()}`
  //       : "❌ compromised wallet not connected"
  //   );
  //   console.log(
  //     safeWallet.publicKey
  //       ? `✅ safe wallet: ${safeWallet.publicKey.toBase58()}`
  //       : "❌ safe wallet not connected"
  //   );
  // };

  const createTx = async () => {
    if (
      !compromisedWallet ||
      !safeWallet ||
      !compromisedWallet.publicKey ||
      !safeWallet.publicKey
    ) {
      console.log("❌ Both wallets not connected");
      return;
    }
    const connection = new Connection(
      process.env.NEXT_PUBLIC_CLUSTER_URL || clusterApiUrl("devnet"),
      "confirmed"
    );

    // const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // Step 1: Validate & Convert Mint Address to PublicKey
    let mintPubKey: PublicKey;
    try {
      mintPubKey = new PublicKey(mintAddress);
    } catch {
      console.log("❌ Invalid mint address");
      return;
    }
    console.log(`✅ Using Mint: ${mintPubKey.toBase58()}`);

    const tokenAccount = await getAssociatedTokenAddress(
      mintPubKey,
      compromisedWallet.publicKey
    );

    const tokenAccountInfo = await connection.getParsedAccountInfo(
      tokenAccount
    );
    if (tokenAccountInfo.value) {
      console.log("✅ Token Account Found:", tokenAccount.toBase58());
      console.log("🔹 Full Token Account Data:", tokenAccountInfo.value);

      const accountData = tokenAccountInfo.value.data;
      if ("parsed" in accountData) {
        if (accountData.parsed.info.owner != compromisedWallet.publicKey) {
          alert(
            `The token account owner has already been changed to ${accountData.parsed.info.owner}`
          );
        }
      }
    }

    const tx = new Transaction();
    if (!tokenAccountInfo) {
      if (createTokenAccount) {
        console.log(`🔹 Token account does not exist. Creating one...`);
        const createTokenAccountIx = createAssociatedTokenAccountInstruction(
          compromisedWallet.publicKey, // Funding payer
          tokenAccount, // Associated Token Account
          compromisedWallet.publicKey, // Owner
          mintPubKey // Mint
        );
        tx.add(createTokenAccountIx);
        alert(`✅ Token account creation instruction added`);
      } else {
        alert(
          `❌ ${compromisedWallet.publicKey.toBase58()} does not have any token account for the mint address`
        );
        return;
      }
    }

    tx.add(
      createSetAuthorityInstruction(
        tokenAccount,
        compromisedWallet.publicKey,
        AuthorityType.AccountOwner,
        safeWallet.publicKey
      )
    );
    tx.feePayer = safeWallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    if (!compromisedWallet.signTransaction) {
      console.log("CompromisedWallet can't sign");
      return;
    }
    const partialSignedTx = await compromisedWallet.signTransaction(tx);

    if (!safeWallet.signTransaction) {
      console.log("SafeWallet can't sign");
      return;
    }
    const fullySignedTx = await safeWallet.signTransaction(partialSignedTx);

    console.log("Signed both");
    console.log(fullySignedTx);

    // Step 7: Send Transaction
    try {
      const txid = await connection.sendRawTransaction(
        fullySignedTx.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log(
        `✅ Transaction Sent: https://explorer.solana.com/tx/${txid}?cluster=devnet`
      );
      alert(
        `✅ Transaction successful! View on Solana Explorer:\nhttps://explorer.solana.com/tx/${txid}?cluster=devnet`
      );
    } catch (error) {
      console.error("❌ Error sending transaction:", error);
      alert(`❌ Transaction failed: ${error.message}`);
    }
  };

  return (
    <div>
      {/* <button
        onClick={logWallets}
        style={{ padding: "10px", marginTop: "10px", cursor: "pointer" }}
      >
        Log Wallets
      </button> */}

      {/* Input for mint address */}
      <input
        type="text"
        placeholder="Enter Mint Address"
        value={mintAddress}
        onChange={(e) => setMintAddress(e.target.value)}
        style={{
          display: "block",
          marginTop: "10px",
          padding: "8px",
          width: "100%",
        }}
      />

      {/* Checkbox to create token account if missing */}
      <div style={{ marginTop: "10px" }}>
        <input
          type="checkbox"
          id="createTokenAccount"
          checked={createTokenAccount}
          onChange={() => setCreateTokenAccount(!createTokenAccount)}
        />
        <label htmlFor="createTokenAccount" style={{ marginLeft: "5px" }}>
          Create token account if it doesn't exist
        </label>
      </div>

      {/* Explanation text for the transaction */}
      {compromisedWallet.publicKey && safeWallet.publicKey && mintAddress && (
        <p
          style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "#f8f9fa",
            borderRadius: "5px",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          <strong>This tool will transfer control of the token:</strong> <br />
          <strong>From:</strong> {compromisedWallet.publicKey.toBase58()} <br />
          <strong>Token Mint:</strong> {mintAddress} <br />
          <strong>To:</strong> {safeWallet.publicKey.toBase58()} <br />
          <span style={{ color: "red" }}>
            ⚠️ This action is irreversible. Proceed with caution.
          </span>
        </p>
      )}

      <button
        onClick={createTx}
        style={{ padding: "10px", marginTop: "10px", cursor: "pointer" }}
      >
        Change Authority
      </button>

      {/* 🚀 New: Note about the payer wallet */}
      <p
        style={{
          marginTop: "10px",
          fontSize: "14px",
          color: "#555",
          textAlign: "center",
        }}
      >
        <strong>Note:</strong> By default, the <strong>safe wallet</strong> is
        used as the payer for this transaction. This means the compromised
        wallet does not need to have sol
      </p>
    </div>
  );
};

export default App;
