import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { PageElement, PageElementPatch, PageItem, SourceDoc } from '../types'
import { getPageCount, getPageSize, invalidatePdfjsDoc } from '../lib/pdfjsCache'

interface StoreState {
  sourceDocs: Record<string, SourceDoc>
  pages: PageItem[]
  currentPageId: string | null
  selectedElementId: string | null
  selectedPageIds: string[]
  loading: boolean
  loadingMessage: string

  addFiles: (files: File[]) => Promise<void>
  removePage: (pageId: string) => void
  duplicatePage: (pageId: string) => void
  rotatePage: (pageId: string) => void
  movePage: (fromIndex: number, toIndex: number) => void
  setCurrentPage: (pageId: string | null) => void
  togglePageSelection: (pageId: string) => void
  clearPageSelection: () => void
  selectElement: (elementId: string | null) => void
  addElement: (pageId: string, element: PageElement) => void
  updateElement: (pageId: string, elementId: string, patch: PageElementPatch) => void
  deleteElement: (pageId: string, elementId: string) => void
  clearAll: () => void
  setLoading: (loading: boolean, message?: string) => void
}

export const useStore = create<StoreState>((set, get) => ({
  sourceDocs: {},
  pages: [],
  currentPageId: null,
  selectedElementId: null,
  selectedPageIds: [],
  loading: false,
  loadingMessage: '',

  setLoading: (loading, message = '') => set({ loading, loadingMessage: message }),

  addFiles: async (files) => {
    set({ loading: true, loadingMessage: 'PDFを読み込み中...' })
    try {
      for (const file of files) {
        const bytes = await file.arrayBuffer()
        const docId = uuid()
        const doc: SourceDoc = { id: docId, name: file.name, bytes }
        const pageCount = await getPageCount(docId, bytes)
        const newPages: PageItem[] = []
        for (let i = 0; i < pageCount; i++) {
          const size = await getPageSize(docId, bytes, i)
          newPages.push({
            id: uuid(),
            sourceDocId: docId,
            sourcePageIndex: i,
            rawWidth: size.rawWidth,
            rawHeight: size.rawHeight,
            sourceRotate: size.sourceRotate,
            rotate: 0,
            elements: [],
          })
        }
        set((s) => ({
          sourceDocs: { ...s.sourceDocs, [docId]: doc },
          pages: [...s.pages, ...newPages],
          currentPageId: s.currentPageId ?? newPages[0]?.id ?? null,
        }))
      }
    } finally {
      set({ loading: false, loadingMessage: '' })
    }
  },

  removePage: (pageId) => {
    const { pages, currentPageId } = get()
    const idx = pages.findIndex((p) => p.id === pageId)
    if (idx === -1) return
    const remaining = pages.filter((p) => p.id !== pageId)
    const usedDocIds = new Set(remaining.map((p) => p.sourceDocId))
    const removedDocId = pages[idx].sourceDocId
    let nextCurrent = currentPageId
    if (currentPageId === pageId) {
      nextCurrent = remaining[Math.min(idx, remaining.length - 1)]?.id ?? null
    }
    set((s) => {
      const sourceDocs = { ...s.sourceDocs }
      if (!usedDocIds.has(removedDocId)) {
        delete sourceDocs[removedDocId]
        invalidatePdfjsDoc(removedDocId)
      }
      return {
        pages: remaining,
        currentPageId: nextCurrent,
        sourceDocs,
        selectedPageIds: s.selectedPageIds.filter((id) => id !== pageId),
      }
    })
  },

  duplicatePage: (pageId) => {
    const { pages } = get()
    const idx = pages.findIndex((p) => p.id === pageId)
    if (idx === -1) return
    const original = pages[idx]
    const clone: PageItem = {
      ...original,
      id: uuid(),
      elements: original.elements.map((el) => ({ ...el, id: uuid() })),
    }
    const next = [...pages]
    next.splice(idx + 1, 0, clone)
    set({ pages: next, currentPageId: clone.id })
  },

  rotatePage: (pageId) => {
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === pageId ? { ...p, rotate: (p.rotate + 90) % 360 } : p,
      ),
    }))
  },

  movePage: (fromIndex, toIndex) => {
    set((s) => {
      const next = [...s.pages]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return { pages: next }
    })
  },

  setCurrentPage: (pageId) => set({ currentPageId: pageId, selectedElementId: null }),

  togglePageSelection: (pageId) => {
    set((s) => ({
      selectedPageIds: s.selectedPageIds.includes(pageId)
        ? s.selectedPageIds.filter((id) => id !== pageId)
        : [...s.selectedPageIds, pageId],
    }))
  },

  clearPageSelection: () => set({ selectedPageIds: [] }),

  selectElement: (elementId) => set({ selectedElementId: elementId }),

  addElement: (pageId, element) => {
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === pageId ? { ...p, elements: [...p.elements, element] } : p,
      ),
      selectedElementId: element.id,
    }))
  },

  updateElement: (pageId, elementId, patch) => {
    set((s) => ({
      pages: s.pages.map((p) => {
        if (p.id !== pageId) return p
        return {
          ...p,
          elements: p.elements.map((el) =>
            el.id === elementId ? ({ ...el, ...patch } as PageElement) : el,
          ),
        }
      }),
    }))
  },

  deleteElement: (pageId, elementId) => {
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === pageId
          ? { ...p, elements: p.elements.filter((el) => el.id !== elementId) }
          : p,
      ),
      selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
    }))
  },

  clearAll: () =>
    set({ sourceDocs: {}, pages: [], currentPageId: null, selectedElementId: null, selectedPageIds: [] }),
}))
