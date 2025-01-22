import { ZeroXgaslessSmartAccount } from "@0xgasless/smart-account";
import { z } from "zod";
import { bytecode, abi } from "./constants";
import { encodeDeployData } from "viem";
import { AgentkitAction } from "../agentkit_action";

const DEPLOY_TOKEN_PROMPT = `
This tool will deploy an ERC20 token smart contract. It takes the token name and symbol as input. 
The token will be deployed using the wallet's default address as the owner and initial token holder.
`;

/**
 * Input schema for deploy token action.
 */
export const DeploySmartTokenInput = z
  .object({
    name: z.string().describe("The name of the token"),
    symbol: z.string().describe("The token symbol"),
  })
  .strip()
  .describe("Instructions for deploying a token");

/**
 * Deploys an ERC20 token smart contract.
 *
 * @param wallet - The wallet to deploy the Token from.
 * @param args - The input arguments for the action.
 * @returns A message containing the deployed token contract address and details.
 */
export async function deploySmartToken(
  wallet: ZeroXgaslessSmartAccount,
  args: z.infer<typeof DeploySmartTokenInput>,
): Promise<string> {
  try {
    // Encode constructor parameters with the contract bytecode
    const deployData = encodeDeployData({
      abi,
      bytecode,
      args: [args.name, args.symbol],
    });

    // Create transaction object
    const tx = {
      to: "0x", // Empty address for contract deployment
      data: deployData,
      value: 0n, // No ETH value being sent
    };

    // Send deployment transaction
    const txResponse = await wallet.sendTransaction(tx);
    const result = await txResponse.wait();
    if (!result.success) {
      return `Error deploying token: ${result.reason}`;
    }
    const receipt = result.receipt;
    console.log(receipt);
    const hash = receipt.transactionHash;
    if (!hash) {
      return `Error deploying token: No transaction hash found`;
    }
    return `Deployed ERC20 token contract ${args.name} (${args.symbol}). Transaction hash: ${hash}`;
  } catch (error) {
    return `Error deploying token: ${error}`;
  }
}

/**
 * Deploy token action.
 */
export class DeploySmartTokenAction implements AgentkitAction<typeof DeploySmartTokenInput> {
  public name = "deploy_token";
  public description = DEPLOY_TOKEN_PROMPT;
  public argsSchema = DeploySmartTokenInput;
  public smartAccountRequired = true;
  public func = deploySmartToken;
}
