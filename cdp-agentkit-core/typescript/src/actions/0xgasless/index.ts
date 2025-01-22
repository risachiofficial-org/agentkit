import { AgentkitAction, ActionSchemaAny } from "./agentkit_action";
import { GetBalanceAction } from "./get_balance";
import { DeploySmartTokenAction } from "./deploy_token";
/**
 * Retrieves all CDP action instances.
 * WARNING: All new CdpAction classes must be instantiated here to be discovered.
 *
 * @returns - Array of CDP action instances
 */
export function getAllAgentkitActions(): AgentkitAction<ActionSchemaAny>[] {
  return [new GetBalanceAction(), new DeploySmartTokenAction()];
}

export const AGENTKIT_ACTIONS = getAllAgentkitActions();

export { AgentkitAction, ActionSchemaAny, GetBalanceAction, DeploySmartTokenAction };
