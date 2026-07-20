import { AppText } from "@/components/app-text";
import { AppButton } from "@/components/app-button";
import { AppTextField } from "@/components/app-text-field";
import { AppSwitch } from "@/components/app-switch";
import { AppInputOTPSlot } from "@/components/app-input-otp-slot";
import { AppToast } from "@/components/app-toast";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppDatePicker } from "@/components/app-date-picker";
import { useAppTheme } from "@/contexts/app-theme-context";
import {
  ChevronLeft,
  ClosedCaptionIcon,
  HeartbreakIcon,
  Home02Icon,
  ArrowLeft01Icon,
  Moon01Icon,
  Search01Icon,
  Sun01Icon,
  MinusSignIcon,
  FileAttachmentIcon, CheckmarkCircle02Icon, Cancel01Icon, Alert01Icon, ArrowDown01Icon, MultiplicationSignIcon,
  Tick02Icon, Clock01Icon, Calendar03Icon
} from "@hugeicons-pro/core-stroke-standard";
import { AppIcon } from "@/components/app-icon";
import {
  Avatar, BottomSheet,
  Button, Chip, CloseButton, cn, Description, FieldError, InputOTP, Label, PressableFeedback, ScrollShadow, Select,
  Separator, Spinner,
  Switch,
  Tabs, Toast,
  useThemeColor,
  useToast
} from "heroui-native";
import React, { useRef, useState } from "react";
import { Pressable, ScrollView, View } from 'react-native';
import { useReanimatedKeyboardAnimation, useWindowDimensions } from "react-native-keyboard-controller";
import Animated, { FadeInLeft, FadeInRight, FadeOut, useAnimatedStyle, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const StyledSafeAreaView = withUniwind(SafeAreaView);

const AvatarVariants = () => {
  return (
    <View className="flex-1 px-5 items-center justify-center">
      <View className="flex-row items-center justify-center gap-4 flex-wrap">
        <Avatar alt="Avatar">
          <Avatar.Image
            source={{
              uri: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=1',
            }}
          />
          <Avatar.Fallback />
        </Avatar>
        <Avatar color="accent" alt="Accent">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>AC</Avatar.Fallback>
        </Avatar>
        <Avatar color="default" alt="Default">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>DF</Avatar.Fallback>
        </Avatar>
        <Avatar variant="soft" color="accent" alt="Accent">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>AC</Avatar.Fallback>
        </Avatar>
        <Avatar variant="soft" color="default" alt="Default">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>DF</Avatar.Fallback>
        </Avatar>
        <Avatar alt="Avatar" className="w-20 h-20">
          <Avatar.Image
            source={{
              uri: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=11',
            }}
          />
          <Avatar.Fallback />
        </Avatar>
        <Avatar alt="Avatar" className="w-20 h-20 bg-red/7">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback classNames={{
            text: "text-red"
          }}>
            DF
          </Avatar.Fallback>
        </Avatar>
      </View>
    </View>
  );
};

const KeyboardAvoidingContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { height } = useWindowDimensions();

  const { progress } = useReanimatedKeyboardAnimation();

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: progress.value === 1 ? -height * 0.15 : 0 }],
    };
  });

  return <Animated.View style={rStyle}>{children}</Animated.View>;
};

const BasicTextFieldContent = () => {
  return (
    <View className="flex-1 justify-center px-5">
      <View className="gap-3">
        <AppTextField
          label="Email"
        />
        <AppTextField
          isRequired
          label="Email"
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          description="We'll never share your email with anyone else."
        />
      </View>
    </View>
  );
};

const TextFieldWithIconsContent = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View className="flex-1 justify-center px-5">
      <View className="gap-3">
        <AppTextField
          isRequired
          label="Password"
          placeholder="Enter your password"
          secureTextEntry={!isPasswordVisible}
          leftIcon={
            <StyledIonicons
              name="lock-closed-outline"
              size={16}
              className="text-muted"
            />
          }
          rightIcon={
            <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              <StyledIonicons
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                className="text-muted"
              />
            </Pressable>
          }
        />
        <AppTextField
          className="rounded-full"
          placeholder="Ажилтны нэрээр хайх"
          leftIcon={
            <AppIcon
              size="20"
              color="#222222"
              icon={Search01Icon}
            />
          }
        />
      </View>
    </View>
  );
};

const DisabledTextFieldContent = () => {
  return (
    <View className="flex-1 justify-center px-5">
      <View className="gap-3">
        <AppTextField
          label="Account ID"
          placeholder="Enter account ID"
          value="ACC-2024-12345"
          description="Your unique account identifier"
        />
        <AppTextField
          isDisabled
          label="User Role"
          placeholder="Role assignment"
          value="Administrator"
          description="Contact support to change your role"
        />
      </View>
    </View>
  );
};

const MultilineTextFieldContent = () => {
  return (
    <View className="flex-1 justify-center px-5">
      <AppTextField
        label="Message"
        placeholder="Type your message here..."
        isTextArea
        numberOfLines={4}
        textAlignVertical="top"
        description="Maximum 500 characters"
      />
    </View>
  );
};

const TextFieldWithValidationContent = () => {
  const [isTestFieldInvalid, setIsTestFieldInvalid] = useState(false);
  const [testFieldValue, setTestFieldValue] = useState('');

  return (
    <View className="flex-1 justify-center px-5">
      <View className="gap-3">
        <AppTextField
          isRequired
          isInvalid={isTestFieldInvalid}
          label="Promo Code"
          placeholder="Enter promo code"
          value={testFieldValue}
          onChangeText={setTestFieldValue}
          autoCapitalize="characters"
          description="Enter a valid code to receive discount"
          errorMessage="This promo code is invalid or has expired"
        />
        <AppButton
          onPress={() => setIsTestFieldInvalid(!isTestFieldInvalid)}
          className="self-start"
          label={isTestFieldInvalid ? 'Clear Error' : 'Simulate Error'}
        />
      </View>
    </View>
  );
};

const MONTH_OPTIONS: SelectOption[] = [
  { value: '12', label: '12 сар' },
  { value: '11', label: '11 сар' },
  { value: '10', label: '10 сар' },
  { value: '9', label: '9 сар' },
  { value: '8', label: '8 сар' },
  { value: '7', label: '7 сар' },
  { value: '6', label: '6 сар' },
  { value: '5', label: '5 сар' },
  { value: '4', label: '4 сар' },
  { value: '3', label: '3 сар' },
  { value: '2', label: '2 сар' },
  { value: '1', label: '1 сар' },
];

const EMPLOYEE_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Б.Энхбаяр', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=1', job: 'Захирал' },
  { value: '2', label: 'С.Оюунчимэг', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', job: 'Маркетингийн менежер' },
  { value: '3', label: 'Д.Болдбаатар', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=3', job: 'Ахлах хөгжүүлэгч' },
  { value: '4', label: 'Т.Сарангэрэл', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=4', job: 'UX дизайнер' },
  { value: '5', label: 'Г.Мөнхбат', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=5', job: 'Бизнес төлөвлөлтийн туслах' },
  { value: '6', label: 'Н.Алтанцэцэг', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=6', job: 'Хүний нөөцийн менежер' },
  { value: '7', label: 'Ч.Баярмаа', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=7', job: 'Борлуулалтын ахлах мэргэжилтэн' },
  { value: '8', label: 'Л.Төгөлдөр', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=8', job: 'Санхүүгийн зөвлөх' },
  { value: '9', label: 'П.Ганбаатар', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=9', job: 'Хөгжүүлэлтийн менежер' },
  { value: '10', label: 'Х.Цэцэгмаа', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=10', job: 'Контент стратегич' },
];

const SelectPresentationContent = () => {
  const [month, setMonth] = useState<SelectOption | undefined>();
  const [employee, setEmployee] = useState<SelectOption | undefined>();

  return (
    <View className="flex-1 px-5">
      <View className="gap-8">
        <AppSelect
          label="Month"
          isRequired
          placeholder="Select a month"
          options={MONTH_OPTIONS}
          value={month}
          onValueChange={setMonth}
        />
        <AppSelect
          label="Year"
          placeholder="Select a year"
          options={[
            { value: '2024', label: '2024' },
            { value: '2023', label: '2023' },
            { value: '2022', label: '2022' },
          ]}
          snapPoints={['35%']}
          indicatorIconColor="#005FEE"
        />
        <AppSelect
          label="Employee"
          placeholder="Select an employee"
          options={EMPLOYEE_OPTIONS}
          value={employee}
          onValueChange={setEmployee}
          snapPoints={['60%']}
          showSeparators={false}
          itemClassName="py-2"
          renderValue={(option) => (
            <View className="flex-row items-center gap-3">
              <Avatar alt="avatar" className="w-8 h-8">
                <Avatar.Image source={{ uri: option.avatar }} />
                <Avatar.Fallback delayMs={600}>{option.label[0]}</Avatar.Fallback>
              </Avatar>
              <View className="flex-1">
                <AppText className="text-sm">{option.label}</AppText>
              </View>
            </View>
          )}
          renderItem={({ option }) => (
            <View className="flex-row items-center gap-3 flex-1">
              <Avatar alt="avatar" className="w-10 h-10">
                <Avatar.Image source={{ uri: option.avatar }} />
                <Avatar.Fallback delayMs={600}>{option.label[0]}</Avatar.Fallback>
              </Avatar>
              <View className="flex-1">
                <AppText className="text-sm">{option.label}</AppText>
                <AppText className="text-sm text-darkgray">{option.job}</AppText>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const ButtonVariantsContent = () => {
  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center">
        <View className="gap-6 w-full px-8">
          <AppButton
            className="border-darkgray/30"
            label="Хавсралттай"
            labelClassName="text-blue"
            leftIcon={
              <AppIcon
                icon={FileAttachmentIcon}
                size={22}
                color="#005FEE"
              />
            }
          />

          <AppButton
            className="border-darkblue/15 bg-lightblue"
            label="Илгээх"
            labelClassName="text-darkerblue text-base"
          />

          <AppButton label="Loading" isLoading />

          <AppButton
            label="Disabled"
            isDisabled
            leftIcon={
              <AppIcon
                icon={Home02Icon}
                size={24}
                color="#6a6a6a"
              />
            }
          />

          <AppButton
            className="border-darkgray/60 rounded"
            label="Үргэлжлүүл"
          />

          <AppButton
            className="bg-green/10 border-green/15"
            label="Зөвшөөрөх"
            labelClassName="text-green"
          />

          <AppButton
            leftIcon={
              <AppIcon
                icon={HeartbreakIcon}
                size={24}
                color="#222222"
              />
            }
            label="Favorite"
            rightIcon={
              <AppIcon
                icon={ChevronLeft}
                size={24}
                color="#222222"
              />
            }
          />

          <View className="flex-row gap-4">
            <AppButton
              isIconOnly
              className="border-darkgray/60 rounded"
              leftIcon={
                <AppIcon
                  icon={ArrowLeft01Icon}
                  size={24}
                  color="#222222"
                />
              }
            />

            <AppButton
              isIconOnly
              className="border-darkgray/30"
              leftIcon={
                <AppIcon
                  icon={MinusSignIcon}
                  size={24}
                  color="#222222"
                />
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const StyledIonicons = withUniwind(Ionicons);
const StyledFontAwesome6 = withUniwind(FontAwesome6);
const SwitchCustomStylesContent = () => {
  const [selected, setSelected] = React.useState(false);
  const [icon, setIcon] = React.useState(true);
  const [contentIcon, setContentIcon] = React.useState(true);
  const [contentText, setContentText] = React.useState(true);

  return (
    <View className="flex-1 px-5 flex-row gap-2 flex-wrap">
      <AppSwitch isSelected={selected} onSelectedChange={setSelected} />

      <AppSwitch isDisabled />

      <AppSwitch
        isSelected={icon}
        onSelectedChange={setIcon}
        thumbClassName="size-[30px]"
        thumbIcon={
          icon ? (
            <Animated.View key="check" entering={ZoomIn}>
              <StyledFontAwesome6
                name="check"
                size={12}
                className="text-accent"
              />
            </Animated.View>
          ) : (
            <Animated.View key="x" entering={ZoomIn}>
              <StyledIonicons name="close" size={14} className="text-muted" />
            </Animated.View>
          )
        }
      />

      <AppSwitch
        isSelected={contentIcon}
        onSelectedChange={setContentIcon}
        className="w-[56px] h-[32px]"
        thumbClassName="size-[22px]"
        startContentClassName="left-2"
        endContentClassName="right-2"
        animation={{
          backgroundColor: {
            value: ['#172554', '#eab308'],
          },
        }}
        thumbAnimation={{
          left: {
            value: 4,
            springConfig: {
              damping: 30,
              stiffness: 300,
              mass: 1,
            },
          },
        }}
        startContent={
          contentIcon && (
            <Animated.View key="sun" entering={ZoomIn.springify()}>
              <StyledIonicons
                name="sunny"
                size={16}
                className="text-amber"
              />
            </Animated.View>
          )
        }
        endContent={
          !contentIcon && (
            <Animated.View key="moon" entering={ZoomIn.springify()}>
              <StyledIonicons
                name="moon"
                size={16}
                className="text-lightblue"
              />
            </Animated.View>
          )
        }
      />

      <AppSwitch
        isSelected={contentText}
        onSelectedChange={setContentText}
        className="w-[60px] h-[32px]"
        thumbClassName="size-[22px]"
        startContentClassName="left-3"
        endContentClassName="right-2"
        animation={{
          backgroundColor: {
            value: ['#71717a', '#16a34a'],
          },
        }}
        thumbAnimation={{
          left: {
            value: 4,
            springConfig: {
              damping: 36,
              stiffness: 400,
              mass: 1,
            },
          },
          backgroundColor: {
            value: ['#fff', '#fff'],
          },
        }}
        startContent={
          contentText && (
            <Animated.View
              key="sun"
              entering={FadeInRight.springify().duration(100)}
            >
              <AppText className="text-xs font-bold text-white">ON</AppText>
            </Animated.View>
          )
        }
        endContent={
          !contentText && (
            <Animated.View
              key="moon"
              entering={FadeInLeft.springify().duration(100)}
            >
              <AppText className="text-xs font-bold text-white">OFF</AppText>
            </Animated.View>
          )
        }
      />
    </View>
  );
};

const ToastVariantContent = () => {
  const { toast } = useToast();

  return (
    <View className="flex-1 px-5 flex-row gap-2 flex-wrap">
      <Chip
        variant="primary"
        color="success"
        onPress={() =>
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="success"
                title="You have upgraded your plan"
                description="You can continue using HeroUI Chat"
                icon={<AppIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
                iconContainerClassName="justify-center"
                action={<AppIcon icon={Cancel01Icon} size={16} color="#FFFFFF" />}
                actionClassName="justify-center"
                onActionPress={(props) => props.hide()}
              />
            ),
          })
        }
      >
        Success (Icon)
      </Chip>
      <Chip
        variant="primary"
        color="warning"
        onPress={() =>
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="warning"
                title="You have upgraded your plan"
                description="You can continue using HeroUI Chat"
                action="Close"
                onActionPress={(props) => props.hide()}
              />
            ),
          })
        }
      >
        Warning (Label)
      </Chip>
      <Chip
        variant="primary"
        color="danger"
        onPress={() =>
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="danger"
                title="You have upgraded your plan"
                description="You can continue using HeroUI Chat"
                icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
                showClose
              />
            ),
          })
        }
      >
        Danger (Close)
      </Chip>
    </View>
  );
}

const WithValidationOTPContent = () => {
  const [value, setValue] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);

  const { toast } = useToast();

  const onSubmit = () => {
    if (value.length === 6) {
      if (value === '123456') {
        toast.show({
          variant: 'success',
          label: 'Verification Successful',
          description:
            'Your code has been verified successfully. You can proceed.',
        });
        setValue('');
        if (isInvalid) {
          setIsInvalid(false);
        }
      } else {
        setIsInvalid(true);
      }
    } else {
      toast.show({
        variant: 'warning',
        label: 'Incomplete Code',
        description:
          'Please enter all 6 digits to complete your verification code.',
      });
    }
  };

  return (
    <View className="flex-1 px-5 items-center justify-center">
      <View className="gap-5">
        <View>
          <Label className="mb-1">Verify account</Label>
          <Description className="mb-3">Hint: The code is 123456</Description>
          <InputOTP
            value={value}
            onChange={setValue}
            maxLength={6}
            isInvalid={isInvalid}
          >
            <InputOTP.Group>
              <AppInputOTPSlot index={0} />
              <AppInputOTPSlot index={1} />
              <AppInputOTPSlot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <AppInputOTPSlot index={3} />
              <AppInputOTPSlot index={4} />
              <AppInputOTPSlot index={5} />
            </InputOTP.Group>
          </InputOTP>
          <FieldError className="mt-3" isInvalid={isInvalid}>
            The code you entered is incorrect.
          </FieldError>
          <AppButton
            className="self-start mt-5"
            onPress={onSubmit}
            label="Submit"
          />
        </View>
      </View>
    </View>
  );
};

const DatepickerVariants = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<Date>();
  const [datetime, setDatetime] = useState<Date>();

  return (
    <View className="flex-1 px-5">
      <View className="gap-8">
        <View className="flex-row gap-2">
          <AppDatePicker
            className="flex-1"
            label="Start date"
            mode="date"
            value={startDate}
            maximumDate={endDate}
            onValueChange={setStartDate}
            placeholder="0000/00/00"
            icon={
            <AppIcon icon={Calendar03Icon} size={22} color="#005FEE" />
            }
          />
          <AppDatePicker
            className="flex-1"
            label="End date"
            mode="date"
            value={endDate}
            minimumDate={startDate}
            onValueChange={setEndDate}
            placeholder="0000/00/00"
            icon={
              <AppIcon icon={Calendar03Icon} size={22} color="#005FEE" />
            }
          />
        </View>
        <AppDatePicker
          label="Date"
          mode="date"
          value={date}
          onValueChange={setDate}
          placeholder="Select a date"
          isInvalid={true}
          errorMessage="Date is required"
        />
        <AppDatePicker
          label="Start time"
          mode="time"
          value={time}
          onValueChange={setTime}
          icon={
            <AppIcon icon={Clock01Icon} size={22} color="#005FEE" />
          }
        />
        <AppDatePicker
          label="Appointment"
          isRequired
          mode="datetime"
          value={datetime}
          onValueChange={setDatetime}
          format="YYYY/MM/DD HH:mm"
          icon={
            <AppIcon icon={Calendar03Icon} size={22} color="#005FEE" />
          }
        />
      </View>
    </View>
  );
};

export default function ComponentsScreen() {
  const { toggleTheme, isLight } = useAppTheme();

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView className="px-4 bg-background">
        <AppButton className="self-end" onPress={() => router.navigate("/(auth)/(tabs)")} label="Back" />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Switch theme</AppText>
          <Pressable
            onPress={() => {
              toggleTheme();
            }}
          >
            {isLight ? (
              <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
                <AppIcon icon={Moon01Icon} size={28} color={"#000"} />
              </Animated.View>
            ) : (
              <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
                <AppIcon icon={Sun01Icon} size={28} color={"#fff"} />
              </Animated.View>
            )}
          </Pressable>
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Textfield</AppText>
          <BasicTextFieldContent />
          <TextFieldWithIconsContent />
          <DisabledTextFieldContent />
          <MultilineTextFieldContent />
          <TextFieldWithValidationContent />
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Date picker</AppText>
          <DatepickerVariants />
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Select</AppText>
          <SelectPresentationContent />
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Button</AppText>
          <ButtonVariantsContent />
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Calendar</AppText>
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Switch</AppText>
          <SwitchCustomStylesContent />
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Toast</AppText>
          <ToastVariantContent />
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Bottom sheet</AppText>
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Avatar</AppText>
          <AvatarVariants />
        </View>
        <Separator />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">InputOTP</AppText>
          <WithValidationOTPContent />
        </View>
        <Separator />
      </ScrollView>
    </StyledSafeAreaView>
  );
}

