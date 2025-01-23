import { StructuredTool } from "@langchain/core/tools";
import { Agentkit, AgentkitAction } from "@0xgas/agentkit-core";
import { z } from "zod";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type ActionSchemaAny = z.ZodObject<any, any, any, any>;

/**
 * This tool allows agents to interact with the cdp-sdk library and control an MPC Wallet onchain.
 *
 * To use this tool, you must first set as environment variables:
 *     CDP_API_KEY_NAME
 *     CDP_API_KEY_PRIVATE_KEY
 *     NETWORK_ID
 */
export class AgentkitTool<TActionSchema extends ActionSchemaAny> extends StructuredTool {
  /**
   * Schema definition for the tool's input
   */
  public schema: TActionSchema;

  /**
   * The name of the tool
   */
  public name: string;

  /**
   * The description of the tool
   */
  public description: string;

  /**
   * The Agentkit instance
   */
  private agentkit: Agentkit;

  /**
   * The Agentkit Action
   */
  private action: AgentkitAction<TActionSchema>;

  /**
   * Constructor for the Agentkit Tool class
   *
   * @param action - The Agentkit action to execute
   * @param agentkit - The Agentkit wrapper to use
   */
  constructor(action: AgentkitAction<TActionSchema>, agentkit: Agentkit) {
    super();
    this.action = action;
    this.agentkit = agentkit;
    this.name = action.name;
    this.description = action.description;
    this.schema = action.argsSchema;
  }

  /**
   * Executes the Agentkit action with the provided input
   *
   * @param input - An object containing either instructions or schema-validated arguments
   * @returns A promise that resolves to the result of the Agentkit action
   * @throws {Error} If the Agentkit action fails
   */
  protected async _call(
    input: z.infer<typeof this.schema> & Record<string, unknown>,
  ): Promise<string> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      let args: any;

      // If we have a schema, try to validate against it
      if (this.schema) {
        try {
          const validatedInput = this.schema.parse(input);
          args = validatedInput;
        } catch (error) {
          // If schema validation fails, fall back to instructions-only mode
          args = input;
          console.error(`Error validating input for ${this.name}: ${error}`);
        }
      }
      // No schema, use instructions mode
      else {
        args = input;
      }

      return await this.agentkit.run(this.action, args);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return `Error executing ${this.name}: ${error.message}`;
      }
      return `Error executing ${this.name}: Unknown error occurred`;
    }
  }
}
