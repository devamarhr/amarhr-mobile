import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from '@/components/app-header';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { AppToast } from '@/components/app-toast';
import { useToast } from 'heroui-native';
import { HugeiconsIcon } from "@hugeicons/react-native";
import { CheckmarkCircle02Icon } from "@hugeicons-pro/core-stroke-standard";

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface Workplace {
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

// TODO: Replace with actual workplace data from API
const WORKPLACES: Workplace[] = [
  {
    name: 'Galaxy tower',
    latitude: 47.904563,
    longitude: 106.919497,
    radius: 20,
  },
  {
    name: 'Narkhan',
    latitude: 47.904001,
    longitude: 106.925967,
    radius: 20,
  },
];

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

        const result = findNearestWorkplace(latitude, longitude, WORKPLACES);
        if (result) {
          setNearestWorkplace(result.workplace);
          setIsInsideGeofence(result.distance <= result.workplace.radius);
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
          distanceInterval: 5,
        },
        updateLocation
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleClockIn = () => {
    if (!userLocation || !nearestWorkplace) return;
    console.log('Clock in via location:', userLocation, 'at:', nearestWorkplace.name);
    // TODO: Send location to API
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
    router.back();
  };

  const initialRegion = WORKPLACES.length > 0
    ? {
        latitude: WORKPLACES[0].latitude,
        longitude: WORKPLACES[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 47.9184676,
        longitude: 106.9177016,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top']}>
      <AppHeader backTitle="Байршил" className="px-4" showBack />

      {permissionDenied ? (
        <View className="flex-1 items-center justify-center px-4">
          <AppText className="text-center text-darkgray">
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
            {WORKPLACES.map((wp, index) => (
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
                  title={wp.name}
                />
              </React.Fragment>
            ))}
          </MapView>

          <View className="absolute bottom-0 left-0 right-0 p-4" style={{ paddingBottom: insets.bottom + 16 }}>
            <AppButton
              label="Ирлээ"
              onPress={handleClockIn}
              isDisabled={!isInsideGeofence || !userLocation}
              className={!isInsideGeofence || !userLocation ? 'opacity-75' : ''}
            />
          </View>
        </View>
      )}
    </StyledSafeAreaView>
  );
}