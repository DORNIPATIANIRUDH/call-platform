'use client'

import { useState } from 'react'
import type { ActionItem } from '@call-platform/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props { items: ActionItem[]; meetingId: string }

export function ActionItemsList({ items, meetingId }: Props) {
  const [localItems, setLocalItems] = useState(items)

  const toggle = async (item: ActionItem) => {
    const next = item.status === 'DONE' ? 'OPEN' : 'DONE'
    setLocalItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)))
    await fetch(`/api/meetings/${meetingId}/action-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Action Items
          <Badge variant="secondary">{localItems.filter((i) => i.status !== 'DONE').length} open</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {localItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No action items detected.</p>
        ) : (
          <ul className="space-y-3">
            {localItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <button onClick={() => toggle(item)} className="mt-0.5 shrink-0">
                  {item.status === 'DONE'
                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className="min-w-0">
                  <p className={`text-sm ${item.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>
                    {item.text}
                  </p>
                  {(item.assignee || item.dueDate) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.assignee && <span>{item.assignee}</span>}
                      {item.dueDate && <span> · {formatDate(item.dueDate)}</span>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
