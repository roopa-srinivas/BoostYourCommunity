import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Coordinates, NearbyNeed } from "@/api/needs";
import { NeedCard } from "@/components/need-card";
import { ThemedText } from "@/components/themed-text";
import { FontFamily, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { lower } from "@/lib/format";

type NeedsMapProps = {
  center: Coordinates;
  /** How far the donor will travel; drawn as a circle and used for the zoom. */
  radiusMeters: number;
  needs: NearbyNeed[];
  selectedOrganizationId: string | null;
  onSelectOrganization: (organizationId: string | null) => void;
};

/**
 * One pin per organization; tapping a pin filters the list to its needs.
 * Tapping anywhere else on the map (or the expand button) opens it full screen.
 */
export function NeedsMap(props: NeedsMapProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <PinMap
        {...props}
        style={styles.small}
        controlsTop={Spacing.two + 44}
        onPressMap={() => setExpanded(true)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="expand the map"
        hitSlop={8}
        onPress={() => setExpanded(true)}
        style={[
          styles.expand,
          {
            backgroundColor: theme.backgroundElement,
            boxShadow: `0 1px 3px ${theme.shadow}`,
          },
        ]}
      >
        <SymbolView
          name={{
            ios: "arrow.up.left.and.arrow.down.right",
            android: "open_in_full",
            web: "open_in_full",
          }}
          size={16}
          tintColor={theme.text}
        />
      </Pressable>
      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setExpanded(false)}
      >
        <FullScreenMap {...props} onClose={() => setExpanded(false)} />
      </Modal>
    </View>
  );
}

function FullScreenMap({
  onClose,
  ...props
}: NeedsMapProps & { onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const selectedNeeds = props.needs.filter(
    (need) => need.organization_id === props.selectedOrganizationId,
  );
  const selected = selectedNeeds[0];

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <PinMap
        {...props}
        style={styles.fill}
        controlsTop={insets.top + Spacing.two}
        onPressMap={() => props.onSelectOrganization(null)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="close the map"
        hitSlop={8}
        onPress={onClose}
        style={[
          styles.close,
          {
            top: insets.top + Spacing.two,
            backgroundColor: theme.backgroundElement,
            boxShadow: `0 1px 3px ${theme.shadow}`,
          },
        ]}
      >
        <SymbolView
          name={{ ios: "xmark", android: "close", web: "close" }}
          size={18}
          tintColor={theme.text}
        />
      </Pressable>

      {selected ? (
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + Spacing.three,
              backgroundColor: theme.background,
              boxShadow: `0 -2px 8px ${theme.shadow}`,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <ThemedText
              type="sectionTitle"
              style={styles.flex}
              numberOfLines={1}
            >
              {lower(selected.organization_name)}
            </ThemedText>
            <ThemedText
              type="link"
              accessibilityRole="link"
              onPress={() => {
                onClose();
                router.push({
                  pathname: "/org/[id]",
                  params: { id: selected.organization_id },
                });
              }}
            >
              their page ›
            </ThemedText>
          </View>
          <ScrollView contentContainerStyle={styles.sheetList}>
            {selectedNeeds.map((need) => (
              <NeedCard
                key={need.need_id}
                need={need}
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: "/need/[id]",
                    params: { id: need.need_id },
                  });
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View
          style={[
            styles.hint,
            {
              bottom: insets.bottom + Spacing.four,
              backgroundColor: theme.backgroundElement,
            },
          ]}
        >
          <ThemedText type="small">tap a pin to see what they need</ThemedText>
        </View>
      )}
    </View>
  );
}

const METERS_PER_DEGREE_LATITUDE = 111_000;

function PinMap({
  center,
  radiusMeters,
  needs,
  selectedOrganizationId,
  onSelectOrganization,
  onPressMap,
  style,
  controlsTop,
}: NeedsMapProps & {
  onPressMap: () => void;
  style: StyleProp<ViewStyle>;
  /** Where the recenter button sits from the top, clear of other controls. */
  controlsTop: number;
}) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const organizations = useMemo(() => {
    const byId = new Map<
      string,
      {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
        count: number;
      }
    >();
    for (const need of needs) {
      const existing = byId.get(need.organization_id);
      if (existing) existing.count += 1;
      else
        byId.set(need.organization_id, {
          id: need.organization_id,
          name: lower(need.organization_name),
          latitude: need.org_lat,
          longitude: need.org_lng,
          count: 1,
        });
    }
    return [...byId.values()];
  }, [needs]);

  // Show the whole travel circle with a little room around it.
  const delta = ((radiusMeters * 2) / METERS_PER_DEGREE_LATITUDE) * 1.15;
  const home = { ...center, latitudeDelta: delta, longitudeDelta: delta };

  return (
    <View style={style}>
      <MapView
        ref={mapRef}
        // Re-center when the search location or distance changes (e.g. switching to San Francisco).
        key={`${center.latitude},${center.longitude},${radiusMeters}`}
        style={styles.fill}
        initialRegion={home}
        showsUserLocation
        onPress={(event) => {
          // Android reports marker taps as map presses too.
          if (event.nativeEvent.action !== "marker-press") onPressMap();
        }}
      >
        <Circle
          center={center}
          radius={radiusMeters}
          strokeWidth={2}
          strokeColor={theme.tint}
          fillColor={`${theme.tint}14`}
        />
        {organizations.map((organization) => (
          <Marker
            key={organization.id}
            coordinate={{
              latitude: organization.latitude,
              longitude: organization.longitude,
            }}
            title={organization.name}
            description={`${organization.count} open ${organization.count === 1 ? "need" : "needs"}`}
            onPress={() => onSelectOrganization(organization.id)}
          >
            {/* Terracotta pin with the number of open needs; green when selected. */}
            <View
              style={[
                styles.pin,
                {
                  backgroundColor:
                    organization.id === selectedOrganizationId
                      ? theme.tint
                      : theme.accent,
                  borderColor: theme.backgroundElement,
                },
              ]}
            >
              <ThemedText style={[styles.pinLabel, { color: theme.onAccent }]}>
                {organization.count}
              </ThemedText>
            </View>
          </Marker>
        ))}
      </MapView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="recenter the map"
        hitSlop={8}
        onPress={() => mapRef.current?.animateToRegion(home, 400)}
        style={[
          styles.recenter,
          {
            top: controlsTop,
            backgroundColor: theme.backgroundElement,
            boxShadow: `0 1px 3px ${theme.shadow}`,
          },
        ]}
      >
        <SymbolView
          name={{
            ios: "location.fill",
            android: "my_location",
            web: "my_location",
          }}
          size={16}
          tintColor={theme.tint}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  small: { height: 240, borderRadius: Radius.card, overflow: "hidden" },
  fill: { flex: 1 },
  flex: { flex: 1 },
  expand: {
    position: "absolute",
    top: Spacing.two,
    right: Spacing.two,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  recenter: {
    position: "absolute",
    right: Spacing.two,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    position: "absolute",
    left: Spacing.three,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "50%",
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    gap: Spacing.two,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.two,
  },
  sheetList: { gap: Spacing.two },
  hint: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  pinLabel: { fontFamily: FontFamily.bold, fontSize: 14, lineHeight: 18 },
});
