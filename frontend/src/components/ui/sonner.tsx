import {
  BellIcon,
  InfoIcon,
  Loader2Icon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <MaterialToastIcon />,
        info: <MaterialToastIcon />,
        warning: <MaterialToastIcon />,
        error: <MaterialToastIcon />,
        loading: <MaterialToastIcon icon={Loader2Icon} spin />,
      }}
      toastOptions={{
        classNames: {
          toast: "maldonado-toast",
          title: "maldonado-toast-title",
          description: "maldonado-toast-description",
          actionButton: "maldonado-toast-action",
          cancelButton: "maldonado-toast-cancel",
          closeButton: "maldonado-toast-close",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(255, 255, 255, 0.86)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "rgba(221, 221, 221, 0.72)",
          "--border-radius": "22px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

function MaterialToastIcon({
  icon: Icon = BellIcon,
  spin = false,
}: {
  icon?: typeof InfoIcon
  spin?: boolean
}) {
  return (
    <span className="maldonado-material-icon">
      <Icon className={`size-5 ${spin ? "animate-spin" : ""}`} />
    </span>
  )
}

export { Toaster }
