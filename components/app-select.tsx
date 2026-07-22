import { AppIcon } from "@/components/app-icon";
import { AppText } from '@/components/app-text';
import { Tick02Icon, UnfoldMoreIcon } from '@hugeicons-pro/core-stroke-standard';
import { cn, FieldError, Label, PressableFeedback, Separator } from 'heroui-native';
import React, { useCallback, useRef } from 'react';
import { Keyboard, Pressable, useWindowDimensions, View } from 'react-native';
import ActionSheet, { ActionSheetRef, ScrollView as SheetScrollView } from 'react-native-actions-sheet';
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
   * Additional CSS classes for each option row
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
  const sheetRef = useRef<ActionSheetRef>(null);
  const scrollRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const isMultiple = selectionMode === 'multiple';
  const displayTitle = title || label || 'Select';

  // Жагсаалтын өндөр: snapPoints ('35%' гэх мэт хувь) өгвөл тухайн хувиар ТОГТМОЛ
  // өндөр; үгүй бол контентоороо автоматаар томроод дэлгэцийн 72%-д тултал багтана
  // (түүнээс урт бол scroll).
  const percentRaw = snapPoints?.length
    ? parseFloat(String(snapPoints[0]).replace('%', ''))
    : NaN;
  const percent = Number.isFinite(percentRaw) && percentRaw > 0 ? percentRaw / 100 : undefined;
  const listStyle = percent ? { height: height * percent } : { maxHeight: height * 0.72 };

  const openSheet = useCallback(() => {
    if (isDisabled) return;
    // Sheet-ийн дотор textarea-гийн keyboard нээлттэй байхад select-ийг дарахад
    // keyboard хаагдаж sheet-тэй давхцахаас сэргийлж эхлээд хаана.
    Keyboard.dismiss();
    sheetRef.current?.show();
  }, [isDisabled]);

  const isSelected = (option: SelectOption) =>
    isMultiple
      ? (values ?? []).some((o) => o.value === option.value)
      : value?.value === option.value;

  const handleSelect = (option: SelectOption) => {
    if (isMultiple) {
      // Олон сонголт: утгыг toggle хийж, sheet-ийг нээлттэй үлдээнэ.
      const current = values ?? [];
      const exists = current.some((o) => o.value === option.value);
      const next = exists
        ? current.filter((o) => o.value !== option.value)
        : [...current, option];
      onValuesChange?.(next);
    } else {
      onValueChange?.(option);
      sheetRef.current?.hide();
    }
  };

  // Default single-mode trigger дэлгэцлэх бүрэн option.
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

      {trigger ? (
        <PressableFeedback onPress={openSheet} isDisabled={isDisabled} className={triggerClassName}>
          {trigger}
        </PressableFeedback>
      ) : (
        <PressableFeedback
          onPress={openSheet}
          isDisabled={isDisabled}
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
              <AppText className={cn('text-base', !fullValue && 'text-muted')}>
                {fullValue?.label ?? placeholder}
              </AppText>
            )}
          </View>
          <AppIcon icon={UnfoldMoreIcon} size={20} color={arrowIconColor} />
        </PressableFeedback>
      )}

      {errorMessage && isInvalid && (
        <FieldError isInvalid className={cn('', errorMessageClassName)}>
          {errorMessage}
        </FieldError>
      )}

      <ActionSheet
        ref={sheetRef}
        gestureEnabled
        indicatorStyle={{ width: 0, height: 0, marginVertical: 0 }}
        containerStyle={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
        useBottomSafeAreaPadding={false}
        onOpen={() => scrollRef.current?.scrollTo?.({ y: 0, animated: false })}
      >
        <View className="px-4 py-5">
          <AppText className="text-lg font-medium text-center">{displayTitle}</AppText>
        </View>

        <SheetScrollView
          ref={scrollRef}
          style={listStyle}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {listHeader}
          {options.map((option, index) => {
            const selected = isSelected(option);
            return (
              <View key={option.value}>
                <Pressable
                  className={cn('flex-row items-center py-3', itemClassName)}
                  onPress={() => handleSelect(option)}
                >
                  {renderItem ? (
                    renderItem({ option, isSelected: selected, isDisabled })
                  ) : (
                    <View className="flex-1">
                      <AppText className={cn('text-base', selected ? 'font-medium' : 'font-normal')}>
                        {option.label}
                      </AppText>
                    </View>
                  )}
                  {selected && (
                    <AppIcon
                      icon={Tick02Icon}
                      size={indicatorIconSize}
                      color={indicatorIconColor}
                      strokeWidth={2}
                    />
                  )}
                </Pressable>
                {showSeparators && index < options.length - 1 && (
                  <Separator className={cn('bg-darkgray/15', separatorClassName)} />
                )}
              </View>
            );
          })}
        </SheetScrollView>
      </ActionSheet>
    </View>
  );
}