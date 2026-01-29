import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { useAppTheme } from "@/contexts/app-theme-context";
import {
  Add01Icon, ChevronLeft, ClosedCaptionIcon, Download01Icon, HeartbreakIcon,
  Home02Icon,
  LockPasswordIcon,
  Moon01Icon,
  Search01Icon,
  Sun01Icon, Trash,
  ViewIcon,
  ViewOffIcon
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Avatar,
  Button, Chip, Description, Divider, ErrorView, InputOTP, Label, ScrollShadow, Select, Spinner,
  Switch,
  Tabs, TextField,
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

const AvatarSizes = () => {
  return (
    <View className="flex-1 px-5 items-center justify-center">
      <View className="flex-row items-center justify-center gap-4">
        <Avatar size="sm" alt="Small Avatar">
          <Avatar.Image
            source={{
              uri: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=3',
            }}
          />
          <Avatar.Fallback />
        </Avatar>
        <Avatar size="md" alt="Medium Avatar">
          <Avatar.Image
            source={{
              uri: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=5',
            }}
          />
          <Avatar.Fallback>MD</Avatar.Fallback>
        </Avatar>
        <Avatar size="lg" alt="Large Avatar">
          <Avatar.Image
            source={{
              uri: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=20',
            }}
          />
          <Avatar.Fallback>LG</Avatar.Fallback>
        </Avatar>
      </View>
    </View>
  );
};

const AvatarFallback = () => {
  return (
    <View className="flex-1 px-5 items-center justify-center">
      <View className="flex-row items-center justify-center gap-3">
        <Avatar color="accent" alt="Accent">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>AC</Avatar.Fallback>
        </Avatar>
        <Avatar color="default" alt="Default">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>DF</Avatar.Fallback>
        </Avatar>
        <Avatar color="success" alt="Success">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>SC</Avatar.Fallback>
        </Avatar>
        <Avatar color="warning" alt="Warning">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>WR</Avatar.Fallback>
        </Avatar>
        <Avatar color="danger" alt="Danger">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>DG</Avatar.Fallback>
        </Avatar>
      </View>
    </View>
  );
};

const AvatarSoftFallback = () => {
  return (
    <View className="flex-1 px-5 items-center justify-center">
      <View className="flex-row items-center justify-center gap-3">
        <Avatar variant="soft" color="accent" alt="Accent">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>AC</Avatar.Fallback>
        </Avatar>
        <Avatar variant="soft" color="default" alt="Default">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>DF</Avatar.Fallback>
        </Avatar>
        <Avatar variant="soft" color="success" alt="Success">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>SC</Avatar.Fallback>
        </Avatar>
        <Avatar variant="soft" color="warning" alt="Warning">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>WR</Avatar.Fallback>
        </Avatar>
        <Avatar variant="soft" color="danger" alt="Danger">
          <Avatar.Image source={undefined} />
          <Avatar.Fallback>DG</Avatar.Fallback>
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
      <TextField isRequired>
        <TextField.Label>Email</TextField.Label>
        <TextField.Input
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField.Description>
          We'll never share your email with anyone else.
        </TextField.Description>
      </TextField>
    </View>
  );
};

const TextFieldWithIconsContent = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View className="flex-1 justify-center px-5">
      <TextField isRequired>
        <TextField.Label>Password</TextField.Label>
        <View className="w-full flex-row items-center">
          <TextField.Input
            className="flex-1 px-10"
            placeholder="Enter your password"
            secureTextEntry={!isPasswordVisible}
          />
          <StyledIonicons
            name="lock-closed-outline"
            size={16}
            className="absolute left-3.5 text-muted"
            pointerEvents="none"
          />
          <Pressable
            className="absolute right-4"
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <StyledIonicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              className="text-muted"
            />
          </Pressable>
        </View>
      </TextField>
    </View>
  );
};

const DisabledTextFieldContent = () => {
  return (
    <View className="flex-1 justify-center px-5">
      <View className="gap-8">
        <TextField>
          <TextField.Label>Account ID</TextField.Label>
          <TextField.Input
            placeholder="Enter account ID"
            value="ACC-2024-12345"
          />
          <TextField.Description>
            Your unique account identifier
          </TextField.Description>
        </TextField>

        <TextField isDisabled>
          <TextField.Label>User Role</TextField.Label>
          <TextField.Input
            placeholder="Role assignment"
            value="Administrator"
          />
          <TextField.Description>
            Contact support to change your role
          </TextField.Description>
        </TextField>
      </View>
    </View>
  );
};

const MultilineTextFieldContent = () => {
  return (
    <View className="flex-1 justify-center px-5">
      <TextField>
        <TextField.Label>Message</TextField.Label>
        <TextField.Input
          placeholder="Type your message here..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <TextField.Description>Maximum 500 characters</TextField.Description>
      </TextField>
    </View>
  );
};

const TextFieldWithValidationContent = () => {
  const [isTestFieldInvalid, setIsTestFieldInvalid] = useState(false);
  const [testFieldValue, setTestFieldValue] = useState('');

  return (
    <View className="flex-1 justify-center px-5">
      <View className="gap-8">
        <TextField isRequired isInvalid={isTestFieldInvalid}>
          <TextField.Label>Promo Code</TextField.Label>
          <TextField.Input
            placeholder="Enter promo code"
            value={testFieldValue}
            onChangeText={setTestFieldValue}
            autoCapitalize="characters"
          />
          <TextField.Description>
            Enter a valid code to receive discount
          </TextField.Description>
          <TextField.ErrorMessage>
            This promo code is invalid or has expired
          </TextField.ErrorMessage>
        </TextField>
        <Button
          onPress={() => setIsTestFieldInvalid(!isTestFieldInvalid)}
          variant="secondary"
          size="sm"
          className="self-start"
        >
          {isTestFieldInvalid ? 'Clear Error' : 'Simulate Error'}
        </Button>
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
            <Button variant="secondary">
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
            </Button>
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
            <Button variant="secondary" isDisabled={isBottomSheetOpen}>
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
            </Button>
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
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="danger-soft">Danger Soft</Button>
          <Button isDisabled>
            <Spinner size="sm" />
            <Button.Label>Loading</Button.Label>
          </Button>
          <Button variant="secondary" isDisabled>
            <Spinner size="sm" />
            <Button.Label>Loading</Button.Label>
          </Button>
          <Button variant="tertiary" isDisabled>
            <HugeiconsIcon
              icon={Home02Icon}
              size={16}
              className="text-muted"
            />
            <Button.Label>Access Denied</Button.Label>
          </Button>
          <Button variant="primary">
            <HugeiconsIcon
              icon={Add01Icon}
              size={20}
              className="text-accent-foreground"
            />
            <Button.Label>Add Item</Button.Label>
          </Button>
          <Button variant="secondary">
            <Button.Label>Download</Button.Label>
            <HugeiconsIcon
              icon={Download01Icon}
              size={18}
              className="text-accent-soft-foreground"
            />
          </Button>
          <Button variant="tertiary">
            <HugeiconsIcon
              icon={HeartbreakIcon}
              size={14}
              className="text-default-foreground"
            />
            <Button.Label>Favorite</Button.Label>
            <HugeiconsIcon
              icon={ChevronLeft}
              size={18}
              className="text-default-foreground"
            />
          </Button>
          <Button variant="danger" size="sm">
            <HugeiconsIcon
              icon={Trash}
              size={14}
              className="text-danger-foreground"
            />
            <Button.Label>Delete</Button.Label>
          </Button>
          <Button size="sm" isIconOnly>
            <Button.Label>
              <HugeiconsIcon
                icon={Add01Icon}
                size={16}
                className="text-accent-foreground"
              />
            </Button.Label>
          </Button>
          <Button size="md" variant="secondary" isIconOnly>
            <Button.Label>
              <HugeiconsIcon
                icon={HeartbreakIcon}
                size={18}
                className="text-pink-500"
              />
            </Button.Label>
          </Button>
          <Button size="lg" variant="danger" isIconOnly>
            <Button.Label>
              <HugeiconsIcon
                icon={Trash}
                size={20}
                className="text-danger-foreground"
              />
            </Button.Label>
          </Button>
        </View>
      </View>
    </View>
  );
};

const ChipSizesContent = () => {
  return (
    <View className="flex-1 px-5">
      <View className="flex-1 items-center justify-center">
        <View className="flex-row items-center gap-4">
          <Chip size="sm">Small</Chip>
          <Chip size="md">Medium</Chip>
          <Chip size="lg">Large</Chip>
        </View>
      </View>
    </View>
  );
};

const ChipVariantsContent = () => {
  return (
    <View className="flex-1 px-5">
      <View className="flex-1 items-center justify-center gap-4">
        <Chip variant="primary" className="self-center">
          Primary
        </Chip>
        <Chip variant="secondary" className="self-center">
          Secondary
        </Chip>
        <Chip variant="tertiary" className="self-center">
          Tertiary
        </Chip>
        <Chip variant="soft" className="self-center">
          Soft
        </Chip>
      </View>
    </View>
  );
};

const ChipPrimaryVariantColorsContent = () => {
  return (
    <View className="flex-1 px-5">
      <View className="flex-1 items-center justify-center">
        <View className="gap-4">
          <View className="flex-row gap-4 justify-center">
            <Chip variant="primary" color="accent">
              Accent
            </Chip>
            <Chip variant="primary" color="default">
              Default
            </Chip>
            <Chip variant="primary" color="success">
              Success
            </Chip>
          </View>
          <View className="flex-row gap-4 justify-center">
            <Chip variant="primary" color="warning">
              Warning
            </Chip>
            <Chip variant="primary" color="danger">
              Danger
            </Chip>
          </View>
        </View>
      </View>
    </View>
  );
};

const ChipSecondaryVariantColorsContent = () => {
  return (
    <View className="flex-1 px-5">
      <View className="flex-1 items-center justify-center">
        <View className="gap-4">
          <View className="flex-row gap-4 justify-center">
            <Chip variant="secondary" color="accent">
              Accent
            </Chip>
            <Chip variant="secondary" color="default">
              Default
            </Chip>
            <Chip variant="secondary" color="success">
              Success
            </Chip>
          </View>
          <View className="flex-row gap-4 justify-center">
            <Chip variant="secondary" color="warning">
              Warning
            </Chip>
            <Chip variant="secondary" color="danger">
              Danger
            </Chip>
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
          <Button
            variant="secondary"
            className="self-start mt-5"
            onPress={onSubmit}
          >
            Submit
          </Button>
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
        <View className="my-2 gap-y-2">
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
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Textfield</AppText>
          <BasicTextFieldContent />
          <TextFieldWithIconsContent />
          <DisabledTextFieldContent />
          <MultilineTextFieldContent />
          <TextFieldWithValidationContent />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Date picker</AppText>
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Colors</AppText>
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Select</AppText>
          <SelectPresentationContent />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Button</AppText>
          <ButtonVariantsContent />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Chip</AppText>
          <ChipSizesContent />
          <ChipVariantsContent />
          <ChipPrimaryVariantColorsContent />
          <ChipSecondaryVariantColorsContent />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Calendar</AppText>
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Switch</AppText>
          <SwitchCustomStylesContent />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Tabs</AppText>
          <TabPillContent />
          <TabLineContent />
          <TabScrollableContent />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Toast</AppText>
          <ToastVariantContent />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Bottom sheet</AppText>
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">Avatar</AppText>
          <AvatarSizes />
          <AvatarFallback />
          <AvatarSoftFallback />
        </View>
        <Divider />
        <View className="my-2 gap-y-2">
          <AppText className="text-lg font-medium">InputOTP</AppText>
          <WithValidationOTPContent />
        </View>
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
}

