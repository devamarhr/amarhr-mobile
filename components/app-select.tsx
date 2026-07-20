import { AppText } from '@/components/app-text';
import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Tick02Icon, UnfoldMoreIcon } from '@hugeicons-pro/core-stroke-standard';
import { AppIcon } from "@/components/app-icon";
import { cn, FieldError, Label, PressableFeedback, Select, Separator } from 'heroui-native';
import React, { useCallback, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SelectOption = {
  value: string;
  label: string;
  [key: string]: any; // Allow additional custom fields
};

export type SelectItemRenderProps = {
  option: SelectOption;
  isSelected: boolean;
  isDisabled: boolean;
};

interface AppSelectProps {
  /**
   * Label text displayed above the select
   */
  label?: string;
  /**
   * Whether the select field is required (shows asterisk in label)
   * @default false
   */
  isRequired?: boolean;
  /**
   * Placeholder text when no value is selected
   * @default 'Select an option'
   */
  placeholder?: string;
  /**
   * Title displayed in the bottom sheet header
   * If not provided, uses the label value
   */
  title?: string;
  /**
   * Array of options to display
   */
  options: SelectOption[];
  /**
   * Selection mode. `'multiple'` lets several options be selected; the sheet stays
   * open on tap and selection is driven by `values`/`onValuesChange`.
   * @default 'single'
   */
  selectionMode?: 'single' | 'multiple';
  /**
   * Currently selected value (single mode)
   */
  value?: SelectOption;
  /**
   * Callback when value changes (single mode)
   */
  onValueChange?: (option: SelectOption | undefined) => void;
  /**
   * Currently selected values (multiple mode)
   */
  values?: SelectOption[];
  /**
   * Callback when the selected values change (multiple mode)
   */
  onValuesChange?: (options: SelectOption[]) => void;
  /**
   * Optional element rendered at the very top of the options list — e.g. a
   * "select all" row. Scrolls with the list and is counted in the measured height.
   */
  listHeader?: React.ReactNode;
  /**
   * Whether the select is disabled
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Whether the select field is in an invalid state
   * @default false
   */
  isInvalid?: boolean;
  /**
   * Error message to display when isInvalid is true
   */
  errorMessage?: string;
  /**
   * Additional CSS classes for the error message
   */
  errorMessageClassName?: string;
  /**
   * Height percentage for the bottom sheet
   * @default '50%'
   */
  snapPoints?: string[];
  /**
   * Additional CSS classes for the root container
   */
  className?: string;
  /**
   * Additional CSS classes for the label
   */
  labelClassName?: string;
  /**
   * Additional CSS classes for the trigger
   */
  triggerClassName?: string;
  /**
   * Optional icon element rendered on the left side of the trigger (before the value).
   */
  icon?: React.ReactNode;
  /**
   * Color for the trigger arrow icon
   * @default '#222222'
   */
  arrowIconColor?: string;
  /**
   * Color for the selected indicator icon
   * @default '#18AA0B'
   */
  indicatorIconColor?: string;
  /**
   * Size of the selected indicator icon
   * @default 24
   */
  indicatorIconSize?: number;
  /**
   * Whether to show separators between items
   * @default true
   */
  showSeparators?: boolean;
  /**
   * Additional CSS classes for the separator
   */
  separatorClassName?: string;
  /**
   * Additional CSS classes for each Select.Item
   */
  itemClassName?: string;
  /**
   * Custom render function for each item
   * If provided, this will override the default item rendering
   * @param props - Contains option data and selection state
   * @returns Custom React element to render for the item
   */
  renderItem?: (props: SelectItemRenderProps) => React.ReactNode;
  /**
   * Custom render function for the selected value in the trigger
   * If provided, this will override the default value display
   * @param option - The currently selected option
   * @returns Custom React element to render in the trigger
   */
  renderValue?: (option: SelectOption) => React.ReactNode;
  /**
   * Custom trigger element that replaces the default trigger entirely
   * Useful for inline selects like header month pickers
   */
  trigger?: React.ReactNode;
}

export function AppSelect({
  label,
  isRequired = false,
  placeholder = 'Сонгох',
  title,
  options,
  selectionMode = 'single',
  value,
  onValueChange,
  values,
  onValuesChange,
  listHeader,
  isDisabled = false,
  isInvalid = false,
  errorMessage,
  errorMessageClassName,
  snapPoints,
  className,
  labelClassName,
  triggerClassName,
  icon,
  arrowIconColor = '#222222',
  indicatorIconColor = '#18AA0B',
  indicatorIconSize = 24,
  showSeparators = true,
  separatorClassName,
  itemClassName,
  renderItem,
  renderValue,
  trigger,
}: AppSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  // No explicit snapPoints → size the sheet to its MEASURED content height (fixed
  // title + list), capped at 80%. We measure (onLayout + onContentSizeChange) instead
  // of gorhom's enableDynamicSizing, which breaks BottomSheetScrollView scrolling on
  // Android. A fixed snap point + h-full keeps the list reliably scrollable at the cap.
  const maxSheetHeight = height * 0.8;
  const measuredHeight = headerHeight + listHeight;
  const resolvedSnapPoints = snapPoints?.length
    ? snapPoints
    : [Math.min(measuredHeight || maxSheetHeight, maxSheetHeight)];
  const displayTitle = title || label || 'Select';

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, []);

  const isMultiple = selectionMode === 'multiple';

  // Handle type conversion for heroui-native Select. Multiple mode receives the
  // full array of currently-selected options; single mode receives one option.
  const handleValueChange = (next: any) => {
    if (isMultiple) {
      const arr = ((next as SelectOption[]) ?? []).map(
        (o) => options.find((opt) => opt.value === o?.value) || o
      );
      onValuesChange?.(arr);
    } else {
      const fullOption = options.find((opt) => opt.value === next?.value);
      onValueChange?.(fullOption);
    }
  };

  // Value handed to heroui Select (array in multiple mode).
  const selectValue = isMultiple ? values ?? [] : value;

  // Full option data for the default single-mode trigger display.
  const fullValue =
    !isMultiple && value
      ? options.find((opt) => opt.value === value.value) || value
      : undefined;

  return (
    <View className={cn('gap-2', className)}>
      {label && (
        <Label isRequired={isRequired}>
          <Label.Text className={cn('text-sm font-normal text-darkgray', labelClassName)}>
            {label}
          </Label.Text>
        </Label>
      )}

      <Select
        presentation="bottom-sheet"
        selectionMode={selectionMode as any}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        value={selectValue as any}
        onValueChange={handleValueChange as any}
        isDisabled={isDisabled}
      >
        <Select.Trigger variant="unstyled" asChild className="">
          {trigger ? (
            <PressableFeedback className={triggerClassName}>
              {trigger}
            </PressableFeedback>
          ) : (
            <PressableFeedback
              className={cn(
                'flex-row rounded-lg border border-gray/30 items-center justify-center px-3 py-1 h-11 disabled:opacity-50',
                icon && 'gap-2',
                isInvalid && 'border-red',
                triggerClassName
              )}
            >
              {icon}
              <View className="flex-1">
                {fullValue && renderValue ? (
                  renderValue(fullValue)
                ) : (
                  <AppText className={cn(
                    'text-base',
                    !fullValue && 'text-muted'
                  )}>
                    {fullValue?.label ?? placeholder}
                  </AppText>
                )}
              </View>
              <AppIcon icon={UnfoldMoreIcon} size={20} color={arrowIconColor} />
            </PressableFeedback>
          )}
        </Select.Trigger>

        <Select.Portal>
          <Select.Overlay className="bg-scrim/40" />
          <Select.Content
            presentation="bottom-sheet"
            snapPoints={resolvedSnapPoints}
            topInset={insets.top}
            enableOverDrag={false}
            enableDynamicSizing={false}
            handleComponent={null}
            contentContainerClassName="h-full p-0 rounded-t-[10px] border border-transparent bg-overlay overflow-hidden"
            contentContainerProps={{
              style: {
                borderCurve: 'continuous',
              },
            }}
          >
            <View
              className="px-4 py-5"
              onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
            >
              <AppText className="text-lg font-medium text-center">
                {displayTitle}
              </AppText>
            </View>

            <BottomSheetScrollView
              ref={scrollRef}
              contentContainerClassName="px-4 pb-10"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={(_w, h) => setListHeight(h)}
            >
              {listHeader}
              {options.map((option, index) => (
                <View key={option.value}>
                  <Select.Item
                    className={cn('py-3', itemClassName)}
                    value={option.value}
                    label={option.label}
                  >
                    {renderItem ? (
                      // Custom render
                      ({ isSelected, isDisabled }) => (
                        <>
                          {renderItem({ option, isSelected, isDisabled })}
                          <Select.ItemIndicator>
                            <AppIcon
                              icon={Tick02Icon}
                              size={indicatorIconSize}
                              color={indicatorIconColor}
                              strokeWidth={2}
                            />
                          </Select.ItemIndicator>
                        </>
                      )
                    ) : (
                      // Default render
                      ({ isSelected }) => (
                        <>
                          <View className="flex-1">
                            <Select.ItemLabel className={isSelected ? 'font-medium' : 'font-normal'} />
                          </View>
                          <Select.ItemIndicator>
                            <AppIcon
                              icon={Tick02Icon}
                              size={indicatorIconSize}
                              color={indicatorIconColor}
                              strokeWidth={2}
                            />
                          </Select.ItemIndicator>
                        </>
                      )
                    )}
                  </Select.Item>
                  {showSeparators && index < options.length - 1 && (
                    <Separator className={cn('bg-darkgray/15', separatorClassName)} />
                  )}
                </View>
              ))}
            </BottomSheetScrollView>
          </Select.Content>
        </Select.Portal>
      </Select>
      {errorMessage && isInvalid && (
        <FieldError isInvalid className={cn('', errorMessageClassName)}>
          {errorMessage}
        </FieldError>
      )}
    </View>
  );
}