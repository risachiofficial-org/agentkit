import { AgentkitAction } from "./agentkit_action";
import { ZeroXgaslessSmartAccount } from "@0xgasless/dev-account";
import { z } from "zod";
import { parseUnits, encodeFunctionData } from "viem";
import { TokenABI } from "./ERC20/constants";
import { sendTransaction, getDecimals } from "~/utils/services";
import axios from "axios";

const SWAP_PROMPT = `
This tool will swap tokens using KyberSwap's aggregator.

It takes the following inputs:
- fromTokenAddress: The address of the token to swap from (use 'eth' for native ETH)
- toTokenAddress: The address of the token to swap to
- amount: The amount to swap in human readable format
- slippageTolerance: Maximum acceptable slippage in basis points (e.g., 100 = 1%)

Important notes:
- Swaps are only available on supported networks: Avalanche C-Chain, Metis chain, BASE, BNB chain, FANTOM, Moonbeam
- When swapping native ETH, ensure sufficient balance for the swap AND gas costs
- Slippage tolerance defaults to 1% if not specified
`;

/**
 * Input schema for swap action.
 */
export const SwapInput = z
  .object({
    fromTokenAddress: z.string().describe("The address of the token to swap from"),
    toTokenAddress: z.string().describe("The address of the token to swap to"),
    amount: z.string().describe("The amount to swap"),
    slippageTolerance: z.number().default(100).describe("Maximum acceptable slippage in basis points"),
  })
  .strip()
  .describe("Instructions for swapping tokens");

/**
 * Swaps tokens using KyberSwap.
 *
 * @param wallet - The smart account to swap from.
 * @param args - The input arguments for the action.
 * @returns A message containing the swap details.
 */
export async function swap(
  wallet: ZeroXgaslessSmartAccount,
  args: z.infer<typeof SwapInput>,
): Promise<string> {
  try {
    const walletAddress = await wallet.getAddress();
    const chainId = await wallet.rpcProvider.getChainId();
    
    // Determine if fromToken is native ETH
    const isFromEth = args.fromTokenAddress.toLowerCase() === "eth";
    
    // Get token decimals
    const fromDecimals = isFromEth ? 18 : await getDecimals(wallet, args.fromTokenAddress);
    const amountIn = parseUnits(args.amount, Number(fromDecimals));

    // 1. Get Route Data
    const routeURL = `https://aggregator-api.kyberswap.com/${chainId}/api/v1/routes`;
    const routeResponse = await axios.get(routeURL, {
      params: {
        tokenIn: isFromEth ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : args.fromTokenAddress,
        tokenOut: args.toTokenAddress,
        amountIn: amountIn.toString()
      }
    });
    const routeSummary = routeResponse.data.data.routeSummary;

    // 2. Build Swap Data
    const buildURL = `https://aggregator-api.kyberswap.com/${chainId}/api/v1/route/build`;
    const buildResponse = await axios.post(buildURL, {
      routeSummary: routeSummary,
      sender: walletAddress,
      recipient: walletAddress,
      slippageTolerance: args.slippageTolerance
    });
    const swapData = buildResponse.data.data;

    // 3. Handle Token Approval if needed
    if (!isFromEth) {
      const tokenContract = {
        address: args.fromTokenAddress as `0x${string}`,
        abi: TokenABI,
      };

      const currentAllowance = await wallet.rpcProvider.readContract({
        ...tokenContract,
        functionName: "allowance",
        args: [walletAddress as `0x${string}`, swapData.routerAddress as `0x${string}`],
      }) as bigint;

      if (currentAllowance < BigInt(swapData.amountIn)) {
        const approveData = encodeFunctionData({
          abi: TokenABI,
          functionName: "approve",
          args: [swapData.routerAddress as `0x${string}`, BigInt(swapData.amountIn)],
        });

        await sendTransaction(wallet, {
          to: args.fromTokenAddress as `0x${string}`,
          data: approveData,
          value: 0n,
        });
      }
    }

    // 4. Execute Swap
    const receipt = await sendTransaction(wallet, {
      to: swapData.routerAddress as `0x${string}`,
      data: swapData.data as `0x${string}`,
      value: isFromEth ? BigInt(swapData.amountIn) : 0n,
    });

    return `Successfully swapped ${args.amount} ${isFromEth ? "ETH" : `tokens from ${args.fromTokenAddress}`} 
            to ${args.toTokenAddress}.\nTransaction hash: ${receipt.transactionHash}`;
  } catch (error) {
    return `Error swapping tokens: ${error}`;
  }
}

/**
 * Swap action.
 */
export class SwapAction implements AgentkitAction<typeof SwapInput> {
  public name = "swap";
  public description = SWAP_PROMPT;
  public argsSchema = SwapInput;
  public func = swap;
  public smartAccountRequired = true;
}