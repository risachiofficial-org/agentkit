import { AgentkitAction, ActionSchemaAny } from "./agentkit_action";
import { GetBalanceAction } from "./get_balance";
// import { DeploySmartTokenAction } from "./ERC20";
import { SmartTransferAction } from "./smart_transfer";
/**
 * Retrieves all CDP action instances.
 * WARNING: All new CdpAction classes must be instantiated here to be discovered.
 *
 * @returns - Array of CDP action instances
 */
export function getAllAgentkitActions(): AgentkitAction<ActionSchemaAny>[] {
  return [new GetBalanceAction(), new SmartTransferAction()];
}

export const AGENTKIT_ACTIONS = getAllAgentkitActions();

export { AgentkitAction, ActionSchemaAny, GetBalanceAction, SmartTransferAction };
