import { create } from "zustand"

interface UIStore {
  sidebarCollapsed: boolean
  hypothesisPanelOpen: boolean
  selectedHypothesisId: string | null
  agentTerminalFilter: string | null // hypothesisId filter for terminal

  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  openHypothesisPanel: (id: string) => void
  closeHypothesisPanel: () => void
  setAgentTerminalFilter: (id: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  hypothesisPanelOpen: false,
  selectedHypothesisId: null,
  agentTerminalFilter: null,

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openHypothesisPanel: (id) =>
    set({ hypothesisPanelOpen: true, selectedHypothesisId: id }),
  closeHypothesisPanel: () =>
    set({ hypothesisPanelOpen: false, selectedHypothesisId: null }),
  setAgentTerminalFilter: (id) => set({ agentTerminalFilter: id }),
}))
