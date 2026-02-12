import { View, Pressable, ScrollView, TextInput, Linking } from 'react-native';
import { useRouter } from "expo-router";
import { Avatar, cn, Separator } from "heroui-native";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft02Icon,
  Search01Icon,
  SmartPhone01Icon,
  AtIcon,
} from "@hugeicons-pro/core-stroke-standard";
import { AppTextField } from "@/components/app-text-field";

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface Contact {
  id: string;
  name: string;
  position: string;
  avatar: string;
  phone: string;
  email: string;
  hidden?: boolean;
}

interface Department {
  name: string;
  contacts: Contact[];
}

const DEPARTMENTS: Department[] = [
  {
    name: 'Санхүүгийн алба',
    contacts: [
      { id: '1', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '2', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '3', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '4', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '5', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '********', email: 'anar@amarhr.mn', hidden: true },
      { id: '11', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '********', email: 'anar@amarhr.mn', hidden: true },
      { id: '12', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '********', email: 'anar@amarhr.mn', hidden: true },
      { id: '13', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '********', email: 'anar@amarhr.mn', hidden: true },
      { id: '14', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '********', email: 'anar@amarhr.mn', hidden: true },
    ],
  },
  {
    name: 'Хүний нөөцийн хэлтэс',
    contacts: [
      { id: '6', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '7', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '8', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '9', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '10', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '18', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '15', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '16', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
      { id: '17', name: 'Жаргал.Т', position: 'Бизнес төлөвлөлтийн туслах', avatar: 'https://img.heroui.chat/image/avatar?w=400&h=400&u=2', phone: '99107744', email: 'anar@amarhr.mn' },
    ],
  },
];

const TABS = ['Алба, хэлтэс', 'Салбар, байршил'] as const;

function ContactCard({ contact, isExpanded, onToggle }: {
  contact: Contact;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View className={cn(
      '',
      isExpanded && 'bg-darkgray/5'
    )}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-1 h-12.5">
        <Avatar alt={contact.name} className="w-10 h-10">
          <Avatar.Image source={{ uri: contact.avatar }} />
          <Avatar.Fallback classNames={{ text: "text-black" }}>
            {contact.name.slice(0, 2)}
          </Avatar.Fallback>
        </Avatar>
        <View className="flex-1">
          <AppText className="text-sm">{contact.name}</AppText>
          <AppText className="text-sm text-darkgray">{contact.position}</AppText>
        </View>
      </Pressable>
      {isExpanded && (
        <View className="pt-3 pb-2">
          <Pressable
            className="flex-row items-center mb-2 gap-1"
            onPress={() => !contact.hidden && Linking.openURL(`tel:${contact.phone}`)}
          >
            <View className="w-10 items-center justify-center">
              <HugeiconsIcon icon={SmartPhone01Icon} color="#6A6A6A" size={20} />
            </View>
            <AppText className={`text-sm ${contact.hidden ? '' : 'text-blue'}`}>
              {contact.phone}
            </AppText>
          </Pressable>
          <View className="flex-row items-center">
            <View className="w-10 items-center justify-center">
              <HugeiconsIcon icon={AtIcon} color="#6A6A6A" size={20} />
            </View>
            <AppText className="text-sm">{contact.email}</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

export default function ContactScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredDepartments = DEPARTMENTS.map((dept) => ({
    ...dept,
    contacts: dept.contacts.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.position.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((dept) => dept.contacts.length > 0);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 px-4 rounded-full mb-5">
          <Pressable onPress={() => router.back()}>
            <HugeiconsIcon icon={ArrowLeft02Icon} color="#222222" size={24} />
          </Pressable>
          <AppText className="text-xl font-medium">Холбоо барих жагсаалт</AppText>
        </View>

        <View className="px-4 mb-5">
          <AppTextField
            className="rounded-full"
            placeholderTextColorClassName="red"
            leftIcon={
              <HugeiconsIcon icon={Search01Icon} color="#222222" size={20} />
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row px-4 mb-4">
          {TABS.map((tab, index) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(index)}
              className="mr-6 pb-1"
              style={activeTab === index ? { borderBottomWidth: 2, borderBottomColor: '#005FEE' } : undefined}
            >
              <AppText className={`text-sm ${activeTab === index ? 'font-medium text-black' : 'text-darkgray'}`}>
                {tab}
              </AppText>
            </Pressable>
          ))}
        </View>

        <ScrollView className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
          {filteredDepartments.map((dept) => (
            <View key={dept.name} className="mb-5">
              <View className="bg-lightblue px-4 py-2">
                <AppText className="text-sm text-darkblue text-right">{dept.name}</AppText>
              </View>

              <View className="px-4">
                {dept.contacts.map((contact, index) => (
                  <View key={contact.id}>
                    <ContactCard
                      contact={contact}
                      isExpanded={expandedId === contact.id}
                      onToggle={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                    />
                    {index < dept.contacts.length - 1 && <Separator className="bg-darkgray/12" />}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}