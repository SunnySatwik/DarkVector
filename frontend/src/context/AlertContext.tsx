import React, { createContext, useState, ReactNode } from "react";
import { Alert } from "../types";
import { MOCK_ALERTS } from "../mockData";

export interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  clearGeneratedAlerts: () => void;
  resetAlerts: () => void;
  seedDemoAlerts: () => void;
}

export const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [seededIds, setSeededIds] = useState<string[]>([]);

  const addAlert = (alert: Alert) => {
    setAlerts((prev) => [alert, ...prev]);
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setSeededIds((prev) => prev.filter((seededId) => seededId !== id));
  };

  const seedDemoAlerts = () => {
    const demo = MOCK_ALERTS.slice(0, 5);
    setAlerts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const toAdd = demo.filter((a) => !existingIds.has(a.id));
      return [...toAdd, ...prev];
    });
    setSeededIds((prev) => {
      const demoIds = demo.map((a) => a.id);
      return Array.from(new Set([...prev, ...demoIds]));
    });
  };

  const resetAlerts = () => {
    setAlerts([]);
    setSeededIds([]);
  };

  const clearGeneratedAlerts = () => {
    const seededSet = new Set(seededIds);
    setAlerts((prev) => prev.filter((a) => seededSet.has(a.id)));
  };

  return (
    <AlertContext.Provider
      value={{
        alerts,
        addAlert,
        removeAlert,
        clearGeneratedAlerts,
        resetAlerts,
        seedDemoAlerts,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}
