import { getDb } from "../db";
import type {
  FamilyMember,
  FamilyOccasion,
  FamilyObligation,
  FamilySummary
} from "../../shared/types";

// Family members
export function listFamilyMembers(): FamilyMember[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM family_members ORDER BY createdAt DESC")
    .all() as FamilyMember[];
  return rows;
}

export function createFamilyMember(member: Omit<FamilyMember, "id" | "createdAt" | "updatedAt">): FamilyMember {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO family_members (id, name, relationship, phone, email, address, preferredContactMethod, notes, isImportant, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    member.name,
    member.relationship,
    member.phone,
    member.email,
    member.address,
    member.preferredContactMethod,
    member.notes,
    member.isImportant,
    now,
    now
  );
  
  return { ...member, id, createdAt: now, updatedAt: now };
}

export function _updateFamilyMember(id: string, updates: Partial<Omit<FamilyMember, "id" | "createdAt" | "updatedAt">>): FamilyMember | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) { fields.push("name = ?"); values.push(updates.name); }
  if (updates.relationship !== undefined) { fields.push("relationship = ?"); values.push(updates.relationship); }
  if (updates.phone !== undefined) { fields.push("phone = ?"); values.push(updates.phone); }
  if (updates.email !== undefined) { fields.push("email = ?"); values.push(updates.email); }
  if (updates.address !== undefined) { fields.push("address = ?"); values.push(updates.address); }
  if (updates.preferredContactMethod !== undefined) { fields.push("preferredContactMethod = ?"); values.push(updates.preferredContactMethod); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  if (updates.isImportant !== undefined) { fields.push("isImportant = ?"); values.push(updates.isImportant); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE family_members SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getFamilyMemberById(id);
}

export function _deleteFamilyMember(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM family_members WHERE id = ?").run(id);
}

export function getFamilyMemberById(id: string): FamilyMember | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM family_members WHERE id = ?").get(id) as FamilyMember | undefined;
  return row || null;
}

// Family occasions
export function listFamilyOccasions(memberId?: string): FamilyOccasion[] {
  const db = getDb();
  let stmt;
  if (memberId) {
    stmt = db.prepare("SELECT * FROM family_occasions WHERE memberId = ? ORDER BY date ASC");
    return stmt.all(memberId) as FamilyOccasion[];
  }
  stmt = db.prepare("SELECT * FROM family_occasions ORDER BY date ASC");
  return stmt.all() as FamilyOccasion[];
}

export function createFamilyOccasion(occasion: Omit<FamilyOccasion, "id" | "createdAt" | "updatedAt">): FamilyOccasion {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO family_occasions (id, memberId, type, title, date, recurrence, remindDaysBefore, lastAcknowledgedAt, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    occasion.memberId,
    occasion.type,
    occasion.title,
    occasion.date,
    occasion.recurrence,
    occasion.remindDaysBefore,
    occasion.lastAcknowledgedAt,
    occasion.notes,
    now,
    now
  );
  
  return { ...occasion, id, createdAt: now, updatedAt: now };
}

export function _updateFamilyOccasion(id: string, updates: Partial<Omit<FamilyOccasion, "id" | "createdAt" | "updatedAt">>): FamilyOccasion | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.memberId !== undefined) { fields.push("memberId = ?"); values.push(updates.memberId); }
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
  if (updates.date !== undefined) { fields.push("date = ?"); values.push(updates.date); }
  if (updates.recurrence !== undefined) { fields.push("recurrence = ?"); values.push(updates.recurrence); }
  if (updates.remindDaysBefore !== undefined) { fields.push("remindDaysBefore = ?"); values.push(updates.remindDaysBefore); }
  if (updates.lastAcknowledgedAt !== undefined) { fields.push("lastAcknowledgedAt = ?"); values.push(updates.lastAcknowledgedAt); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE family_occasions SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getFamilyOccasionById(id);
}

export function _deleteFamilyOccasion(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM family_occasions WHERE id = ?").run(id);
}

export function getFamilyOccasionById(id: string): FamilyOccasion | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM family_occasions WHERE id = ?").get(id) as FamilyOccasion | undefined;
  return row || null;
}

// Family obligations
export function listFamilyObligations(memberId?: string): FamilyObligation[] {
  const db = getDb();
  let stmt;
  if (memberId) {
    stmt = db.prepare(`
      SELECT * FROM family_obligations 
      WHERE memberId = ? 
      ORDER BY 
        CASE WHEN status = 'open' AND dueAt IS NOT NULL AND dueAt < datetime('now') THEN 0 ELSE 1 END,
        CASE WHEN status = 'open' AND dueAt IS NOT NULL THEN dueAt ELSE 999999999999999 END ASC,
        createdAt DESC
    `);
    return stmt.all(memberId) as FamilyObligation[];
  }
  stmt = db.prepare(`
    SELECT * FROM family_obligations 
    ORDER BY 
      CASE WHEN status = 'open' AND dueAt IS NOT NULL AND dueAt < datetime('now') THEN 0 ELSE 1 END,
      CASE WHEN status = 'open' AND dueAt IS NOT NULL THEN dueAt ELSE 999999999999999 END ASC,
      createdAt DESC
  `);
  return stmt.all() as FamilyObligation[];
}

export function createFamilyObligation(obligation: Omit<FamilyObligation, "id" | "createdAt" | "updatedAt">): FamilyObligation {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO family_obligations (id, memberId, occasionId, type, title, dueAt, status, priority, completedAt, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    obligation.memberId,
    obligation.occasionId,
    obligation.type,
    obligation.title,
    obligation.dueAt,
    obligation.status,
    obligation.priority,
    obligation.completedAt,
    obligation.notes,
    now,
    now
  );
  
  return { ...obligation, id, createdAt: now, updatedAt: now };
}

export function _updateFamilyObligation(id: string, updates: Partial<Omit<FamilyObligation, "id" | "createdAt" | "updatedAt">>): FamilyObligation | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.memberId !== undefined) { fields.push("memberId = ?"); values.push(updates.memberId); }
  if (updates.occasionId !== undefined) { fields.push("occasionId = ?"); values.push(updates.occasionId); }
  if (updates.type !== undefined) { fields.push("type = ?"); values.push(updates.type); }
  if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title); }
  if (updates.dueAt !== undefined) { fields.push("dueAt = ?"); values.push(updates.dueAt); }
  if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.priority !== undefined) { fields.push("priority = ?"); values.push(updates.priority); }
  if (updates.completedAt !== undefined) { fields.push("completedAt = ?"); values.push(updates.completedAt); }
  if (updates.notes !== undefined) { fields.push("notes = ?"); values.push(updates.notes); }
  
  if (fields.length === 0) return null;
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE family_obligations SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  return getFamilyObligationById(id);
}

export function completeFamilyObligation(id: string): FamilyObligation | null {
  const now = new Date().toISOString();
  return _updateFamilyObligation(id, { status: "done", completedAt: now });
}

export function _deleteFamilyObligation(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM family_obligations WHERE id = ?").run(id);
}

export function getFamilyObligationById(id: string): FamilyObligation | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM family_obligations WHERE id = ?").get(id) as FamilyObligation | undefined;
  return row || null;
}

// Family summary
export function getFamilySummary(): FamilySummary {
  const db = getDb();
  
  const totalMembers = db.prepare("SELECT COUNT(*) as count FROM family_members").get() as { count: number };
  const importantMembers = db.prepare("SELECT COUNT(*) as count FROM family_members WHERE isImportant = 1").get() as { count: number };
  const openObligations = db.prepare("SELECT COUNT(*) as count FROM family_obligations WHERE status = 'open'").get() as { count: number };
  const overdueObligations = db.prepare(`
    SELECT COUNT(*) as count FROM family_obligations 
    WHERE status = 'open' AND dueAt IS NOT NULL AND dueAt < datetime('now')
  `).get() as { count: number };
  
  // Count upcoming occasions within next 30 days (compare by month/day for yearly recurrence)
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);
  
  const occasions = db.prepare("SELECT * FROM family_occasions WHERE recurrence = 'yearly'").all() as FamilyOccasion[];
  let upcomingCount = 0;
  
  for (const occasion of occasions) {
    const occasionDate = new Date(occasion.date);
    const occasionMonth = occasionDate.getMonth();
    const occasionDay = occasionDate.getDate();
    
    // Check if this month/day falls within the next 30 days
    for (let i = 0; i <= 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() + i);
      if (checkDate.getMonth() === occasionMonth && checkDate.getDate() === occasionDay) {
        upcomingCount++;
        break;
      }
    }
  }
  
  return {
    totalMembers: totalMembers.count,
    importantMembers: importantMembers.count,
    upcomingOccasions: upcomingCount,
    openObligations: openObligations.count,
    overdueObligations: overdueObligations.count
  };
}
