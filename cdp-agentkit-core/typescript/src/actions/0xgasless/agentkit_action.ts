import { z } from "zod";
import { PublicClient } from "viem";
import { ZeroXgaslessSmartAccount } from "@0xgasless/smart-account";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type ActionSchemaAny = z.ZodObject<any, any, any, any>;

/**
 * Represents the base structure for CDP Actions.
 */
export interface AgentkitAction<TActionSchema extends ActionSchemaAny> {
  /**
   * The name of the action
   */
  name: string;

  /**
   * A description of what the action does
   */
  description: string;

  /**
   * Schema for validating action arguments
   */
  argsSchema: TActionSchema;

  /**
   * The function to execute for this action
   */
  func:
    | ((wallet: PublicClient, args: z.infer<TActionSchema>) => Promise<string>)
    | ((wallet: ZeroXgaslessSmartAccount, args: z.infer<TActionSchema>) => Promise<string>)
    | ((args: z.infer<TActionSchema>) => Promise<string>);
}
