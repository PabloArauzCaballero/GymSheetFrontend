import { apiClient } from "@/api/client";
import { z } from "zod";
import {
  createTrainingInviteInputSchema,
  listedTrainingInvitationSchema,
  respondTrainingInviteInputSchema,
  respondedTrainingInvitationSchema,
  sharedSessionSnapshotSchema,
  trainingInvitationSchema,
  type CreateTrainingInviteInput,
  type RespondTrainingInviteInput,
} from "./training-invitations-contract";

export * from "./training-invitations-contract";

export const trainingInvitationsService = {
  list() {
    return apiClient.request(
      "/me/training-invitations",
      z.array(listedTrainingInvitationSchema),
      {
        method: "GET",
      },
    );
  },
  create(input: CreateTrainingInviteInput) {
    const parsed = createTrainingInviteInputSchema.parse(input);
    return apiClient.request(
      "/me/training-invitations",
      trainingInvitationSchema,
      {
        method: "POST",
        body: parsed,
      },
    );
  },
  respond(id: string, input: RespondTrainingInviteInput) {
    const parsedId = z.string().uuid().parse(id);
    const parsedInput = respondTrainingInviteInputSchema.parse(input);
    return apiClient.request(
      `/me/training-invitations/${parsedId}/respond`,
      respondedTrainingInvitationSchema,
      {
        method: "POST",
        body: parsedInput,
      },
    );
  },
  sharedSession(id: string) {
    const parsedId = z.string().uuid().parse(id);
    return apiClient.request(
      `/me/training-invitations/${parsedId}/shared-session`,
      sharedSessionSnapshotSchema,
      {
        method: "GET",
      },
    );
  },
};
