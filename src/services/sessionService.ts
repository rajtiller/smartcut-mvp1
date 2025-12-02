import type { Session } from "../types";

const STORAGE_KEY = "smartcut_sessions";

export const getSessions = (): Session[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSession = (session: Session) => {
  const sessions = getSessions();
  // Check if session exists to update or add new
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session); // Add to top
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const getSessionById = (id: string): Session | undefined => {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id);
};

