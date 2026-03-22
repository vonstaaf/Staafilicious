import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WorkaholicTheme } from "../theme";
import { ProjectsContext } from "../context/ProjectsContext";
import { CompanyContext } from "../context/CompanyContext";
import { useCompanyMembers } from "../hooks/useCompanyMembers";
import AppHeader from "../components/AppHeader";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { sendPushNotification } from "../utils/pushService";

const DAY_NAMES = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const HOURS_START = 7;
const HOURS_END = 16;
const SLOT_INTERVAL = 15; // minuter
const CELL_HEIGHT = 40;

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    days.push(dayDate);
  }
  return days;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/** Konverterar "07:15" eller "9:30" till minuter från midnatt */
function timeToMinutes(timeStr) {
  const [h, m = 0] = String(timeStr).split(":").map(Number);
  return h * 60 + m;
}

/** Genererar alla tidsluckor 7:00–15:45 med 15-min intervall (sista slot slutar 16:00) */
function getTimeSlots() {
  const slots = [];
  for (let h = HOURS_START; h < HOURS_END; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push({ label, minutes: h * 60 + m });
    }
  }
  return slots;
}

/** Validerar och normaliserar tidssträng (HH:mm eller H:mm) */
function parseTime(str) {
  const s = String(str).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toDateStr(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

async function notifyBookingChange(companyId, targetUserId, title, body, extra = {}) {
  try {
    if (!companyId || !targetUserId) return;
    const userRef = doc(db, "users", targetUserId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const token = data.pushToken || data.expoPushToken || null;
    if (!token) return;
    await sendPushNotification(token, title, body, {
      type: "schedule_update",
      companyId,
      userId: targetUserId,
      ...extra,
    });
  } catch (e) {
    // swallow – push får inte krascha planeringsflödet
  }
}

export default function PlaneringScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { companyId, user: authUser } = React.useContext(CompanyContext);
  const { createProject } = React.useContext(ProjectsContext);
  const { members, loading: membersLoading } = useCompanyMembers(companyId);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState(authUser?.uid ?? null);
  const [memberPickerVisible, setMemberPickerVisible] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({
    dayIndex: 0,
    startTime: "08:00",
    endTime: "09:00",
    title: "",
    description: "",
    assignedToUserId: null,
  });

  const weekDays = useMemo(() => getWeekRange(currentDate), [currentDate]);
  const weekNum = getWeekNumber(currentDate);
  const year = currentDate.getFullYear();
  const weekStartStr = useMemo(() => toDateStr(weekDays[0]), [weekDays]);
  const weekEndStr = useMemo(() => toDateStr(weekDays[6]), [weekDays]);

  useEffect(() => {
    if (authUser?.uid && !selectedUserId) setSelectedUserId(authUser.uid);
  }, [authUser?.uid, selectedUserId]);

  useEffect(() => {
    if (!members.length) return;
    const isInMembers = members.some((m) => m.uid === selectedUserId);
    if (!isInMembers) setSelectedUserId(members[0].uid);
  }, [members]);

  const selectedMember = useMemo(
    () => members.find((m) => m.uid === selectedUserId),
    [members, selectedUserId]
  );

  useEffect(() => {
    if (!companyId || !selectedUserId) {
      setBookings([]);
      setBookingsLoading(false);
      return;
    }
    setBookingsLoading(true);
    const ref = collection(db, "companies", companyId, "users", selectedUserId, "scheduleBookings");
    const q = query(
      ref,
      where("date", ">=", weekStartStr),
      where("date", "<=", weekEndStr)
    );
    const unsub = onSnapshot(q, (snap) => {
      const weekStart = weekDays[0].getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const dateStr = d.date || "";
        const dateTime = dateStr ? new Date(dateStr + "T12:00:00").getTime() : weekStart;
        const dayIndex = Math.round((dateTime - weekStart) / dayMs);
        const clamped = Math.max(0, Math.min(6, dayIndex));
        return {
          id: docSnap.id,
          dayIndex: clamped,
          startTime: d.startTime || "08:00",
          endTime: d.endTime || "09:00",
          title: d.title || "",
          description: d.description || "",
          projectId: d.projectId || null,
          date: d.date,
        };
      });
      setBookings(list);
      setBookingsLoading(false);
    }, () => setBookingsLoading(false));
    return () => unsub();
  }, [companyId, selectedUserId, weekStartStr, weekEndStr, weekDays]);

  const goToPrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const timeSlots = useMemo(() => getTimeSlots(), []);

  const getBookingsForDay = useCallback(
    (dayIndex) => bookings.filter((b) => b.dayIndex === dayIndex),
    [bookings]
  );

  const getBookingAtSlot = (dayIndex, slotMinutes) => {
    const bookings = getBookingsForDay(dayIndex);
    const slotEnd = slotMinutes + SLOT_INTERVAL;
    return bookings.find((b) => {
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);
      return slotMinutes < end && slotEnd > start;
    });
  };

  const isSlotStartOfBooking = (slotMinutes, booking) => {
    const startMin = timeToMinutes(booking.startTime);
    const firstSlot = Math.floor(startMin / SLOT_INTERVAL) * SLOT_INTERVAL;
    return slotMinutes === firstSlot;
  };

  const openEdit = (booking) => {
    setEditingBooking(booking);
    setEditForm({
      dayIndex: booking.dayIndex,
      startTime: booking.startTime,
      endTime: booking.endTime,
      title: booking.title || "",
      description: booking.description || "",
      assignedToUserId: selectedUserId,
    });
    setEditModalVisible(true);
  };

  const openNewBooking = () => {
    setEditingBooking(null);
    const today = new Date();
    const dayIdx = weekDays.findIndex(
      (d) => d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
    );
    setEditForm({
      dayIndex: dayIdx >= 0 ? dayIdx : 0,
      startTime: "08:00",
      endTime: "09:00",
      title: "",
      description: "",
      assignedToUserId: selectedUserId,
    });
    setEditModalVisible(true);
  };

  const closeEdit = () => {
    setEditModalVisible(false);
    setEditingBooking(null);
  };

  const saveEdit = async () => {
    const start = parseTime(editForm.startTime);
    const end = parseTime(editForm.endTime);
    if (!start || !end) {
      Alert.alert("Ogiltig tid", "Ange tid som HH:mm, t.ex. 07:15 eller 10:00.");
      return;
    }
    if (timeToMinutes(start) >= timeToMinutes(end)) {
      Alert.alert("Ogiltig tid", "Sluttid måste vara efter starttid.");
      return;
    }
    if (editForm.dayIndex < 0 || editForm.dayIndex > 6) {
      Alert.alert("Ogiltig dag", "Välj en dag i veckan.");
      return;
    }
    const targetUserId = editForm.assignedToUserId || selectedUserId;
    if (!companyId || !targetUserId || !auth?.currentUser?.uid) {
      Alert.alert("Fel", "Du måste vara inloggad och kopplad till ett företag.");
      return;
    }

    const title = (editForm.title || "").trim() || "Namnlös bokning";
    const description = (editForm.description || "").trim();
    const dateStr = toDateStr(weekDays[editForm.dayIndex]);
    const payload = {
      date: dateStr,
      startTime: start,
      endTime: end,
      title,
      description,
      projectId: editingBooking?.projectId ?? null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingBooking) {
        const isMove = targetUserId !== selectedUserId;
        if (isMove) {
          const bookingRef = doc(db, "companies", companyId, "users", selectedUserId, "scheduleBookings", editingBooking.id);
          await deleteDoc(bookingRef);
          const toRef = collection(db, "companies", companyId, "users", targetUserId, "scheduleBookings");
          const newDocRef = await addDoc(toRef, {
            ...payload,
            createdBy: auth.currentUser.uid,
            createdAt: serverTimestamp(),
          });
          await notifyBookingChange(
            companyId,
            targetUserId,
            "Ny bokning i din planering",
            `${title} ${dateStr} kl ${start}–${end}`,
            { bookingId: newDocRef.id, date: dateStr, startTime: start, endTime: end }
          );
        } else {
          const bookingRef = doc(db, "companies", companyId, "users", selectedUserId, "scheduleBookings", editingBooking.id);
          await updateDoc(bookingRef, payload);
          if (targetUserId !== auth.currentUser.uid) {
            await notifyBookingChange(
              companyId,
              targetUserId,
              "Uppdaterad bokning i din planering",
              `${title} ${dateStr} kl ${start}–${end}`,
              { bookingId: editingBooking.id, date: dateStr, startTime: start, endTime: end }
            );
          }
        }
      } else {
        const ref = collection(db, "companies", companyId, "users", targetUserId, "scheduleBookings");
        let projectId = null;
        try {
          const project = await createProject(title);
          projectId = project?.id ?? null;
        } catch (_) {}
        const newDocRef = await addDoc(ref, {
          date: dateStr,
          startTime: start,
          endTime: end,
          title,
          description,
          projectId,
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
        if (targetUserId !== auth.currentUser.uid) {
          await notifyBookingChange(
            companyId,
            targetUserId,
            "Ny bokning i din planering",
            `${title} ${dateStr} kl ${start}–${end}`,
            { bookingId: newDocRef.id, date: dateStr, startTime: start, endTime: end }
          );
        }
      }
      closeEdit();
    } catch (err) {
      Alert.alert("Kunde inte spara", err?.message || "Försök igen.");
    }
  };

  const deleteBooking = () => {
    if (!editingBooking) return;
    Alert.alert("Ta bort bokning?", editingBooking.title, [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Ta bort",
        style: "destructive",
        onPress: async () => {
          if (!companyId || !selectedUserId) return;
          try {
            const bookingRef = doc(
              db,
              "companies",
              companyId,
              "users",
              selectedUserId,
              "scheduleBookings",
              editingBooking.id
            );
            await deleteDoc(bookingRef);
            if (selectedUserId !== auth.currentUser?.uid) {
              await notifyBookingChange(
                companyId,
                selectedUserId,
                "Bokning borttagen",
                editingBooking.title || "En bokning i din planering har tagits bort",
                { bookingId: editingBooking.id, date: editingBooking.date }
              );
            }
            closeEdit();
          } catch (err) {
            Alert.alert("Kunde inte ta bort", err?.message || "Försök igen.");
          }
        },
      },
    ]);
  };

  if (!companyId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <Text style={styles.placeholderText}>Koppla till ett företag för att se planeringen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <AppHeader title="PLANERING" showBackButton={false} navigation={navigation} />
      <View style={[styles.pageHeader, { paddingTop: 12 }]}>
        <TouchableOpacity
          style={styles.memberPickerRow}
          onPress={() => setMemberPickerVisible(true)}
          disabled={membersLoading}
        >
          <Ionicons name="person-outline" size={18} color="#555" />
          <Text style={styles.memberPickerLabel}>
            {membersLoading
              ? "Laddar..."
              : selectedMember
                ? `Planering för ${selectedMember.displayName || selectedMember.email || selectedUserId}`
                : "Välj anställd"}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#555" />
        </TouchableOpacity>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={goToPrevWeek} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.weekLabel}>
            <Text style={styles.weekText}>Vecka {weekNum}, {year}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
      </View>

      {bookingsLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} />
          <Text style={styles.loadingText}>Laddar bokningar...</Text>
        </View>
      )}

      {/* Dag-rubriker – 40px spacer så kolumnerna livar med tidsgridet */}
      <View style={styles.dayHeaders}>
        <View style={styles.dayHeaderSpacer} />
        {weekDays.map((day, i) => (
          <View key={i} style={styles.dayHeader}>
            <Text style={styles.dayName}>{DAY_NAMES[i]}</Text>
            <Text style={styles.dayDate}>{day.getDate()}</Text>
            <Text style={styles.dayMonth}>
              {day.toLocaleDateString("sv-SE", { month: "short" })}
            </Text>
          </View>
        ))}
      </View>

      {/* Veckovy med tidsluckor */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tid-kolumn + dag-kolumner */}
        <View style={styles.grid}>
          {timeSlots.map((slot, slotIdx) => (
            <View key={slotIdx} style={styles.timeRow}>
              <View style={styles.timeCell}>
                <Text style={styles.timeText}>{slot.label}</Text>
              </View>
              <View style={styles.daysRow}>
                {weekDays.map((day, dayIdx) => {
                  const booking = getBookingAtSlot(dayIdx, slot.minutes);
                  const isStart = booking && isSlotStartOfBooking(slot.minutes, booking);

                  return (
                    <TouchableOpacity
                      key={`${dayIdx}-${slotIdx}`}
                      style={[
                        styles.cell,
                        booking && styles.cellWithBooking,
                      ]}
                      onPress={booking ? () => openEdit(booking) : undefined}
                      activeOpacity={booking ? 0.7 : 1}
                      disabled={!booking}
                    >
                      {isStart && booking && (
                        <View style={styles.bookingBlock}>
                          <Text style={styles.bookingTitle} numberOfLines={1}>
                            {booking.title}
                          </Text>
                          <Text style={styles.bookingTime}>
                            {booking.startTime}–{booking.endTime}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB för ny bokning */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        activeOpacity={0.8}
        onPress={openNewBooking}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modal: redigera / ny bokning */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeEdit}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingBooking ? "Redigera bokning" : "Ny bokning"}
            </Text>

            <Text style={styles.modalLabel}>Titel</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.title}
              onChangeText={(t) => setEditForm((f) => ({ ...f, title: t }))}
              placeholder="T.ex. Villa Storgatan"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Beskrivning av jobbet</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={editForm.description}
              onChangeText={(t) => setEditForm((f) => ({ ...f, description: t }))}
              placeholder="Vad ska göras, plats, övrig info..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            {members.length > 1 && (
              <>
                <Text style={styles.modalLabel}>Tilldelad anställd</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assignedScroll}>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.uid}
                      style={[
                        styles.assignedChip,
                        editForm.assignedToUserId === m.uid && styles.assignedChipActive,
                      ]}
                      onPress={() => setEditForm((f) => ({ ...f, assignedToUserId: m.uid }))}
                    >
                      <Text
                        style={[
                          styles.assignedChipText,
                          editForm.assignedToUserId === m.uid && styles.assignedChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {m.displayName || m.email || m.uid}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.modalLabel}>Dag i veckan</Text>
            <View style={styles.dayPickerRow}>
              {weekDays.map((day, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayPickerBtn,
                    editForm.dayIndex === i && styles.dayPickerBtnActive,
                  ]}
                  onPress={() => setEditForm((f) => ({ ...f, dayIndex: i }))}
                >
                  <Text
                    style={[
                      styles.dayPickerLabel,
                      editForm.dayIndex === i && styles.dayPickerLabelActive,
                    ]}
                  >
                    {DAY_NAMES[i]}
                  </Text>
                  <Text
                    style={[
                      styles.dayPickerDate,
                      editForm.dayIndex === i && styles.dayPickerLabelActive,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Starttid (HH:mm)</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.startTime}
              onChangeText={(t) => setEditForm((f) => ({ ...f, startTime: t }))}
              placeholder="07:15"
              placeholderTextColor="#999"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.modalLabel}>Sluttid (HH:mm)</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.endTime}
              onChangeText={(t) => setEditForm((f) => ({ ...f, endTime: t }))}
              placeholder="16:00"
              placeholderTextColor="#999"
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={closeEdit}>
                <Text style={styles.modalBtnSecondaryText}>Avbryt</Text>
              </TouchableOpacity>
              {editingBooking && (
                <TouchableOpacity style={styles.modalBtnDanger} onPress={deleteBooking}>
                  <Ionicons name="trash-outline" size={20} color="#FFF" />
                  <Text style={styles.modalBtnDangerText}>Ta bort</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={saveEdit}>
                <Text style={styles.modalBtnPrimaryText}>Spara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: välj vilken anställds planering som visas */}
      <Modal visible={memberPickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.memberPickerOverlay}
          activeOpacity={1}
          onPress={() => setMemberPickerVisible(false)}
        >
          <View style={styles.memberPickerCard}>
            <Text style={styles.memberPickerTitle}>Visa planering för</Text>
            {members.map((m) => (
              <TouchableOpacity
                key={m.uid}
                style={[
                  styles.memberPickerItem,
                  selectedUserId === m.uid && styles.memberPickerItemActive,
                ]}
                onPress={() => {
                  setSelectedUserId(m.uid);
                  setMemberPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.memberPickerItemText,
                    selectedUserId === m.uid && styles.memberPickerItemTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {m.displayName || m.email || m.uid}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get("window");
const TIME_COLUMN_WIDTH = 40;
const HORIZONTAL_PADDING = 10;
const dayWidth = (width - HORIZONTAL_PADDING * 2 - TIME_COLUMN_WIDTH) / 7;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  centerContent: { justifyContent: "center", alignItems: "center", padding: 24 },
  placeholderText: { fontSize: 16, color: "#666", textAlign: "center" },
  pageHeader: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  memberPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
  },
  memberPickerLabel: { fontSize: 13, fontWeight: "700", color: "#555", maxWidth: 220 },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: { padding: 8 },
  weekLabel: { flex: 1, alignItems: "center" },
  weekText: { fontSize: 16, fontWeight: "800", color: "#555" },

  dayHeaders: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingLeft: HORIZONTAL_PADDING,
    paddingRight: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    alignItems: "center",
  },
  dayHeaderSpacer: {
    width: TIME_COLUMN_WIDTH,
  },
  dayHeader: {
    width: dayWidth,
    alignItems: "center",
  },
  dayName: { fontSize: 10, fontWeight: "900", color: "#999", marginBottom: 2 },
  dayDate: { fontSize: 16, fontWeight: "900", color: "#1C1C1E" },
  dayMonth: { fontSize: 9, color: "#AAA", fontWeight: "700" },

  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "#FFF",
  },
  loadingText: { fontSize: 12, color: "#666", fontWeight: "600" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING },

  grid: { paddingTop: 8 },
  timeRow: {
    flexDirection: "row",
    height: CELL_HEIGHT,
    marginBottom: 2,
  },
  timeCell: {
    width: TIME_COLUMN_WIDTH,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  timeText: { fontSize: 9, fontWeight: "700", color: "#AAA" },
  daysRow: { flex: 1, flexDirection: "row" },
  cell: {
    width: dayWidth - 4,
    marginHorizontal: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  cellWithBooking: {
    backgroundColor: WorkaholicTheme.colors.primary + "15",
  },
  bookingBlock: {
    flex: 1,
    backgroundColor: WorkaholicTheme.colors.primary,
    borderRadius: 6,
    padding: 4,
    justifyContent: "center",
  },
  bookingTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFF",
  },
  bookingTime: {
    fontSize: 8,
    color: "rgba(255,255,255,0.9)",
    marginTop: 1,
  },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WorkaholicTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1C1C1E",
    marginBottom: 20,
  },
  assignedScroll: { marginBottom: 12, maxHeight: 44 },
  assignedChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#EEE",
  },
  assignedChipActive: { backgroundColor: WorkaholicTheme.colors.primary },
  assignedChipText: { fontSize: 13, fontWeight: "700", color: "#555" },
  assignedChipTextActive: { color: "#FFF" },
  memberPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  memberPickerCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxWidth: 320,
  },
  memberPickerTitle: { fontSize: 14, fontWeight: "800", color: "#666", marginBottom: 12 },
  memberPickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  memberPickerItemActive: { backgroundColor: WorkaholicTheme.colors.primary + "20" },
  memberPickerItemText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  memberPickerItemTextActive: { color: WorkaholicTheme.colors.primary, fontWeight: "800" },
  modalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1C1C1E",
    marginBottom: 16,
  },
  modalInputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  dayPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayPickerBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 10,
    backgroundColor: "#F5F5F7",
  },
  dayPickerBtnActive: {
    backgroundColor: WorkaholicTheme.colors.primary,
  },
  dayPickerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#666",
  },
  dayPickerLabelActive: {
    color: "#FFF",
  },
  dayPickerDate: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1C1C1E",
    marginTop: 2,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  modalBtnSecondary: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  modalBtnSecondaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#666",
  },
  modalBtnPrimary: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: WorkaholicTheme.colors.primary,
    alignItems: "center",
  },
  modalBtnPrimaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },
  modalBtnDanger: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: WorkaholicTheme.colors.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalBtnDangerText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
  },
});
