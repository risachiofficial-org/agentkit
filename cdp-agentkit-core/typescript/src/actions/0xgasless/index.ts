import { AgentkitAction, ActionSchemaAny } from "./agentkit_action";
import { getBalance, GetBalanceAction } from "./get_balance";
/**
 * Retrieves all CDP action instances.
 * WARNING: All new CdpAction classes must be instantiated here to be discovered.
 *
 * @returns - Array of CDP action instances
 */
export function getAllAgentkitActions(): AgentkitAction<ActionSchemaAny>[] {
  return [
    new GetBalanceAction(),
  ];
}

export const AGENTKIT_ACTIONS = getAllAgentkitActions();

export {
  AgentkitAction,
  ActionSchemaAny,
  GetBalanceAction,
};