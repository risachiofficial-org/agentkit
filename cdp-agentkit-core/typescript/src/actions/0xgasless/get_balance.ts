import { AgentkitAction } from "./agentkit_action";
import { WalletClient, publicActions } from "viem";
import { z } from "zod";

const GET_BALANCE_PROMPT = `
This tool will get the balance of all the addresses in the wallet for a given asset. 
It takes the asset ID as input. Always use 'eth' for the native asset ETH and 'usdc' for USDC.
`;

/**
 * Input schema for get balance action.
 */
export const GetBalanceInput = z
  .object({
    assetId: z.string().describe("The asset ID to get the balance for"),
  })
  .strip()
  .describe("Instructions for getting wallet balance");

/**
 * Gets balance for all addresses in the wallet for a given asset.
 *
 * @param wallet - The wallet to get the balance for.
 * @param args - The input arguments for the action.
 * @returns A message containing the balance information.
 */
export async function getBalance(
  wallet: WalletClient,
  args: z.infer<typeof GetBalanceInput>,
): Promise<string> {
  const balances: Record<string, bigint> = {};
  const publicClient = wallet.extend(publicActions);
  
  try {
    const addresses = await wallet.getAddresses();
    
    // Default to ETH if no assetId provided
    const isEth = !args.assetId || args.assetId.toLowerCase() === 'eth';
    let decimals = 18; // Default ETH decimals

    if (!isEth) {
      // Get token decimals from contract
      try {
        decimals = await publicClient.readContract({
          address: args.assetId as `0x${string}`,
          abi: [{
            name: 'decimals',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: 'decimals', type: 'uint8' }]
          }],
          functionName: 'decimals',
        }) as number;
      } catch (error) {
        return `Error reading token decimals: ${error}`;
      }
    }

    for (const address of addresses) {
      if (isEth) {
        const balance = await publicClient.getBalance({ address });
        balances[address] = balance;
      } else {
        const balance = await publicClient.readContract({
          address: args.assetId as `0x${string}`,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }]
          }],
          functionName: 'balanceOf',
          args: [address]
        });
        balances[address] = balance;
      }
    }

    const balanceLines = Object.entries(balances).map(([addr, balance]) => {
      const formattedBalance = (Number(balance) / Math.pow(10, decimals)).toString();
      return `${addr}: ${formattedBalance} ${isEth ? 'ETH' : args.assetId}`;
    });
    
    const assetName = isEth ? 'ETH' : args.assetId;
    const formattedBalances = balanceLines.join("\n");
    return `Balances for ${assetName}:\n${formattedBalances}`;
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
