import { AgentkitAction, ActionSchemaAny } from "./agentkit_action";
import { GetBalanceAction } from "./get_balance";
import { SmartTransferAction } from "./smart_transfer";
import { SwapAction } from "./swap";
/**
 * Retrieves all AgentkitAction instances.
 * WARNING: All new AgentkitAction classes must be instantiated here to be discovered.
 *
 * @returns - Array of AgentkitAction instances
 */
export function getAllAgentkitActions(): AgentkitAction<ActionSchemaAny>[] {
  return [new GetBalanceAction(), new SmartTransferAction(), new SwapAction()];
}

export const AGENTKIT_ACTIONS = getAllAgentkitActions();

export { AgentkitAction, ActionSchemaAny, GetBalanceAction, SmartTransferAction, SwapAction };
