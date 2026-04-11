import { create } from "zustand"
import type { ResearchProgram, Hypothesis } from "@/lib/types"

interface ProgramStore {
  programs: ResearchProgram[]
  activeProgram: ResearchProgram | null
  selectedHypothesis: Hypothesis | null

  setPrograms: (programs: ResearchProgram[]) => void
  setActiveProgram: (program: ResearchProgram | null) => void
  setSelectedHypothesis: (hypothesis: Hypothesis | null) => void
  updateHypothesis: (updated: Hypothesis) => void
}

export const useProgramStore = create<ProgramStore>((set) => ({
  programs: [],
  activeProgram: null,
  selectedHypothesis: null,

  setPrograms: (programs) => set({ programs }),
  setActiveProgram: (program) => set({ activeProgram: program }),
  setSelectedHypothesis: (hypothesis) =>
    set({ selectedHypothesis: hypothesis }),

  updateHypothesis: (updated) =>
    set((state) => ({
      activeProgram: state.activeProgram
        ? {
            ...state.activeProgram,
            hypotheses: (state.activeProgram.hypotheses || []).map((h) =>
              h.id === updated.id ? updated : h
            ),
          }
        : null,
    })),
}))
