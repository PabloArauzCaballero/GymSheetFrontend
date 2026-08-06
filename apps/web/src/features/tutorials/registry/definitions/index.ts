import type { TutorialDefinition } from '../../model/types';
import { adminOperations } from './admin';
import { exerciseLibrary } from './exercises';
import { helpCenterTour, platformIntro } from './intro';
import { membershipOverview } from './membership';
import { mainNavigation } from './navigation';
import { profileBasics } from './profile';
import {
  coachAssignments,
  firstWorkout,
  routinesAndPlans,
  workoutHistory,
} from './training';

/**
 * The registered catalogue. Adding a tutorial means creating a definition file
 * and appending it here — the engine and registry never change. Order defines
 * the default listing order in the Tutorial Center.
 */
export const allTutorialDefinitions: readonly TutorialDefinition[] = [
  platformIntro,
  mainNavigation,
  profileBasics,
  firstWorkout,
  workoutHistory,
  exerciseLibrary,
  routinesAndPlans,
  membershipOverview,
  coachAssignments,
  adminOperations,
  helpCenterTour,
];
