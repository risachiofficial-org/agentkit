import { z } from "zod";
import * as viem from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { ZeroXgaslessSmartAccount, createSmartAccountClient } from "@0xgasless/smart-account";
import { AgentkitAction, ActionSchemaAny } from "./actions/0xgasless/agentkit_action";
import { avalanche, base, metis, moonbeam, fantom, bsc, Chain } from "viem/chains";

/**
 * Configuration options for the Agentkit
 */
export interface PublicAgentOptions {
  chainID: number;
  rpcUrl?: string;
}

/**
 * Configuration options for the Agentkit with a Smart Account
 */
export interface SmartAgentOptions extends PublicAgentOptions {
  mnemonicPhrase?: string;
  accountPath?: number;
  privateKey?: `0x${string}`;
  apiKey: string;
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
  private publicClient: viem.PublicClient;
  private smartAccount?: ZeroXgaslessSmartAccount;

  /**
   * Initializes a new Agentkit instance with a public client
   *
   * @param config - Configuration options for the Agentkit
   */
  public constructor(config: PublicAgentOptions) {
    if (!Chains[config.chainID]) {
      throw new Error(`Chain ID ${config.chainID} is not supported`);
    }

    // Configure public client
    this.publicClient = viem.createPublicClient({
      chain: Chains[config.chainID],
      transport: config.rpcUrl ? viem.http(config.rpcUrl) : viem.http(),
    });
  }

  /**
   * Configures Agentkit with a Smart Account for gasless transactions
   *
   * @param config - Smart agent configuration parameters
   * @returns A Promise that resolves to a new Agentkit instance
   * @throws Error if required parameters are missing or initialization fails
   */
  public static async configureWithWallet(
    config: SmartAgentOptions,
  ): Promise<Agentkit> {
    if (!config.apiKey || config.apiKey === "") {
      throw new Error("API_KEY is required for smart agent configuration");
    }

    const agentkit = new Agentkit(config);

    try {
      let account: viem.Account;
      
      if (config.privateKey) {
        account = privateKeyToAccount(config.privateKey);
      } else if (config.mnemonicPhrase) {
        account = mnemonicToAccount(config.mnemonicPhrase, { accountIndex: config.accountPath || 0 });
      } else {
        throw new Error("Either privateKey or mnemonicPhrase must be provided");
      }

      // Create wallet client
      const wallet = viem.createWalletClient({
        account,
        chain: Chains[config.chainID],
        transport: config.rpcUrl ? viem.http(config.rpcUrl) : viem.http(),
      });

      // Configure smart account
      const bundlerUrl = `https://bundler.0xgasless.com/${config.chainID}`;
      const paymasterUrl = `https://paymaster.0xgasless.com/v1/${config.chainID}/rpc/${config.apiKey}`;
      
      agentkit.smartAccount = await createSmartAccountClient({
        bundlerUrl,
        paymasterUrl,
        chainId: config.chainID,
        signer: wallet,
      });

    } catch (error) {
      throw new Error(`Failed to initialize smart account: ${error}`);
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
    // Check function parameter count to determine execution path
    const paramCount = action.func.length;

    // For functions that only take args (no client/wallet)
    if (paramCount === 1) {
      return await (action.func as (args: TActionSchema) => Promise<string>)(args);
    }

    // For functions that require smart account
    if (paramCount > 1 && action.smartAccountRequired) {
      if (!this.smartAccount) {
        return `Unable to run Action: ${action.name}. A Smart Account is required. Please configure Agentkit with a Wallet to run this action.`;
      }
      return await (action.func as (account: ZeroXgaslessSmartAccount, args: TActionSchema) => Promise<string>)(
        this.smartAccount,
        args
      );
    }

    return await (action.func as (client: viem.PublicClient, args: TActionSchema) => Promise<string>)(
      this.publicClient,
      args
    );
  }

  /**
   * Gets the smart account address if configured
   * 
   * @returns The smart account address
   * @throws Error if smart account is not configured
   */
  async getAddress(): Promise<string> {
    if (!this.smartAccount) {
      throw new Error("Smart account not configured");
    }
    return await this.smartAccount.getAddress();
  }
}
