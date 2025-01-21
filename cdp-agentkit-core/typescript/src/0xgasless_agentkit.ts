import { z } from "zod";
import * as viem from "viem";
import { generatePrivateKey, mnemonicToAccount } from "viem/accounts";
import { ZeroXgaslessSmartAccount, createSmartAccountClient } from "@0xgasless/smart-account";
import { AgentkitAction, ActionSchemaAny } from "./actions/0xgasless/agentkit_action";
import { avalanche, base, metis, moonbeam, fantom, bsc, Chain } from "viem/chains";

/**
 * Configuration options for the Agentkit
 */
interface AgentkitOptions {
  apiKey: string;
  chainID: number;
  privateKey?: `0x${string}`;
}

/**
 * Configuration options for the Agentkit with a Wallet.
 */
interface ConfigureAgentkitWithWalletOptions extends AgentkitOptions {
  mnemonicPhrase?: string;
  accountPath?: number;
}

export const Chains: Record<number, Chain> = {
  8453: base,
  250: fantom,
  1284: moonbeam,
  1088: metis,
  43114: avalanche,
  56: bsc,
};

export class Agentkit {
  private wallet?: viem.WalletClient;
  private smartAccount?: ZeroXgaslessSmartAccount;

  /**
   * Initializes a new Agentkit instance
   *
   * @param config - Configuration options for the Agentkit
   */
  public constructor(config: AgentkitOptions) {
    if (!config.apiKey || config.apiKey === "") {
      throw new Error("API_KEY is required but not provided");
    }
    if (!config.privateKey) {
      config.privateKey = generatePrivateKey();
    }

    if (!Chains[config.chainID]) {
      throw new Error(`Chain ID ${config.chainID} is not supported`);
    }

    // Configure viem wallet
    this.wallet = viem
      .createWalletClient({
        account: config.privateKey,
        chain: Chains[config.chainID],
        transport: viem.http(),
      })
      .extend(viem.publicActions);

    const bundlerUrl = `https://bundler.0xgasless.com/${config.chainID}`;
    const paymasterUrl = `https://paymaster.0xgasless.com/v1/${config.chainID}/rpc/${config.apiKey}`;
    createSmartAccountClient({
      bundlerUrl,
      paymasterUrl,
      chainId: config.chainID,
      signer: this.wallet,
    })
      .then(client => {
        this.smartAccount = client;
      })
      .catch(error => {
        throw new Error(`Failed to create smart account client: ${error}`);
      });
  }

  /**
   * Configures Agentkit with a Wallet.
   *
   * @param config - Optional configuration parameters
   * @returns A Promise that resolves to a new Agentkit instance
   * @throws Error if required environment variables are missing or wallet initialization fails
   */
  public static async configureWithWallet(
    config: ConfigureAgentkitWithWalletOptions,
  ): Promise<Agentkit> {
    const agentkit = new Agentkit(config);

    const mnemonicPhrase = config.mnemonicPhrase || process.env.MNEMONIC_PHRASE;
    try {
      if (config.walletData) {
        const walletData = JSON.parse(config.walletData);
        agentkit.wallet = viem.createWalletClient({
          account: walletData.privateKey,
          chain: baseSepolia,
          transport: viem.http(),
        });
      } else if (mnemonicPhrase) {
        // Create wallet from mnemonic
        const account = await mnemonicToAccount(mnemonicPhrase);
        agentkit.wallet = viem.createWalletClient({
          account,
          chain: baseSepolia,
          transport: viem.http(),
        });
      } else {
        // Create new wallet
        const privateKey = generatePrivateKey();
        agentkit.wallet = viem.createWalletClient({
          account: privateKey,
          chain: baseSepolia,
          transport: viem.http(),
        });
      }
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error}`);
    }

    return agentkit;
  }

  /**
   * Executes an action
   *
   * @param action - The action to execute
   * @param args - Arguments for the action
   * @returns Result of the action execution
   * @throws Error if action execution fails
   */
  async run<TActionSchema extends ActionSchemaAny>(
    action: AgentkitAction<TActionSchema>,
    args: TActionSchema,
  ): Promise<string> {
    if (action.func.length > 1) {
      if (!this.wallet) {
        return `Unable to run Action: ${action.name}. A Wallet is required. Please configure Agentkit with a Wallet to run this action.`;
      }

      return await action.func(this.wallet, args);
    }

    return await (action.func as (args: z.infer<TActionSchema>) => Promise<string>)(args);
  }

  /**
   * Exports wallet data required to re-instantiate the wallet
   *
   * @returns JSON string of wallet data including address and private key
   */
  async exportWallet(): Promise<string> {
    if (!this.wallet) {
      throw Error("Unable to export wallet. Agentkit is not configured with a wallet.");
    }

    const address = await this.wallet.getAddresses();
    return JSON.stringify({
      address,
      privateKey: "",
    });
  }
}
