export type Todo = {
  id: string
  title: string
  description: string
  dueDate: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

export type CreateTodoInput = {
  title: string
  description?: string
  dueDate?: string | null
  completed?: boolean
}

export type UpdateTodoInput = {
  title?: string
  description?: string
  dueDate?: string | null
  completed?: boolean
}
