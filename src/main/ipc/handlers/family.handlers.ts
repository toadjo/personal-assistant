import type { IpcMainInvokeEvent } from "electron";
import { IpcInvoke } from "../../../shared/ipc-channels";
import {
  listFamilyMembers,
  createFamilyMember,
  _updateFamilyMember,
  _deleteFamilyMember,
  listFamilyOccasions,
  createFamilyOccasion,
  _updateFamilyOccasion,
  _deleteFamilyOccasion,
  listFamilyObligations,
  createFamilyObligation,
  _updateFamilyObligation,
  completeFamilyObligation,
  _deleteFamilyObligation,
  getFamilySummary
} from "../../services/family";
import { registerInvoke } from "../invoke-handle";
import {
  familyMemberCreateSchema,
  familyMemberUpdateSchema,
  familyOccasionCreateSchema,
  familyOccasionUpdateSchema,
  familyObligationCreateSchema,
  familyObligationUpdateSchema,
  uuidSchema
} from "../schemas";

type AssertSender = (event: IpcMainInvokeEvent) => void;

/** Registers IPC handlers for family operations (members, occasions, obligations). */
export function registerFamilyHandlers(assertSender: AssertSender): void {
  // Family members
  registerInvoke(IpcInvoke.familyMembersList, assertSender, () => {
    return listFamilyMembers();
  });
  registerInvoke(IpcInvoke.familyMembersCreate, assertSender, (_event, payload) => {
    return createFamilyMember(familyMemberCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.familyMembersUpdate, assertSender, (_event, payload) => {
    const parsed = familyMemberUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateFamilyMember(id, updates);
  });
  registerInvoke(IpcInvoke.familyMembersDelete, assertSender, (_event, id) => {
    _deleteFamilyMember(uuidSchema.parse(id));
  });

  // Family occasions
  registerInvoke(IpcInvoke.familyOccasionsList, assertSender, (_event, memberId) => {
    return listFamilyOccasions(memberId as string | undefined);
  });
  registerInvoke(IpcInvoke.familyOccasionsCreate, assertSender, (_event, payload) => {
    return createFamilyOccasion(familyOccasionCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.familyOccasionsUpdate, assertSender, (_event, payload) => {
    const parsed = familyOccasionUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateFamilyOccasion(id, updates);
  });
  registerInvoke(IpcInvoke.familyOccasionsDelete, assertSender, (_event, id) => {
    _deleteFamilyOccasion(uuidSchema.parse(id));
  });

  // Family obligations
  registerInvoke(IpcInvoke.familyObligationsList, assertSender, (_event, memberId) => {
    return listFamilyObligations(memberId as string | undefined);
  });
  registerInvoke(IpcInvoke.familyObligationsCreate, assertSender, (_event, payload) => {
    return createFamilyObligation(familyObligationCreateSchema.parse(payload));
  });
  registerInvoke(IpcInvoke.familyObligationsUpdate, assertSender, (_event, payload) => {
    const parsed = familyObligationUpdateSchema.parse(payload);
    const { id, ...updates } = parsed;
    return _updateFamilyObligation(id, updates);
  });
  registerInvoke(IpcInvoke.familyObligationsComplete, assertSender, (_event, id) => {
    return completeFamilyObligation(uuidSchema.parse(id));
  });
  registerInvoke(IpcInvoke.familyObligationsDelete, assertSender, (_event, id) => {
    _deleteFamilyObligation(uuidSchema.parse(id));
  });

  // Family summary
  registerInvoke(IpcInvoke.familySummaryGet, assertSender, () => {
    return getFamilySummary();
  });
}
