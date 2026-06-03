import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { buttonVariants } from '#/components/ui/button.tsx';
import { cn } from '#/lib/utils.ts';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

function AlertDialogContent({ className, children, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50" />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          'bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 grid w-full max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-5 shadow-lg outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn('text-base font-semibold', className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={cn('flex justify-end gap-2', className)} {...props} />;
}

function AlertDialogCancel({ className, ...props }: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), className)} {...props} />;
}

function AlertDialogAction({ className, ...props }: AlertDialogPrimitive.Close.Props) {
  return <AlertDialogPrimitive.Close className={cn(buttonVariants({ variant: 'destructive', size: 'lg' }), className)} {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
};
