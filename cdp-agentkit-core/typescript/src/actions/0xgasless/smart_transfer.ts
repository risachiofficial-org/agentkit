import { AgentkitAction } from "./agentkit_action";
import { ZeroXgaslessSmartAccount } from "@0xgasless/dev-account";
import { z } from "zod";
import { parseEther, parseUnits, encodeFunctionData } from "viem";

const SMART_TRANSFER_PROMPT = `
This tool will transfer an asset from the wallet to another onchain address using gasless transactions.

It takes the following inputs:
- amount: The amount to transfer
- tokenAddress: The token contract address (use 'eth' for native ETH transfers)
- destination: Where to send the funds (must be a valid onchain address)

Important notes:
- Gasless transfers are only available on supported networks
- For ERC20 tokens, ensure you have sufficient balance and allowance
- For native ETH transfers, ensure sufficient balance for the transfer
`;

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * Input schema for smart transfer action.
 */
export const SmartTransferInput = z
  .object({
    amount: z.string().describe("The amount to transfer"),
    tokenAddress: z.string().describe("The token address or 'eth' for native transfers"),
    destination: z.string().describe("The destination address"),
  })
  .strip()
  .describe("Instructions for transferring assets");

/**
 * Transfers assets using gasless transactions.
 *
 * @param wallet - The smart account to transfer from.
 * @param args - The input arguments for the action.
 * @returns A message containing the transfer details.
 */
export async function smartTransfer(
  wallet: ZeroXgaslessSmartAccount,
  args: z.infer<typeof SmartTransferInput>,
): Promise<string> {
  try {
    const isEth = args.tokenAddress.toLowerCase() === "eth";
    let tx: { to: string; data: string; value: bigint };

    if (isEth) {
      // Native ETH transfer
      tx = {
        to: args.destination as `0x${string}`,
        data: "0x",
        value: parseEther(args.amount),
      };
    } else {
      // ERC20 token transfer
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [args.destination as `0x${string}`, parseUnits(args.amount, 18)],
      });

      tx = {
        to: args.tokenAddress as `0x${string}`,
        data,
        value: 0n,
      };
    }

    const request = await wallet.sendTransaction(tx);
    const txResponse = await request.wait();
    const receipt = await txResponse.receipt;

    return `Successfully transferred ${args.amount} ${
      isEth ? "ETH" : `tokens from contract ${args.tokenAddress}`
    } to ${args.destination}.\nTransaction hash: ${receipt.transactionHash}`;
  } catch (error) {
    return `Error transferring the asset: ${error}`;
  }
}

/**
 * Smart transfer action.
 */
export class SmartTransferAction implements AgentkitAction<typeof SmartTransferInput> {
  public name = "smart_transfer";
  public description = SMART_TRANSFER_PROMPT;
  public argsSchema = SmartTransferInput;
  public func = smartTransfer;
  public smartAccountRequired = true;
} 