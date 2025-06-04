import { ref } from 'vue'

export interface HistoryItem {
  id: string
  type: string
  status: string
  createdAt: number
  result?: any
}

const STORAGE_KEY = 'firecrawl_history'

export function useHistory(type: string) {
  const list = ref<HistoryItem[]>(load())

  function load(): HistoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value))
  }

  function add(item: HistoryItem) {
    list.value.unshift(item)
    save()
  }

  function update(id: string, data: Partial<HistoryItem>) {
    const idx = list.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      list.value[idx] = { ...list.value[idx], ...data }
      save()
    }
  }

  const filtered = ref<HistoryItem[]>([])

  function refresh() {
    filtered.value = list.value.filter(i => i.type === type)
  }

  refresh()

  return { history: filtered, add, update, refresh }
}
