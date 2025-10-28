import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Edit2,
  Filter,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

import { todoApi } from '../api/todoApi'
import type { CreateTodoInput, Todo, UpdateTodoInput } from '../types'
import { formatDueDateLabel, isDueSoon, isOverdue } from '../../../utils/date'
import { TodoFormModal } from './TodoFormModal'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { useToast } from '../../../components/toast/ToastProvider'

const SORT_OPTIONS = [
  { value: 'created-desc', label: 'Newest first' },
  { value: 'created-asc', label: 'Oldest first' },
  { value: 'due-asc', label: 'Due soon' },
  { value: 'due-desc', label: 'Due latest' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
] as const

type SortOption = (typeof SORT_OPTIONS)[number]['value']

type StatusFilter = 'all' | 'active' | 'completed'
type DueFilter = 'all' | 'soon' | 'overdue'

type FilterState = {
  status: StatusFilter
  sort: SortOption
  search: string
  due: DueFilter
}

type ToggleContext = {
  previous?: Todo[]
}

const queryKey = ['todos']

const applySort = (todos: Todo[], sort: SortOption) => {
  const safeTodos = [...todos]

  switch (sort) {
    case 'created-asc':
      return safeTodos.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    case 'due-asc':
      return safeTodos.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    case 'due-desc':
      return safeTodos.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      })
    case 'title-asc':
      return safeTodos.sort((a, b) => a.title.localeCompare(b.title))
    case 'title-desc':
      return safeTodos.sort((a, b) => b.title.localeCompare(a.title))
    case 'created-desc':
    default:
      return safeTodos.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }
}

const filterTodos = (todos: Todo[], filters: FilterState) => {
  const searchTerm = filters.search.trim().toLowerCase()

  const filtered = todos.filter((todo) => {
    if (filters.status === 'active' && todo.completed) return false
    if (filters.status === 'completed' && !todo.completed) return false

    if (filters.due === 'soon' && !isDueSoon(todo.dueDate)) return false
    if (filters.due === 'overdue' && !isOverdue(todo.dueDate)) return false

    if (!searchTerm) return true
    return (
      todo.title.toLowerCase().includes(searchTerm) ||
      todo.description.toLowerCase().includes(searchTerm)
    )
  })

  return applySort(filtered, filters.sort)
}

export const TodoPage = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    sort: 'created-desc',
    search: '',
    due: 'all',
  })
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeToggleId, setActiveToggleId] = useState<string | null>(null)

  const updateCache = (updater: (todos: Todo[]) => Todo[]) => {
    queryClient.setQueryData<Todo[]>(queryKey, (previous) => {
      const baseline = previous ? [...previous] : []
      return updater(baseline)
    })
  }

  const { data: todos = [], isLoading, isError, error, isFetching } = useQuery({
    queryKey,
    queryFn: () => todoApi.list(),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => todoApi.toggleCompletion(id),
    onMutate: async (id: string) => {
      setActiveToggleId(id)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Todo[]>(queryKey)
      updateCache((current) =>
        current.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed, updatedAt: new Date().toISOString() } : todo,
        ),
      )
      return { previous } satisfies ToggleContext
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.push({
        intent: 'error',
        title: 'Unable to update todo',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Something went wrong while updating the todo. Please try again.',
      })
    },
    onSuccess: (updated) => {
      updateCache((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)))
      toast.push({
        intent: updated.completed ? 'success' : 'info',
        title: updated.completed ? 'Todo completed' : 'Todo reopened',
        description: updated.title,
      })
    },
    onSettled: () => {
      setActiveToggleId(null)
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateTodoInput) => todoApi.create(payload),
    onSuccess: (created) => {
      updateCache((current) => [created, ...current.filter((item) => item.id !== created.id)])
      toast.push({
        intent: 'success',
        title: 'Todo created',
        description: 'Your todo has been added to the backlog.',
      })
    },
    onError: (mutationError) => {
      toast.push({
        intent: 'error',
        title: 'Unable to create todo',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Something went wrong while creating the todo.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateTodoInput }) => todoApi.update(id, values),
    onSuccess: (updated) => {
      updateCache((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)))
      toast.push({
        intent: 'success',
        title: 'Todo updated',
        description: 'All changes were saved successfully.',
      })
    },
    onError: (mutationError) => {
      toast.push({
        intent: 'error',
        title: 'Unable to update todo',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Something went wrong while saving your changes.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => todoApi.delete(id),
    onSuccess: (_, id) => {
      updateCache((current) => current.filter((todo) => todo.id !== id))
      toast.push({
        intent: 'info',
        title: 'Todo deleted',
        description: 'The todo has been moved to the archive.',
      })
    },
    onError: (mutationError) => {
      toast.push({
        intent: 'error',
        title: 'Unable to delete todo',
        description:
          mutationError instanceof Error
            ? mutationError.message
            : 'Something went wrong while deleting the todo.',
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const derivedTodos = useMemo(() => filterTodos(todos, filters), [todos, filters])

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: event.target.value }))
  }

  const handleStatusChange = (status: StatusFilter) => {
    setFilters((prev) => ({ ...prev, status }))
  }

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, sort: event.target.value as SortOption }))
  }

  const handleDueChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, due: event.target.value as DueFilter }))
  }

  const handleClearFilters = () => {
    setFilters({ status: 'all', sort: 'created-desc', search: '', due: 'all' })
  }

  const openCreateModal = () => {
    setEditingTodo(null)
    setFormOpen(true)
  }

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo)
    setFormOpen(true)
  }

  const closeFormModal = () => {
    setFormOpen(false)
    setEditingTodo(null)
  }

  const handleFormSubmit = async (values: {
    title: string
    description: string
    dueDate: string | null
    completed: boolean
  }) => {
    if (editingTodo) {
      await updateMutation.mutateAsync({ id: editingTodo.id, values })
    } else {
      const payload: CreateTodoInput = {
        title: values.title,
        description: values.description,
        dueDate: values.dueDate,
        completed: values.completed,
      }
      await createMutation.mutateAsync(payload)
    }
  }

  const requestDelete = (todo: Todo) => setDeleteTarget(todo)
  const cancelDelete = () => setDeleteTarget(null)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  const toggleExpanded = (todoId: string) => {
    setExpandedId((current) => (current === todoId ? null : todoId))
  }

  const activeCount = todos.filter((todo) => !todo.completed).length
  const completedCount = todos.filter((todo) => todo.completed).length

  const showEmptyState = !isLoading && todos.length === 0
  const showNoResults = !isLoading && todos.length > 0 && derivedTodos.length === 0

  return (
    <div className="todo-page">
      <header className="todo-page__header">
        <div>
          <p className="eyebrow">Productivity</p>
          <h1>Team todos</h1>
          <p className="subheading">Track work, unblock teammates, and celebrate wins.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreateModal}>
          <Plus aria-hidden="true" />
          <span>Add todo</span>
        </button>
      </header>

      <section className="todo-controls" aria-label="Todo filters">
        <div className="todo-controls__search">
          <label htmlFor="todo-search" className="sr-only">
            Search todos
          </label>
          <div className="search-input">
            <Search aria-hidden="true" />
            <input
              id="todo-search"
              type="search"
              placeholder="Search by keyword"
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <div className="todo-controls__chips" role="group" aria-label="Filter by status">
          <Filter aria-hidden="true" />
          <button
            type="button"
            className={clsx('chip', { 'chip--active': filters.status === 'all' })}
            onClick={() => handleStatusChange('all')}
            aria-pressed={filters.status === 'all'}
          >
            All ({todos.length})
          </button>
          <button
            type="button"
            className={clsx('chip', { 'chip--active': filters.status === 'active' })}
            onClick={() => handleStatusChange('active')}
            aria-pressed={filters.status === 'active'}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className={clsx('chip', { 'chip--active': filters.status === 'completed' })}
            onClick={() => handleStatusChange('completed')}
            aria-pressed={filters.status === 'completed'}
          >
            Completed ({completedCount})
          </button>
        </div>

        <div className="todo-controls__dropdowns">
          <label className="select-field">
            <span className="select-field__label">Due</span>
            <select value={filters.due} onChange={handleDueChange}>
              <option value="all">Any time</option>
              <option value="soon">Due soon</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>

          <label className="select-field">
            <span className="select-field__label">Sort</span>
            <select value={filters.sort} onChange={handleSortChange}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isFetching ? (
        <div className="sync-indicator" role="status" aria-live="polite">
          <Loader2 className="spin" aria-hidden="true" /> Syncing updates…
        </div>
      ) : null}

      {isError ? (
        <div className="error-state" role="alert">
          <p>We couldn&apos;t load your todos.</p>
          <p className="error-state__message">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button type="button" className="btn btn--secondary" onClick={() => queryClient.invalidateQueries({ queryKey })}>
            Try again
          </button>
        </div>
      ) : null}

      {isLoading ? <TodoListSkeleton /> : null}

      {!isLoading && !isError ? (
        <div className="todo-list" role="list" aria-live="polite">
          {derivedTodos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              expanded={expandedId === todo.id}
              onToggleExpand={() => toggleExpanded(todo.id)}
              onEdit={() => openEditModal(todo)}
              onDelete={() => requestDelete(todo)}
              onToggleComplete={() => toggleMutation.mutate(todo.id)}
              toggling={activeToggleId === todo.id && toggleMutation.isPending}
            />
          ))}
        </div>
      ) : null}

      {showEmptyState ? (
        <EmptyState onCreate={openCreateModal} />
      ) : null}

      {showNoResults ? (
        <div className="empty-filters" role="status">
          <ListChecks aria-hidden="true" />
          <p>No todos match your filters.</p>
          <button type="button" className="btn btn--ghost" onClick={handleClearFilters}>
            Reset filters
          </button>
        </div>
      ) : null}

      <TodoFormModal
        open={isFormOpen}
        mode={editingTodo ? 'edit' : 'create'}
        todo={editingTodo}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete todo"
        description={
          <p>
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? You can&apos;t undo this
            action.
          </p>
        }
        confirmLabel="Delete"
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        isProcessing={deleteMutation.isPending}
        confirmTone="danger"
      />
    </div>
  )
}

type TodoCardProps = {
  todo: Todo
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleExpand: () => void
  expanded: boolean
  toggling: boolean
}

const TodoCard = ({ todo, onToggleComplete, onEdit, onDelete, onToggleExpand, expanded, toggling }: TodoCardProps) => {
  const titleId = `todo-${todo.id}`
  const detailsId = `todo-details-${todo.id}`

  const dueLabel = formatDueDateLabel(todo.dueDate)
  const updatedLabel = formatDistanceToNow(parseISO(todo.updatedAt), { addSuffix: true })
  const createdLabel = format(parseISO(todo.createdAt), 'MMM d, yyyy')

  const badges: ReactNode[] = []
  if (todo.completed) {
    badges.push(<span key="completed" className="badge badge--success">Completed</span>)
  }
  if (!todo.completed && isOverdue(todo.dueDate)) {
    badges.push(<span key="overdue" className="badge badge--danger">Overdue</span>)
  }
  if (!todo.completed && isDueSoon(todo.dueDate)) {
    badges.push(<span key="soon" className="badge badge--warning">Due soon</span>)
  }

  return (
    <article className={clsx('todo-card', { 'todo-card--completed': todo.completed })} role="listitem">
      <div className="todo-card__main">
        <button
          type="button"
          className="toggle-button"
          onClick={onToggleComplete}
          aria-pressed={todo.completed}
          aria-label={todo.completed ? 'Mark todo as incomplete' : 'Mark todo as complete'}
          disabled={toggling}
        >
          {toggling ? (
            <Loader2 aria-hidden="true" className="spin" />
          ) : todo.completed ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <Circle aria-hidden="true" />
          )}
        </button>
        <div className="todo-card__content">
          <div className="todo-card__header">
            <h3 id={titleId}>{todo.title}</h3>
            <div className="todo-card__badges">
              {badges.length ? badges : <span className="badge badge--muted">Open</span>}
            </div>
          </div>
          <p className="todo-card__due">
            <Calendar aria-hidden="true" /> {dueLabel}
          </p>
        </div>
        <div className="todo-card__actions" role="group" aria-label={`Actions for ${todo.title}`}>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onEdit}>
            <Edit2 aria-hidden="true" />
            <span className="sr-only">Edit</span>
          </button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onDelete}>
            <Trash2 aria-hidden="true" />
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </div>

      <div className="todo-card__footer">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={onToggleExpand}
        >
          {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          <span>{expanded ? 'Hide details' : 'Show details'}</span>
        </button>
        <span className="todo-card__meta">
          <Clock aria-hidden="true" /> Updated {updatedLabel}
        </span>
      </div>

      {expanded ? (
        <div id={detailsId} className="todo-card__details" role="region" aria-labelledby={titleId}>
          {todo.description ? <p className="todo-card__description">{todo.description}</p> : null}
          <dl className="todo-card__meta-grid">
            <div>
              <dt>Due</dt>
              <dd>{todo.dueDate ? format(parseISO(todo.dueDate), 'MMM d, yyyy') : 'No due date'}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{createdLabel}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{todo.completed ? 'Completed' : 'Active'}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </article>
  )
}

const TodoListSkeleton = () => {
  return (
    <div className="todo-list" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="todo-card skeleton">
          <div className="todo-card__main">
            <div className="toggle-button" />
            <div className="todo-card__content">
              <div className="skeleton-line skeleton-line--lg" />
              <div className="skeleton-line skeleton-line--sm" />
            </div>
          </div>
          <div className="todo-card__footer">
            <div className="skeleton-pill" />
            <div className="skeleton-line skeleton-line--xs" />
          </div>
        </div>
      ))}
    </div>
  )
}

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="empty-state" role="status">
    <div className="empty-state__icon" aria-hidden="true">
      <ListChecks />
    </div>
    <h2>No todos yet</h2>
    <p>Spin up your first todo to align the team and track momentum.</p>
    <button type="button" className="btn btn--primary" onClick={onCreate}>
      <Plus aria-hidden="true" />
      <span>Create todo</span>
    </button>
  </div>
)
