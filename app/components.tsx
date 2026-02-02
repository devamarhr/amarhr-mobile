import { AppText } from "@/components/app-text";
import { AppButton } from "@/components/app-button";
import { AppTextField } from "@/components/app-text-field";
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
  FileAttachmentIcon
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Avatar,
  Button, Chip, Description, Divider, ErrorView, InputOTP, Label, ScrollShadow, Select, Spinner,
  Switch,
  Tabs,
  useThemeColor,
  useToast
} from "heroui-native";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from 'react-native';
import { useReanimatedKeyboardAnimation, useWindowDimensions } from "react-native-keyboard-controller";
import Animated, { FadeInLeft, FadeInRight, FadeOut, useAnimatedStyle, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";
import { LinearGradient } from "expo-linear-gradient";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";

const StyledHugeiconsIcon = withUniwind(HugeiconsIcon);

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
  );
};

const TextFieldWithIconsContent = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View className="flex-1 justify-center px-5 gap-3">
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
          <HugeiconsIcon
            size="20"
            color="#222222"
            icon={Search01Icon}
          />
        }
      />
    </View>
  );
};

const DisabledTextFieldContent = () => {
  return (
    <View className="flex-1 justify-center px-5">
      <View className="gap-8">
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
        multiline
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
      <View className="gap-8">
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

type CountryOption = {
  value: string;
  label: string;
  flag: string;
  code: string;
};

const COUNTRIES: CountryOption[] = [
  { value: 'US', label: 'United States', flag: '🇺🇸', code: '+1' },
  { value: 'GB', label: 'United Kingdom', flag: '🇬🇧', code: '+44' },
  { value: 'CA', label: 'Canada', flag: '🇨🇦', code: '+1' },
  { value: 'AU', label: 'Australia', flag: '🇦🇺', code: '+61' },
  { value: 'DE', label: 'Germany', flag: '🇩🇪', code: '+49' },
  { value: 'FR', label: 'France', flag: '🇫🇷', code: '+33' },
  { value: 'JP', label: 'Japan', flag: '🇯🇵', code: '+81' },
  { value: 'CN', label: 'China', flag: '🇨🇳', code: '+86' },
  { value: 'IN', label: 'India', flag: '🇮🇳', code: '+91' },
  { value: 'BR', label: 'Brazil', flag: '🇧🇷', code: '+55' },
];

const SelectPresentationContent = () => {
  const [popoverValue, setPopoverValue] = useState<CountryOption | undefined>();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [bottomSheetValue, setBottomSheetValue] = useState<
    CountryOption | undefined
  >();

  const themeColorOverlay = useThemeColor('overlay');

  return (
    <View className="flex-1 px-5 items-center justify-center">
      <View className="flex-row items-center justify-center gap-4">
        <Select
          value={popoverValue}
          onValueChange={(value) => {
            const country = COUNTRIES.find((c) => c.value === value?.value);
            setPopoverValue(country);
          }}
        >
          <Select.Trigger asChild>
            <AppButton>
              {popoverValue ? (
                <View className="flex-row items-center gap-2">
                  <AppText className="text-base">{popoverValue.flag}</AppText>
                  <AppText className="text-sm text-accent font-medium">
                    {popoverValue.code}
                  </AppText>
                </View>
              ) : (
                <AppText className="text-accent">Popover</AppText>
              )}
            </AppButton>
          </Select.Trigger>
          <Select.Portal>
            <Select.Overlay />
            <Select.Content
              width={300}
              className="aspect-[1.2]"
              presentation="popover"
              placement="top"
              align="start"
              alignOffset={-20}
            >
              <ScrollView>
                {COUNTRIES.map((country) => (
                  <Select.Item
                    key={country.value}
                    value={country.value}
                    label={country.label}
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <AppText className="text-2xl">{country.flag}</AppText>
                      <AppText className="text-sm text-muted w-10">
                        {country.code}
                      </AppText>
                      <AppText className="text-base text-foreground flex-1">
                        {country.label}
                      </AppText>
                    </View>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </ScrollView>
            </Select.Content>
          </Select.Portal>
        </Select>

        <Select
          isOpen={isBottomSheetOpen}
          onOpenChange={setIsBottomSheetOpen}
          value={bottomSheetValue}
          onValueChange={(value) => {
            const country = COUNTRIES.find((c) => c.value === value?.value);
            setBottomSheetValue(country);
          }}
        >
          <Select.Trigger asChild>
            <AppButton isDisabled={isBottomSheetOpen}>
              {bottomSheetValue ? (
                <View className="flex-row items-center gap-2">
                  <AppText className="text-base">
                    {bottomSheetValue.flag}
                  </AppText>
                  <AppText className="text-sm text-accent font-medium">
                    {bottomSheetValue.code}
                  </AppText>
                </View>
              ) : (
                <AppText className="text-accent">Sheet</AppText>
              )}
            </AppButton>
          </Select.Trigger>
          <Select.Portal>
            <Select.Overlay className="bg-black/15" />
            <Select.Content
              presentation="bottom-sheet"
              snapPoints={['35%', '50%']}
              detached
              enableDynamicSizing={false}
              enableOverDrag={false}
              backgroundClassName="bg-transparent"
              handleClassName="h-1"
              handleIndicatorClassName="w-12 h-[3px]"
              contentContainerClassName="h-full pt-1 pb-1 mx-2.5 rounded-t-[36px] border border-divider/20 bg-overlay overflow-hidden"
              contentContainerProps={{
                style: {
                  borderCurve: 'continuous',
                },
              }}
            >
              <ScrollShadow
                LinearGradientComponent={LinearGradient}
                color={themeColorOverlay}
              >
                <BottomSheetScrollView
                  contentContainerClassName="p-4"
                  showsVerticalScrollIndicator={false}
                >
                  {COUNTRIES.map((country, index) => (
                    <React.Fragment key={country.value}>
                      <Select.Item
                        value={country.value}
                        label={country.label}
                        className="py-5 px-3"
                      >
                        <View className="flex-row items-center gap-3 flex-1">
                          <AppText className="text-2xl">{country.flag}</AppText>
                          <AppText className="text-sm text-muted font-medium w-10">
                            {country.code}
                          </AppText>
                          <AppText className="text-base text-foreground flex-1">
                            {country.label}
                          </AppText>
                        </View>
                        <Select.ItemIndicator />
                      </Select.Item>
                      {index < COUNTRIES.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </BottomSheetScrollView>
              </ScrollShadow>
            </Select.Content>
          </Select.Portal>
        </Select>
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
              <HugeiconsIcon
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
              <HugeiconsIcon
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
              <HugeiconsIcon
                icon={HeartbreakIcon}
                size={24}
                color="#222222"
              />
            }
            label="Favorite"
            rightIcon={
              <HugeiconsIcon
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
                <HugeiconsIcon
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
                <HugeiconsIcon
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
  const [icon, setIcon] = React.useState(true);
  const [contentIcon, setContentIcon] = React.useState(true);
  const [contentText, setContentText] = React.useState(true);

  return (
    <View className="flex-1 px-5 items-center justify-center">
      <View className="gap-16 items-center">
        <Switch isSelected={icon} onSelectedChange={setIcon} />
        <Switch isSelected={icon} onSelectedChange={setIcon}>
          <Switch.Thumb>
            {icon ? (
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
            )}
          </Switch.Thumb>
        </Switch>

        <Switch
          isSelected={contentIcon}
          onSelectedChange={setContentIcon}
          className="w-[56px] h-[32px]"
          animation={{
            backgroundColor: {
              value: ['#172554', '#eab308'],
            },
          }}
        >
          <Switch.Thumb
            className="size-[22px]"
            animation={{
              left: {
                value: 4,
                springConfig: {
                  damping: 30,
                  stiffness: 300,
                  mass: 1,
                },
              },
            }}
          />
          <Switch.StartContent className="left-2">
            {contentIcon && (
              <Animated.View key="sun" entering={ZoomIn.springify()}>
                <StyledIonicons
                  name="sunny"
                  size={16}
                  className="text-[#854d0e]"
                />
              </Animated.View>
            )}
          </Switch.StartContent>
          <Switch.EndContent className="right-2">
            {!contentIcon && (
              <Animated.View key="moon" entering={ZoomIn.springify()}>
                <StyledIonicons
                  name="moon"
                  size={16}
                  className="text-[#dbeafe]"
                />
              </Animated.View>
            )}
          </Switch.EndContent>
        </Switch>

        <Switch
          isSelected={contentText}
          onSelectedChange={setContentText}
          className="w-[60px] h-[32px]"
          animation={{
            backgroundColor: {
              value: ['#71717a', '#16a34a'],
            },
          }}
        >
          <Switch.Thumb
            className="size-[22px]"
            animation={{
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
          />
          <Switch.StartContent className="left-3">
            {contentText && (
              <Animated.View
                key="sun"
                entering={FadeInRight.springify().duration(100)}
              >
                <AppText className="text-xs font-bold text-white">ON</AppText>
              </Animated.View>
            )}
          </Switch.StartContent>
          <Switch.EndContent className="right-2">
            {!contentText && (
              <Animated.View
                key="moon"
                entering={FadeInLeft.springify().duration(100)}
              >
                <AppText className="text-xs font-bold text-white">OFF</AppText>
              </Animated.View>
            )}
          </Switch.EndContent>
        </Switch>
      </View>
    </View>
  );
};

const TabPillContent = () => {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill">
      <Tabs.List>
        <Tabs.Indicator/>
        <Tabs.Trigger value="settings">
          <Tabs.Label>Settings</Tabs.Label>
        </Tabs.Trigger>
        <Tabs.Trigger value="profile">
          <Tabs.Label>Profile</Tabs.Label>
        </Tabs.Trigger>
        <Tabs.Trigger value="main">
          <Tabs.Label>Main</Tabs.Label>
        </Tabs.Trigger>
        <Tabs.Trigger value="other">
          <Tabs.Label>Other</Tabs.Label>
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="settings">
        <AppText>Settings</AppText>
      </Tabs.Content>
      <Tabs.Content value="profile">
        <AppText>Profile</AppText>
      </Tabs.Content>
      <Tabs.Content value="main">
        <AppText>Main</AppText>
      </Tabs.Content>
      <Tabs.Content value="other">
        <AppText>Other</AppText>
      </Tabs.Content>
    </Tabs>
  );
}

const TabLineContent = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} variant="line">
      <Tabs.List>
        <Tabs.Indicator />
        <Tabs.Trigger value="overview">
          <Tabs.Label>Overview</Tabs.Label>
        </Tabs.Trigger>
        <Tabs.Trigger value="analytics">
          <Tabs.Label>Analytics</Tabs.Label>
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="overview">
        <AppText>Overview</AppText>
      </Tabs.Content>
      <Tabs.Content value="analytics">
        <AppText>Analytics</AppText>
      </Tabs.Content>
    </Tabs>
  );
}

const TabScrollableContent = () => {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <Tabs.List>
        <Tabs.ScrollView scrollAlign="center">
          <Tabs.Indicator />
          <Tabs.Trigger value="tab1">
            <Tabs.Label>First Tab</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab2">
            <Tabs.Label>Second Tab</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab3">
            <Tabs.Label>Third Tab</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab4">
            <Tabs.Label>Fourth Tab</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger value="tab5">
            <Tabs.Label>Fifth Tab</Tabs.Label>
          </Tabs.Trigger>
        </Tabs.ScrollView>
      </Tabs.List>
      <Tabs.Content value="tab1">
        <AppText>Tab1</AppText>
      </Tabs.Content>
      <Tabs.Content value="tab2">
        <AppText>Tab2</AppText>
      </Tabs.Content>
      <Tabs.Content value="tab3">
        <AppText>Tab3</AppText>
      </Tabs.Content>
      <Tabs.Content value="tab4">
        <AppText>Tab4</AppText>
      </Tabs.Content>
      <Tabs.Content value="tab5">
        <AppText>Tab5</AppText>
      </Tabs.Content>
    </Tabs>
  );
}

const ToastVariantContent = () => {
  const { toast } = useToast();

  return (
    <View className="flex-1 px-5">
      <View className="flex-1 items-center justify-center">
        <View className="gap-4">
          <View className="flex-row gap-4 justify-center">
            <Chip variant="primary" color="accent" onPress={() => toast.show({
              variant: 'accent',
              label: 'You have upgraded your plan',
              description: 'You can continue using HeroUI Chat',
              icon: <HugeiconsIcon icon={ClosedCaptionIcon} />,
              actionLabel: 'Close',
              onActionPress: ({ hide }) => hide(),
            })}>
              Accent
            </Chip>
            <Chip variant="primary" color="default" onPress={() => toast.show({
              variant: 'default',
              label: 'You have upgraded your plan',
              description: 'You can continue using HeroUI Chat',
              icon: <HugeiconsIcon icon={ClosedCaptionIcon} />,
              actionLabel: 'Close',
              onActionPress: ({ hide }) => hide(),
            })}>
              Default
            </Chip>
            <Chip variant="primary" color="success" onPress={() => toast.show({
              variant: 'success',
              label: 'You have upgraded your plan',
              description: 'You can continue using HeroUI Chat',
              icon: <HugeiconsIcon icon={ClosedCaptionIcon} />,
              actionLabel: 'Close',
              onActionPress: ({ hide }) => hide(),
            })}>
              Success
            </Chip>
          </View>
          <View className="flex-row gap-4 justify-center">
            <Chip variant="primary" color="warning" onPress={() => toast.show({
              variant: 'warning',
              label: 'You have upgraded your plan',
              description: 'You can continue using HeroUI Chat',
              icon: <HugeiconsIcon icon={ClosedCaptionIcon} />,
              actionLabel: 'Close',
              onActionPress: ({ hide }) => hide(),
            })}>
              Warning
            </Chip>
            <Chip variant="primary" color="danger" onPress={() => toast.show({
              variant: 'danger',
              label: 'You have upgraded your plan',
              description: 'You can continue using HeroUI Chat',
              icon: <HugeiconsIcon icon={ClosedCaptionIcon} />,
              actionLabel: 'Close',
              onActionPress: ({ hide }) => hide(),
            })}>
              Danger
            </Chip>
          </View>
        </View>
      </View>
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
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>
          <ErrorView className="mt-3" isInvalid={isInvalid}>
            The code you entered is incorrect.
          </ErrorView>
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

export default function ComponentsScreen() {
  const { toggleTheme, isLight } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView className="px-4 bg-background">
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Switch theme</AppText>
          <Pressable
            onPress={() => {
              toggleTheme();
            }}
          >
            {isLight ? (
              <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
                <HugeiconsIcon icon={Moon01Icon} size={28} color={"#000"} />
              </Animated.View>
            ) : (
              <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
                <HugeiconsIcon icon={Sun01Icon} size={28} color={"#fff"} />
              </Animated.View>
            )}
          </Pressable>
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Textfield</AppText>
          <BasicTextFieldContent />
          <TextFieldWithIconsContent />
          <DisabledTextFieldContent />
          <MultilineTextFieldContent />
          <TextFieldWithValidationContent />
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Date picker</AppText>
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Colors</AppText>
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Select</AppText>
          <SelectPresentationContent />
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Button</AppText>
          <ButtonVariantsContent />
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Calendar</AppText>
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Switch</AppText>
          <SwitchCustomStylesContent />
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Tabs</AppText>
          <TabPillContent />
          <TabLineContent />
          <TabScrollableContent />
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Toast</AppText>
          <ToastVariantContent />
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Bottom sheet</AppText>
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">Avatar</AppText>
          <AvatarVariants />
        </View>
        <Divider />
        <View className="py-4 gap-y-2">
          <AppText className="text-lg font-medium">InputOTP</AppText>
          <WithValidationOTPContent />
        </View>
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
}

