import { AppDialog } from "@/components/app-dialog";
import { AppHeader } from "@/components/app-header";
import { AppSelect, SelectOption } from "@/components/app-select";
import { AppSwitch } from "@/components/app-switch";
import { AppText } from "@/components/app-text";
import { AppToast } from "@/components/app-toast";
import { api } from "@/config/api";
import { useAuthStore, UserSettings } from '@/store/auth-store';
import { cancelAttendanceReminders, REMINDER_OFFSET_MINUTES, syncAttendanceReminders } from '@/utils/attendance-reminders';
import {
  Agreement03Icon, Alert01Icon, Building06StrokeStandard,
  Clock01Icon,
  InformationCircleIcon,
  LicenseIcon,
  Logout05Icon,
  Notification01Icon,
  SmartPhone01Icon,
  UserIcon
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Avatar, cn, Separator, useToast } from "heroui-native";
import React, { useState } from "react";
import { Pressable, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface MenuItemProps {
  icon: IconSvgElement;
  label: string;
  labelClassName?: string;
  subtitle?: string;
  info?: boolean;
  onInfoPress?: () => void;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

function MenuItem({ icon, label, labelClassName, subtitle, info, onInfoPress, onPress, trailing }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center h-12.5"
    >
      <View className="w-7.5 h-7.5 justify-center items-center">
        <HugeiconsIcon icon={icon} color="#222222" size={20} strokeWidth={1.5} absoluteStrokeWidth />
      </View>
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <AppText className={cn(
            'text-base font-medium',
            labelClassName
          )}>{label}</AppText>
          {info && (
            <Pressable
              onPress={onInfoPress}
              hitSlop={8}
              className="ml-2.5"
            >
              <HugeiconsIcon icon={InformationCircleIcon} color="#6a6a6a" size={22} strokeWidth={1.5} absoluteStrokeWidth />
            </Pressable>
          )}
        </View>
        {subtitle && (
          <AppText className="text-xs text-darkgray mt-0.5">{subtitle}</AppText>
        )}
      </View>
      {trailing}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profileImage, lastName, firstName, jobPosition, logout } = useAuthStore();
  const attendanceMethod = useAuthStore((state) => state.attendanceMethod);
  const allowedAttendanceMethod = useAuthStore((state) => state.allowedAttendanceMethod);
  const attendanceReminder = useAuthStore((state) => state.attendanceReminder);
  const hidePhone = useAuthStore((state) => state.hidePhone);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [infoDialog, setInfoDialog] = useState<{ title: string; description: string } | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const { toast } = useToast();

  const saveSetting = (settings: Partial<UserSettings>) => {
    useAuthStore.getState().setSettings(settings);
    api({ path: '/settings', method: 'PUT', data: settings }).then((res) => {
      if (res.status !== 200) {
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              description={res.message || 'Алдаа гарлаа'}
              icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
      }
    });
  };

  const allMethodOptions: SelectOption[] = [
    { value: 'geo', label: 'Байршил' },
    { value: 'wifi', label: 'WiFi' },
  ];
  const attendanceMethodOptions: SelectOption[] = [
    ...allMethodOptions.filter(o => allowedAttendanceMethod.includes(o.value as 'geo' | 'wifi')),
    { value: 'ask', label: 'Бүртгүүлэх болгонд асуух' },
  ];
  const selectedAttendanceMethod = attendanceMethodOptions.find(
    o => o.value === (attendanceMethod ?? 'ask')
  );

  const handleLogout = () => {
    setLogoutDialogOpen(false);
    logout();
    router.replace('/login');
  };

  const fullName = `${lastName ?? ''} ${firstName ?? ''}`.trim() || ' ';

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader backTitle="Профайл" showBack />
        <View className="items-center mt-4 mb-6">
          <Avatar alt="Profile" className="w-32.5 h-32.5">
            <Avatar.Image source={{
              uri: profileImage ?? '',
            }} />
            <Avatar.Fallback classNames={{ text: "text-black text-2xl" }}>
              {(lastName?.[0] ?? '') + (firstName?.[0] ?? '')}
            </Avatar.Fallback>
          </Avatar>
          <AppText className="text-base font-semibold mt-1">{fullName}</AppText>
          <AppText className="text-sm text-darkgray">{jobPosition}</AppText>
        </View>
        <View className="flex-1">
          <View className="flex-1 mt-2">
            <MenuItem
              icon={UserIcon}
              label="Хувийн мэдээлэл"
              onPress={() => router.navigate('/personal-info')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={Building06StrokeStandard}
              label="Ажлын байрны мэдээлэл"
              onPress={() => router.navigate('/workplace-info')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={Agreement03Icon}
              label="Гэрээ & Цалингийн мэдээлэл"
              onPress={() => router.navigate('/contract-info')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={LicenseIcon}
              label="Бусад гэрээ & дүрэм журам"
              onPress={() => router.navigate('/contract-files')}
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={Notification01Icon}
              label="Мэдэгдэл"
              info
              onInfoPress={() =>
                setInfoDialog({
                  title: 'Мэдэгдэл',
                  description:
                    `Тохиргоог идэвхжүүлснээр, ажил эхлэх, тарах цагаас ${REMINDER_OFFSET_MINUTES} минутын өмнө цагаа бүртгүүлэх сануулга тогтмол хүлээн авч байна.`,
                })
              }
              trailing={
                <AppSwitch
                  isSelected={attendanceReminder}
                  onSelectedChange={(v) =>
                    setConfirmToggle({
                      title: 'Мэдэгдэл',
                      description: v
                        ? 'Мэдэгдэл хүлээн авахаар тохируулах уу?'
                        : 'Мэдэгдэл хүлээн авахаа болих уу?',
                      onConfirm: () => {
                        saveSetting({ attendance_reminder: v });
                        if (v) {
                          syncAttendanceReminders({ force: true });
                        } else {
                          cancelAttendanceReminders();
                        }
                      },
                    })
                  }
                />
              }
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={Clock01Icon}
              label="Цаг бүртгэл"
              trailing={
                <AppSelect
                  title="Цаг бүртгэлийн арга"
                  options={attendanceMethodOptions}
                  value={selectedAttendanceMethod}
                  onValueChange={(option) => {
                    const method = option?.value === 'ask' ? null : (option?.value as 'geo' | 'wifi') ?? null;
                    saveSetting({ attendance_method: method });
                  }}
                  trigger={
                    <AppText className="text-xs text-darkgray mt-0.5">
                      {selectedAttendanceMethod?.label ?? 'Сонгох'}
                    </AppText>
                  }
                />
              }
            />
            <Separator className="bg-darkgray/12" />
            <MenuItem
              icon={SmartPhone01Icon}
              label="Дугаараа нууцлах"
              info
              onInfoPress={() =>
                setInfoDialog({
                  title: 'Дугаараа нууцлах',
                  description:
                    'Тохиргоог идэвхжүүлснээр, таны утасны дугаарыг бусад алба, хэлтсийн ажилтнуудаас нууцална.',
                })
              }
              trailing={
                <AppSwitch
                  isSelected={hidePhone}
                  onSelectedChange={(v) =>
                    setConfirmToggle({
                      title: 'Дугаараа нууцлах',
                      description: v
                        ? 'Дугаараа нууцлах уу?'
                        : 'Дугаараа нууцлахаа болих уу?',
                      onConfirm: () => saveSetting({ hide_phone: v }),
                    })
                  }
                />
              }
            />
          </View>

          <View className="mt-2 mb-2">
            <MenuItem
              icon={InformationCircleIcon}
              label="Ашиглах заавар"
            />
            <MenuItem
              icon={Logout05Icon}
              label="Апп-с гарах"
              onPress={() => setLogoutDialogOpen(true)}
            />
          </View>
        </View>
      </View>

      <AppDialog isOpen={infoDialog !== null} onOpenChange={(open) => !open && setInfoDialog(null)}>
        <View className="gap-1.5">
          <AppDialog.Title>{infoDialog?.title}</AppDialog.Title>
          <AppDialog.Description>{infoDialog?.description}</AppDialog.Description>
        </View>
      </AppDialog>

      <AppDialog
        isOpen={confirmToggle !== null}
        onOpenChange={(open) => !open && setConfirmToggle(null)}
      >
        <View className="mb-5 gap-1.5">
          <AppDialog.Title>{confirmToggle?.title}</AppDialog.Title>
          <AppDialog.Description>{confirmToggle?.description}</AppDialog.Description>
        </View>
        <View className="flex-row gap-3">
          <AppDialog.Button
            label="Үгүй"
            className="flex-1"
            onPress={() => setConfirmToggle(null)}
          />
          <AppDialog.Button
            label="Тийм"
            className="flex-1"
            onPress={() => {
              confirmToggle?.onConfirm();
              setConfirmToggle(null);
            }}
          />
        </View>
      </AppDialog>

      <AppDialog isOpen={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <View className="mb-5 gap-1.5">
          <AppDialog.Title>Апп-с гарах</AppDialog.Title>
          <AppDialog.Description>
            Та системээс гарахдаа итгэлтэй байна уу?
          </AppDialog.Description>
        </View>
        <View className="flex-row gap-3">
          <AppDialog.Button label="Үгүй" className="flex-1" onPress={() => setLogoutDialogOpen(false)} />
          <AppDialog.Button label="Тийм" className="flex-1" onPress={handleLogout} />
        </View>
      </AppDialog>
    </StyledSafeAreaView>
  );
}