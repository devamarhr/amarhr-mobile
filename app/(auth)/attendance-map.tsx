import { AppButton } from '@/components/app-button';
import { AppHeader } from '@/components/app-header';
import { AppText } from '@/components/app-text';
import { AppToast } from '@/components/app-toast';
import { api } from '@/config/api';
import { syncAttendanceReminders } from '@/utils/attendance-reminders';
import { Alert01Icon, CheckmarkCircle02Icon } from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface Workplace {
  branch_name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

// Fallback region (Ulaanbaatar) so the map can render before the current
// location is available; the camera animates to the user once it's obtained.
const DEFAULT_REGION = {
  latitude: 47.9184676,
  longitude: 106.9177016,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestWorkplace(
  latitude: number,
  longitude: number,
  workplaces: Workplace[]
): { workplace: Workplace; distance: number } | null {
  if (workplaces.length === 0) return null;

  let nearest = workplaces[0];
  let minDistance = getDistanceMeters(latitude, longitude, nearest.latitude, nearest.longitude);

  for (let i = 1; i < workplaces.length; i++) {
    const d = getDistanceMeters(latitude, longitude, workplaces[i].latitude, workplaces[i].longitude);
    if (d < minDistance) {
      minDistance = d;
      nearest = workplaces[i];
    }
  }

  return { workplace: nearest, distance: minDistance };
}

export default function AttendanceMapScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);
  const [nearestWorkplace, setNearestWorkplace] = useState<Workplace | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const workplacesRef = useRef<Workplace[]>([]);
  workplacesRef.current = workplaces;

  useEffect(() => {
    api<Workplace[]>({ path: '/timesheet/locations', method: 'GET' })
      .then((res) => {
        if (res.status >= 200 && res.status < 300 && Array.isArray(res.data)) {
          setWorkplaces(res.data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }

      const updateLocation = (location: Location.LocationObject) => {
        const { latitude, longitude } = location.coords;
        setUserLocation({ latitude, longitude });

        const result = findNearestWorkplace(latitude, longitude, workplacesRef.current);
        if (result) {
          setNearestWorkplace(result.workplace);
          setIsInsideGeofence(result.distance <= result.workplace.radius);
        } else {
          setNearestWorkplace(null);
          setIsInsideGeofence(false);
        }
      };

      // Get initial position immediately
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      updateLocation(initialLocation);

      // Then watch for changes
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1,
          timeInterval: 1000,
        },
        updateLocation
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    const result = findNearestWorkplace(userLocation.latitude, userLocation.longitude, workplaces);
    if (result) {
      setNearestWorkplace(result.workplace);
      setIsInsideGeofence(result.distance <= result.workplace.radius);
    } else {
      setNearestWorkplace(null);
      setIsInsideGeofence(false);
    }
  }, [workplaces, userLocation]);

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      },
      { duration: 500 }
    );
  }, [userLocation]);

  const [isPunching, setIsPunching] = useState(false);

  const handleClockIn = async () => {
    if (!userLocation || !nearestWorkplace || isPunching) return;
    setIsPunching(true);
    const res = await api<{ warning?: string | null }>({
      path: '/timesheet/punch',
      method: 'POST',
      data: {
        attendance_method: 'geo',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
    });
    setIsPunching(false);
    console.log(JSON.stringify(res.data))

    if (res.status == 200) {
      toast.show({
        component: (props) => (
          <AppToast
            {...props}
            variant="success"
            description="Амжилттай цагаа бүртгүүллээ"
            icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
            iconContainerClassName="justify-center"
          />
        ),
      });
      syncAttendanceReminders({ force: true });
      router.back();
    } else {
      toast.show({
        component: (props) => (
          <AppToast
            {...props}
            variant="danger"
            description={res.message || 'Цаг бүртгэх үед алдаа гарлаа.'}
            icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
          />
        ),
      });
    }
  };

  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <AppHeader backTitle="Байршил" className="px-4" showBack />

      {permissionDenied ? (
        <View className="flex-1 items-center justify-center px-4">
          <AppText className="text-sm text-center text-darkgray">
            Байршлын зөвшөөрөл олгоно уу
          </AppText>
        </View>
      ) : (
        <View className="flex-1">
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton
            followsUserLocation
          >
            {workplaces.map((wp, index) => (
              <React.Fragment key={index}>
                <Circle
                  center={{ latitude: wp.latitude, longitude: wp.longitude }}
                  radius={wp.radius}
                  fillColor="rgba(0, 95, 238, 0.1)"
                  strokeColor="rgba(0, 95, 238, 0.4)"
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
                  title={wp.branch_name}
                />
              </React.Fragment>
            ))}
          </MapView>

          <View
            className="absolute bottom-0 left-0 right-0 p-4"
            style={{ paddingBottom: insets.bottom + 16 + 56 }}
          >
            <AppButton
              label="Бүртгүүлэх"
              onPress={handleClockIn}
              isDisabled={!isInsideGeofence || !userLocation}
              isLoading={isPunching}
              spinnerColor="#005FEE"
              className="h-[44px] bg-lightblue border-lightblue disabled:bg-gray/20 disabled:border-gray/20 disabled:opacity-100"
              labelClassName="text-blue text-base font-semibold disabled:text-gray"
              style={{
                shadowColor: '#005FEE',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 4,
              }}
            />
          </View>
        </View>
      )}
    </StyledSafeAreaView>
  );
}