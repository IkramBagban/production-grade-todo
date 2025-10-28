import { nanoid } from 'nanoid'

import type { CreateTodoInput, Todo, UpdateTodoInput } from '../types'

const STORAGE_KEY = 'production-grade-todo::todos'
const LATENCY_MIN = 120
const LATENCY_MAX = 420

let inMemoryStore: Todo[] = []

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const delay = async <T,>(value: T): Promise<T> => {
  const wait = Math.floor(Math.random() * (LATENCY_MAX - LATENCY_MIN + 1)) + LATENCY_MIN
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value), wait)
  })
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const persist = (todos: Todo[]) => {
  inMemoryStore = clone(todos)
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }
}

const readStore = (): Todo[] => {
  if (isBrowser()) {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed: Todo[] = JSON.parse(raw)
        inMemoryStore = parsed
        return clone(parsed)
      } catch (error) {
        console.warn('[todoApi] Failed to parse stored todos', error)
      }
    }
  }
  return clone(inMemoryStore)
}

const ensureSeedData = (todos: Todo[]): Todo[] => {
  if (todos.length > 0) {
    return todos
  }

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + 7)

  const seeded: Todo[] = [
    {
      id: nanoid(),
      title: 'Plan weekly sprint',
      description: 'Collect feature requests, draft priorities, and sync with the team for next week\'s roadmap.',
      completed: false,
      dueDate: tomorrow.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: nanoid(),
      title: 'Refactor authentication module',
      description: 'Simplify provider logic and add integration tests for the refresh token flow.',
      completed: false,
      dueDate: nextWeek.toISOString(),
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      id: nanoid(),
      title: 'Archive stale feature flags',
      description: 'Audit LaunchDarkly dashboard and shut down flags that shipped last quarter.',
      completed: true,
      dueDate: null,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
  ]

  persist(seeded)
  return clone(seeded)
}

const sortByCreatedAtDesc = (todos: Todo[]) =>
  [...todos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

export const todoApi = {
  async list(): Promise<Todo[]> {
    const todos = ensureSeedData(readStore())
    return delay(sortByCreatedAtDesc(todos))
  },

  async get(id: string): Promise<Todo> {
    const todos = ensureSeedData(readStore())
    const match = todos.find((todo) => todo.id === id)
    if (!match) {
      throw new Error('Todo not found')
    }
    return delay(clone(match))
  },

  async create(input: CreateTodoInput): Promise<Todo> {
    const now = new Date().toISOString()
    const todo: Todo = {
      id: nanoid(),
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null,
      completed: input.completed ?? false,
      createdAt: now,
      updatedAt: now,
    }

    const todos = ensureSeedData(readStore())
    const next = sortByCreatedAtDesc([todo, ...todos])
    persist(next)
    return delay(clone(todo))
  },

  async update(id: string, input: UpdateTodoInput): Promise<Todo> {
    const todos = ensureSeedData(readStore())
    const index = todos.findIndex((todo) => todo.id === id)
    if (index === -1) {
      throw new Error('Todo not found')
    }

    const existing = todos[index]
    const updated: Todo = {
      ...existing,
      ...('title' in input && input.title !== undefined ? { title: input.title.trim() } : {}),
      ...('description' in input && input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...('dueDate' in input
        ? { dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null }
        : {}),
      ...('completed' in input && input.completed !== undefined ? { completed: input.completed } : {}),
      updatedAt: new Date().toISOString(),
    }

    const next = [...todos]
    next[index] = updated
    persist(next)
    return delay(clone(updated))
  },

  async toggleCompletion(id: string): Promise<Todo> {
    const todos = ensureSeedData(readStore())
    const index = todos.findIndex((todo) => todo.id === id)
    if (index === -1) {
      throw new Error('Todo not found')
    }

    const existing = todos[index]
    const updated: Todo = {
      ...existing,
      completed: !existing.completed,
      updatedAt: new Date().toISOString(),
    }

    const next = [...todos]
    next[index] = updated
    persist(next)
    return delay(clone(updated))
  },

  async delete(id: string): Promise<void> {
    const todos = ensureSeedData(readStore())
    const index = todos.findIndex((todo) => todo.id === id)
    if (index === -1) {
      throw new Error('Todo not found')
    }
    const next = [...todos]
    next.splice(index, 1)
    persist(next)
    await delay(undefined)
  },
}
