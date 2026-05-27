import { AlertTriangle } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"

interface DeleteConfirmPopoverProps {
  title: string
  description: string
  disabled?: boolean
  isPending?: boolean
  children: ReactNode
  onConfirm: () => Promise<void> | void
}

export function DeleteConfirmPopover({ title, description, disabled, isPending, children, onConfirm }: DeleteConfirmPopoverProps) {
  const [open, setOpen] = useState(false)

  async function confirmDelete() {
    await onConfirm()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled || isPending}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <PopoverHeader className="border-b-0 pb-2">
          <div className="mb-2 grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <div className="grid grid-cols-2 gap-2 p-3 pt-1">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={isPending}>
            Não
          </Button>
          <Button type="button" variant="destructive" className="rounded-full" onClick={confirmDelete} disabled={isPending}>
            {isPending ? "Excluindo..." : "Sim"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
