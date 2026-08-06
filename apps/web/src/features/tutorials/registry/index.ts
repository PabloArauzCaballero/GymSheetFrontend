import { TutorialRegistry } from './tutorial-registry';
import { allTutorialDefinitions } from './definitions';

/**
 * The single shared catalogue instance used by the engine and the Tutorial
 * Center. Constructing it validates every definition (throws in development on
 * a blocking configuration error).
 */
export const tutorialRegistry = new TutorialRegistry(allTutorialDefinitions);

export { TutorialRegistry } from './tutorial-registry';
