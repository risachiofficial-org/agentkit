import { PaymasterMode, ZeroXgaslessSmartAccount } from "@0xgasless/dev-account";
import { z } from "zod";
import {
  TokenBytecode,
  DeployerContractABI as DEPLOYER_ABI,
  DeployerContractAddress as DEPLOYER_ADDRESS,
  TokenABI,
} from "./constants";
import { encodeDeployData, encodeFunctionData, keccak256, stringToHex } from "viem";
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
    // Create a unique salt based on token name and symbol
    const salt = keccak256(stringToHex(`${args.name}${args.symbol}${Date.now()}`));

    // Encode constructor parameters with the contract bytecode
    const creationCode = encodeDeployData({
      abi: TokenABI,
      bytecode: TokenBytecode,
      args: [args.name, args.symbol],
    });

    // Encode the deploy function call
    const data = encodeFunctionData({
      abi: DEPLOYER_ABI,
      functionName: "deploy",
      args: [salt, creationCode],
    });

    // Create transaction object
    const tx = {
      to: DEPLOYER_ADDRESS,
      data,
      value: 0n,
    };

    // Send deployment transaction
    const txResponse = await wallet.sendTransaction(tx, {
      paymasterServiceData: {
        mode: PaymasterMode.SPONSORED,
      },
      gasOffset: {
        // Increase gas limits to account for smart wallet overhead
        callGasLimitOffsetPct: 150, // 50% increase
        verificationGasLimitOffsetPct: 150, // 50% increase
        preVerificationGasOffsetPct: 120, // 20% increase
      },
    });

    const result = await txResponse.wait();
    const receipt = result.receipt;
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
