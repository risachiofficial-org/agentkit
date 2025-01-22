import { AgentkitAction } from "./agentkit_action";
import { PublicClient, publicActions } from "viem";
import { z } from "zod";

const GET_BALANCE_PROMPT = `
This tool will get the balance of all the addresses in the wallet for a token address. 
It takes the token address as input. The token details are fetched from the token contract.
`;

export const GetBalanceInput = z
  .object({
    tokenAddress: z.string().describe("The token address to get the balance for"),
    walletAddress: z.string().describe("The wallet address to get the balance for"),
  })
  .strip()
  .describe("Instructions for getting wallet balance");

/**
 * Gets balance for all addresses in the wallet for a given token address.
 *
 * @param wallet - The wallet to get the balance for.
 * @param args - The input arguments for the action.
 * @returns A message containing the balance information.
 */
export async function getBalance(
  wallet: PublicClient,
  args: z.infer<typeof GetBalanceInput>,
): Promise<string> {
  const publicClient = wallet.extend(publicActions);

  try {
    const isEth =
      !args.tokenAddress ||
      args.tokenAddress.toLowerCase() === "eth" ||
      args.tokenAddress.toLowerCase() === "";
    let decimals = 18; // Default ETH decimals
    let balance: bigint;

    if (!isEth) {
      // Get token decimals from contract
      try {
        decimals = (await publicClient.readContract({
          address: args.tokenAddress as `0x${string}`,
          abi: [
            {
              name: "decimals",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "decimals", type: "uint8" }],
            },
          ],
          functionName: "decimals",
        })) as number;
      } catch (error) {
        return `Error reading token decimals: ${error}`;
      }

      balance = await publicClient.readContract({
        address: args.tokenAddress as `0x${string}`,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "balance", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: [args.walletAddress as `0x${string}`],
      });
    } else {
      balance = await publicClient.getBalance({
        address: args.walletAddress as `0x${string}`,
      });
    }

    const formattedBalance = (Number(balance) / Math.pow(10, decimals)).toString();
    const assetName = isEth ? "ETH" : args.tokenAddress;
    return `Balance for ${args.walletAddress}:\n${formattedBalance} ${assetName}`;
  } catch (error) {
    return `Error getting balance: ${error}`;
  }
}

/**
 * Get wallet balance action.
 */
export class GetBalanceAction implements AgentkitAction<typeof GetBalanceInput> {
  public name = "get_balance";
  public description = GET_BALANCE_PROMPT;
  public argsSchema = GetBalanceInput;
  public func = getBalance;
}
