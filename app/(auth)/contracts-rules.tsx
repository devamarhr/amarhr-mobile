import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { Separator } from "heroui-native";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React, { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { FileAttachmentIcon } from "@hugeicons-pro/core-stroke-standard";
import { api } from "@/config/api";

interface ContractFile {
  name: string;
  path: string;
}

interface ContractFilesResponse {
  files: ContractFile[];
}

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface DocumentItemProps {
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}

function DocumentItem({ label, disabled, onPress }: DocumentItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center h-12.5"
    >
      <View className="w-7.5 h-7.5 bg-darkgray/7 rounded-lg justify-center items-center">
        <HugeiconsIcon icon={FileAttachmentIcon} color="#959595" size={20} />
      </View>
      <AppText className={`text-sm font-medium ml-3 flex-1 ${disabled ? 'text-darkgray/50' : ''}`}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ContractsRulesScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<ContractFile[]>([]);

  useEffect(() => {
    api<ContractFilesResponse>({
      path: '/profile/contract-files',
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        setFiles(res.data.files);
      }
    }).catch(console.error);
  }, []);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader backTitle="Гэрээ & дүрэм журам" showBack />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {files.map((file, index) => (
            <React.Fragment key={index}>
              <DocumentItem
                label={file.name}
                disabled={!file.path}
                onPress={file.path ? () => router.navigate({
                  pathname: '/pdf-view',
                  params: { title: file.name, url: file.path },
                }) : undefined}
              />
              {index < files.length - 1 && <Separator className="bg-darkgray/12" />}
            </React.Fragment>
          ))}
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}