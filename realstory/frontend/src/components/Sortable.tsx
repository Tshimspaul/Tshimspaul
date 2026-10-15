import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

interface Props<T extends { id: number }> {
  items: T[]
  onReorder: (ids: number[]) => void
  render: (item: T, controls: ReactNode) => ReactNode
  className?: string
  label: (item: T) => string
}

/** A reorderable list: drag with the handle, or use the arrow buttons / keyboard. */
export function SortableList<T extends { id: number }>({ items, onReorder, render, className, label }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map((i) => i.id)
  const move = (from: number, to: number) => onReorder(arrayMove(ids, from, to))

  const onDragEnd = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id) move(ids.indexOf(Number(e.active.id)), ids.indexOf(Number(e.over.id)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem key={item.id} id={item.id}>
              {(handle) =>
                render(
                  item,
                  <span className="order-controls">
                    {handle}
                    <button type="button" className="ghost" aria-label={`Monter ${label(item)}`} disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
                    <button type="button" className="ghost" aria-label={`Descendre ${label(item)}`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>↓</button>
                  </span>,
                )
              }
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ id, children }: { id: number; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  return (
    <div ref={setNodeRef} style={style}>
      {children(
        <button type="button" className="ghost handle" aria-label="Déplacer" {...attributes} {...listeners}>⠿</button>,
      )}
    </div>
  )
}
