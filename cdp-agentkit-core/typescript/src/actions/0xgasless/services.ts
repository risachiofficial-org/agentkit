import { ZeroXgaslessSmartAccount, Transaction, PaymasterMode } from "@0xgasless/dev-account";
import { TokenABI } from "./ERC20/constants";

export async function sendTransaction(wallet: ZeroXgaslessSmartAccount, tx: Transaction) {
  const request = await wallet.sendTransaction(tx, {
    paymasterServiceData: {
      mode: PaymasterMode.SPONSORED,
    },
  });
  const txResponse = await request.wait();
  const receipt = await txResponse.receipt;
  return receipt;
}

export async function getDecimals(wallet: ZeroXgaslessSmartAccount, tokenAddress: string) {
  const decimals = await wallet.rpcProvider.readContract({
    abi: TokenABI,
    address: tokenAddress as `0x${string}`,
    functionName: "decimals",
  });
  return decimals;
}
