import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  listHobbies,
  createHobby,
  updateHobby,
  deleteHobby,
  listHobbySessions,
  createHobbySession,
  updateHobbySession,
  deleteHobbySession,
  listHobbyProjects,
  createHobbyProject,
  updateHobbyProject,
  completeHobbyProject,
  deleteHobbyProject,
  listHobbyMilestones,
  createHobbyMilestone,
  updateHobbyMilestone,
  completeHobbyMilestone,
  deleteHobbyMilestone,
  listHobbySupplies,
  createHobbySupply,
  updateHobbySupply,
  deleteHobbySupply,
  getHobbiesSummary
} from "../../services/hobbies";
import { registerInvoke } from "../invoke-handle";
import {
  hobbyCreateSchema,
  hobbyUpdateSchema,
  hobbySessionCreateSchema,
  hobbySessionUpdateSchema,
  hobbyProjectCreateSchema,
  hobbyProjectUpdateSchema,
  hobbyMilestoneCreateSchema,
  hobbyMilestoneUpdateSchema,
  hobbySupplyCreateSchema,
  hobbySupplyUpdateSchema,
  uuidSchema
} from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for hobbies operations (hobbies, sessions, projects, milestones, supplies). */
export function registerHobbiesHandlers(assertSender: AssertSender): void {
  // Hobbies
  registerInvoke(IpcInvoke.hobbiesList, assertSender, () => {
    return listHobbies();
  });
  registerInvoke(IpcInvoke.hobbiesCreate, assertSender, (_event, payload) => {
    return createHobby(hobbyCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.hobbiesUpdate, assertSender, (_event, payload) => {
    const parsed = hobbyUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return updateHobby(id, updates);
  });
  registerInvoke(IpcInvoke.hobbiesDelete, assertSender, (_event, id) => {
    deleteHobby(uuidSchema.parse(id));
  });

  // Hobby sessions
  registerInvoke(IpcInvoke.hobbySessionsList, assertSender, (_event, hobbyId) => {
    if (hobbyId && typeof hobbyId === 'string') {
      return listHobbySessions(hobbyId);
    }
    return listHobbySessions();
  });
  registerInvoke(IpcInvoke.hobbySessionsCreate, assertSender, (_event, payload) => {
    return createHobbySession(hobbySessionCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.hobbySessionsUpdate, assertSender, (_event, payload) => {
    const parsed = hobbySessionUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return updateHobbySession(id, updates);
  });
  registerInvoke(IpcInvoke.hobbySessionsDelete, assertSender, (_event, id) => {
    deleteHobbySession(uuidSchema.parse(id));
  });

  // Hobby projects
  registerInvoke(IpcInvoke.hobbyProjectsList, assertSender, (_event, hobbyId) => {
    if (hobbyId && typeof hobbyId === 'string') {
      return listHobbyProjects(hobbyId);
    }
    return listHobbyProjects();
  });
  registerInvoke(IpcInvoke.hobbyProjectsCreate, assertSender, (_event, payload) => {
    return createHobbyProject(hobbyProjectCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.hobbyProjectsUpdate, assertSender, (_event, payload) => {
    const parsed = hobbyProjectUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return updateHobbyProject(id, updates);
  });
  registerInvoke(IpcInvoke.hobbyProjectsComplete, assertSender, (_event, id) => {
    return completeHobbyProject(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.hobbyProjectsDelete, assertSender, (_event, id) => {
    deleteHobbyProject(uuidSchema.parse(id));
  });

  // Hobby milestones
  registerInvoke(IpcInvoke.hobbyMilestonesList, assertSender, (_event, projectId) => {
    if (projectId && typeof projectId === 'string') {
      return listHobbyMilestones(projectId);
    }
    return listHobbyMilestones();
  });
  registerInvoke(IpcInvoke.hobbyMilestonesCreate, assertSender, (_event, payload) => {
    return createHobbyMilestone(hobbyMilestoneCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.hobbyMilestonesUpdate, assertSender, (_event, payload) => {
    const parsed = hobbyMilestoneUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return updateHobbyMilestone(id, updates);
  });
  registerInvoke(IpcInvoke.hobbyMilestonesComplete, assertSender, (_event, id) => {
    return completeHobbyMilestone(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.hobbyMilestonesDelete, assertSender, (_event, id) => {
    deleteHobbyMilestone(uuidSchema.parse(id));
  });

  // Hobby supplies
  registerInvoke(IpcInvoke.hobbySuppliesList, assertSender, (_event, hobbyId) => {
    if (hobbyId && typeof hobbyId === 'string') {
      return listHobbySupplies(hobbyId);
    }
    return listHobbySupplies();
  });
  registerInvoke(IpcInvoke.hobbySuppliesCreate, assertSender, (_event, payload) => {
    return createHobbySupply(hobbySupplyCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.hobbySuppliesUpdate, assertSender, (_event, payload) => {
    const parsed = hobbySupplyUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return updateHobbySupply(id, updates);
  });
  registerInvoke(IpcInvoke.hobbySuppliesDelete, assertSender, (_event, id) => {
    deleteHobbySupply(uuidSchema.parse(id));
  });

  // Hobbies summary
  registerInvoke(IpcInvoke.hobbiesSummaryGet, assertSender, () => {
    return getHobbiesSummary();
  });
}
