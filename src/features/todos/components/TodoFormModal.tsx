import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { parseISO, startOfDay } from 'date-fns'

import { Modal } from '../../../components/Modal'
import { type Todo } from '../types'
import { toDateInputValue } from '../../../utils/date'

const schema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(120, 'Title must be 120 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .default(''),
  dueDate: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .refine((value) => {
      if (!value) return true
      const parsed = parseISO(value)
      if (Number.isNaN(parsed.getTime())) return false
      const today = startOfDay(new Date())
      return !(parsed < today)
    }, 'Due date cannot be in the past'),
  completed: z.boolean(),
})

export type TodoFormValues = z.infer<typeof schema>

type TodoFormModalProps = {
  mode: 'create' | 'edit'
  open: boolean
  todo?: Todo | null
  onClose: () => void
  onSubmit: (payload: { title: string; description: string; dueDate: string | null; completed: boolean }) => Promise<void> | void
  isSubmitting?: boolean
}

export const TodoFormModal = ({ mode, open, todo, onClose, onSubmit, isSubmitting = false }: TodoFormModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: formSubmitting },
    setError,
  } = useForm<TodoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      completed: false,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: todo?.title ?? '',
        description: todo?.description ?? '',
        dueDate: todo?.dueDate ? toDateInputValue(todo.dueDate) : '',
        completed: todo?.completed ?? false,
      })
    }
  }, [open, reset, todo])

  const submitHandler = handleSubmit(async (values) => {
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        dueDate: values.dueDate ? values.dueDate : null,
        completed: values.completed,
      })
      reset()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong while saving the todo.'
      setError('root', { type: 'manual', message })
    }
  })

  const rootError = errors.root?.message

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Create new todo' : 'Edit todo'}
      onClose={onClose}
      dismissLabel="Close todo form"
      size="md"
      footer={
        <div className="dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            form="todo-form"
            disabled={isSubmitting || formSubmitting}
          >
            {isSubmitting || formSubmitting ? 'Saving…' : mode === 'create' ? 'Create todo' : 'Save changes'}
          </button>
        </div>
      }
    >
      <form id="todo-form" className="todo-form" onSubmit={submitHandler}>
        <div className="form-field">
          <label htmlFor="todo-title" className="form-label">
            Title<span className="required-indicator">*</span>
          </label>
          <input
            id="todo-title"
            type="text"
            {...register('title')}
            className={errors.title ? 'input input--error' : 'input'}
            placeholder="Launch the todo rocket"
            autoFocus
          />
          {errors.title ? <p className="field-error">{errors.title.message}</p> : null}
        </div>

        <div className="form-field">
          <label htmlFor="todo-description" className="form-label">
            Description
          </label>
          <textarea
            id="todo-description"
            rows={4}
            {...register('description')}
            className={errors.description ? 'textarea textarea--error' : 'textarea'}
            placeholder="Add additional context, acceptance criteria, or links"
          />
          {errors.description ? <p className="field-error">{errors.description.message}</p> : null}
        </div>

        <div className="form-field form-field--inline">
          <div>
            <label htmlFor="todo-due-date" className="form-label">
              Due date
            </label>
            <input id="todo-due-date" type="date" {...register('dueDate')} className={errors.dueDate ? 'input input--error' : 'input'} />
            {errors.dueDate ? <p className="field-error">{errors.dueDate.message}</p> : null}
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              {...register('completed')}
              disabled={isSubmitting || formSubmitting}
            />
            <span>Mark as complete</span>
          </label>
        </div>

        {rootError ? (
          <p className="form-error" role="alert">
            {rootError}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
