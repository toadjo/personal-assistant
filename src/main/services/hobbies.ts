import { getDb } from "../db";
import type {
  Hobby,
  HobbySession,
  HobbyProject,
  HobbyMilestone,
  HobbySupply,
  HobbySummary
} from "../../shared/types";

// Hobbies
export function listHobbies(): Hobby[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM hobbies ORDER BY createdAt DESC")
    .all() as Hobby[];
  return rows;
}

export function createHobby(hobby: Omit<Hobby, "id" | "createdAt" | "updatedAt">): Hobby {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO hobbies (id, name, category, description, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    hobby.name,
    hobby.category,
    hobby.description,
    hobby.status,
    now,
    now
  );
  
  return { ...hobby, id, createdAt: now, updatedAt: now };
}

export function updateHobby(id: string, updates: Partial<Omit<Hobby, "id" | "createdAt" | "updatedAt">>): Hobby | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.category !== undefined) {
    fields.push("category = ?");
    values.push(updates.category);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  
  if (fields.length === 0) {
    return null;
  }
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE hobbies SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  const updated = db.prepare("SELECT * FROM hobbies WHERE id = ?").get(id) as Hobby | undefined;
  return updated || null;
}

export function deleteHobby(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM hobbies WHERE id = ?");
  stmt.run(id);
}

// Hobby sessions
export function listHobbySessions(hobbyId?: string): HobbySession[] {
  const db = getDb();
  let stmt;
  if (hobbyId) {
    stmt = db.prepare("SELECT * FROM hobby_sessions WHERE hobbyId = ? ORDER BY date DESC");
    return stmt.all(hobbyId) as HobbySession[];
  }
  stmt = db.prepare("SELECT * FROM hobby_sessions ORDER BY date DESC");
  return stmt.all() as HobbySession[];
}

export function createHobbySession(session: Omit<HobbySession, "id" | "createdAt" | "updatedAt">): HobbySession {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO hobby_sessions (id, hobbyId, date, durationMinutes, notes, mood, energy, progressRating, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    session.hobbyId,
    session.date,
    session.durationMinutes,
    session.notes,
    session.mood,
    session.energy,
    session.progressRating,
    now,
    now
  );
  
  return { ...session, id, createdAt: now, updatedAt: now };
}

export function updateHobbySession(id: string, updates: Partial<Omit<HobbySession, "id" | "createdAt" | "updatedAt">>): HobbySession | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.hobbyId !== undefined) {
    fields.push("hobbyId = ?");
    values.push(updates.hobbyId);
  }
  if (updates.date !== undefined) {
    fields.push("date = ?");
    values.push(updates.date);
  }
  if (updates.durationMinutes !== undefined) {
    fields.push("durationMinutes = ?");
    values.push(updates.durationMinutes);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }
  if (updates.mood !== undefined) {
    fields.push("mood = ?");
    values.push(updates.mood);
  }
  if (updates.energy !== undefined) {
    fields.push("energy = ?");
    values.push(updates.energy);
  }
  if (updates.progressRating !== undefined) {
    fields.push("progressRating = ?");
    values.push(updates.progressRating);
  }
  
  if (fields.length === 0) {
    return null;
  }
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE hobby_sessions SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  const updated = db.prepare("SELECT * FROM hobby_sessions WHERE id = ?").get(id) as HobbySession | undefined;
  return updated || null;
}

export function deleteHobbySession(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM hobby_sessions WHERE id = ?");
  stmt.run(id);
}

// Hobby projects
export function listHobbyProjects(hobbyId?: string): HobbyProject[] {
  const db = getDb();
  let stmt;
  if (hobbyId) {
    stmt = db.prepare("SELECT * FROM hobby_projects WHERE hobbyId = ? ORDER BY createdAt DESC");
    return stmt.all(hobbyId) as HobbyProject[];
  }
  stmt = db.prepare("SELECT * FROM hobby_projects ORDER BY createdAt DESC");
  return stmt.all() as HobbyProject[];
}

export function createHobbyProject(project: Omit<HobbyProject, "id" | "createdAt" | "updatedAt">): HobbyProject {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO hobby_projects (id, hobbyId, name, description, status, targetDate, completedAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    project.hobbyId,
    project.name,
    project.description,
    project.status,
    project.targetDate,
    project.completedAt,
    now,
    now
  );
  
  return { ...project, id, createdAt: now, updatedAt: now };
}

export function updateHobbyProject(id: string, updates: Partial<Omit<HobbyProject, "id" | "createdAt" | "updatedAt">>): HobbyProject | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.hobbyId !== undefined) {
    fields.push("hobbyId = ?");
    values.push(updates.hobbyId);
  }
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.targetDate !== undefined) {
    fields.push("targetDate = ?");
    values.push(updates.targetDate);
  }
  if (updates.completedAt !== undefined) {
    fields.push("completedAt = ?");
    values.push(updates.completedAt);
  }
  
  if (fields.length === 0) {
    return null;
  }
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE hobby_projects SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  const updated = db.prepare("SELECT * FROM hobby_projects WHERE id = ?").get(id) as HobbyProject | undefined;
  return updated || null;
}

export function completeHobbyProject(id: string): HobbyProject | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    UPDATE hobby_projects 
    SET status = 'completed', completedAt = ?, updatedAt = ? 
    WHERE id = ?
  `);
  stmt.run(now, now, id);
  
  const updated = db.prepare("SELECT * FROM hobby_projects WHERE id = ?").get(id) as HobbyProject | undefined;
  return updated || null;
}

export function deleteHobbyProject(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM hobby_projects WHERE id = ?");
  stmt.run(id);
}

// Hobby milestones
export function listHobbyMilestones(projectId?: string): HobbyMilestone[] {
  const db = getDb();
  let stmt;
  if (projectId) {
    stmt = db.prepare("SELECT * FROM hobby_milestones WHERE projectId = ? ORDER BY targetDate ASC");
    return stmt.all(projectId) as HobbyMilestone[];
  }
  stmt = db.prepare("SELECT * FROM hobby_milestones ORDER BY targetDate ASC");
  return stmt.all() as HobbyMilestone[];
}

export function createHobbyMilestone(milestone: Omit<HobbyMilestone, "id" | "createdAt" | "updatedAt">): HobbyMilestone {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO hobby_milestones (id, projectId, name, description, targetDate, completedAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    milestone.projectId,
    milestone.name,
    milestone.description,
    milestone.targetDate,
    milestone.completedAt,
    now,
    now
  );
  
  return { ...milestone, id, createdAt: now, updatedAt: now };
}

export function updateHobbyMilestone(id: string, updates: Partial<Omit<HobbyMilestone, "id" | "createdAt" | "updatedAt">>): HobbyMilestone | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.projectId !== undefined) {
    fields.push("projectId = ?");
    values.push(updates.projectId);
  }
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.targetDate !== undefined) {
    fields.push("targetDate = ?");
    values.push(updates.targetDate);
  }
  if (updates.completedAt !== undefined) {
    fields.push("completedAt = ?");
    values.push(updates.completedAt);
  }
  
  if (fields.length === 0) {
    return null;
  }
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE hobby_milestones SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  const updated = db.prepare("SELECT * FROM hobby_milestones WHERE id = ?").get(id) as HobbyMilestone | undefined;
  return updated || null;
}

export function completeHobbyMilestone(id: string): HobbyMilestone | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    UPDATE hobby_milestones 
    SET completedAt = ?, updatedAt = ? 
    WHERE id = ?
  `);
  stmt.run(now, now, id);
  
  const updated = db.prepare("SELECT * FROM hobby_milestones WHERE id = ?").get(id) as HobbyMilestone | undefined;
  return updated || null;
}

export function deleteHobbyMilestone(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM hobby_milestones WHERE id = ?");
  stmt.run(id);
}

// Hobby supplies
export function listHobbySupplies(hobbyId?: string): HobbySupply[] {
  const db = getDb();
  let stmt;
  if (hobbyId) {
    stmt = db.prepare("SELECT * FROM hobby_supplies WHERE hobbyId = ? ORDER BY createdAt DESC");
    return stmt.all(hobbyId) as HobbySupply[];
  }
  stmt = db.prepare("SELECT * FROM hobby_supplies ORDER BY createdAt DESC");
  return stmt.all() as HobbySupply[];
}

export function createHobbySupply(supply: Omit<HobbySupply, "id" | "createdAt" | "updatedAt">): HobbySupply {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO hobby_supplies (id, hobbyId, projectId, name, type, cost, purchaseDate, source, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    supply.hobbyId,
    supply.projectId,
    supply.name,
    supply.type,
    supply.cost,
    supply.purchaseDate,
    supply.source,
    supply.notes,
    now,
    now
  );
  
  return { ...supply, id, createdAt: now, updatedAt: now };
}

export function updateHobbySupply(id: string, updates: Partial<Omit<HobbySupply, "id" | "createdAt" | "updatedAt">>): HobbySupply | null {
  const db = getDb();
  const now = new Date().toISOString();
  
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.hobbyId !== undefined) {
    fields.push("hobbyId = ?");
    values.push(updates.hobbyId);
  }
  if (updates.projectId !== undefined) {
    fields.push("projectId = ?");
    values.push(updates.projectId);
  }
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    fields.push("type = ?");
    values.push(updates.type);
  }
  if (updates.cost !== undefined) {
    fields.push("cost = ?");
    values.push(updates.cost);
  }
  if (updates.purchaseDate !== undefined) {
    fields.push("purchaseDate = ?");
    values.push(updates.purchaseDate);
  }
  if (updates.source !== undefined) {
    fields.push("source = ?");
    values.push(updates.source);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }
  
  if (fields.length === 0) {
    return null;
  }
  
  fields.push("updatedAt = ?");
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`UPDATE hobby_supplies SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
  
  const updated = db.prepare("SELECT * FROM hobby_supplies WHERE id = ?").get(id) as HobbySupply | undefined;
  return updated || null;
}

export function deleteHobbySupply(id: string): void {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM hobby_supplies WHERE id = ?");
  stmt.run(id);
}

// Hobbies summary
export function getHobbiesSummary(): HobbySummary {
  const db = getDb();
  
  const activeHobbies = db.prepare("SELECT COUNT(*) as count FROM hobbies WHERE status = 'active'").get() as { count: number };
  const sessionsThisMonth = db.prepare(`
    SELECT COUNT(*) as count 
    FROM hobby_sessions 
    WHERE date >= date('now', 'start of month')
  `).get() as { count: number };
  const openProjects = db.prepare("SELECT COUNT(*) as count FROM hobby_projects WHERE status = 'active'").get() as { count: number };
  const openMilestones = db.prepare("SELECT COUNT(*) as count FROM hobby_milestones WHERE completedAt IS NULL").get() as { count: number };
  const recentSessions = db.prepare(`
    SELECT COUNT(*) as count 
    FROM hobby_sessions 
    WHERE date >= date('now', '-7 days')
  `).get() as { count: number };
  
  return {
    activeHobbies: activeHobbies.count,
    sessionsThisMonth: sessionsThisMonth.count,
    openProjects: openProjects.count,
    openMilestones: openMilestones.count,
    recentSessions: recentSessions.count
  };
}
