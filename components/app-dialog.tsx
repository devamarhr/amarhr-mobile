import { AppButton } from '@/components/app-button';
import { cn, Dialog } from 'heroui-native';
import React from 'react';

type AppDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Extra classes for the content card. */
  className?: string;
};

/**
 * App-styled dialog shell matching the Figma design: white card with 10px
 * radius, 16px side spacing (portal `px-4`) and the shared dim overlay.
 */
export function AppDialog({ isOpen, onOpenChange, children, className }: AppDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal className="px-4">
        <Dialog.Overlay className="bg-scrim/40" />
        <Dialog.Content className={cn('rounded-[10px]', className)}>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

function AppDialogTitle({ className, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn('text-center text-black text-lg font-medium', className)}
      {...props}
    />
  );
}

function AppDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      className={cn('text-center text-black text-base', className)}
      {...props}
    />
  );
}

/**
 * Light-blue pill button used for dialog actions. Layout (flex-1 for a 2-button
 * row, w-[145px] for a single right-aligned action) is set by the caller.
 */
function AppDialogButton({
  className,
  labelClassName,
  ...props
}: React.ComponentProps<typeof AppButton>) {
  return (
    <AppButton
      className={cn('rounded-full bg-lightblue border-darkblue/15', className)}
      labelClassName={cn('text-darkerblue text-base font-semibold', labelClassName)}
      {...props}
    />
  );
}

AppDialog.Title = AppDialogTitle;
AppDialog.Description = AppDialogDescription;
AppDialog.Button = AppDialogButton;
