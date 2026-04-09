import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WorkaholicTheme } from "../theme";
import { ProjectsContext } from "../context/ProjectsContext";
import { CompanyContext } from "../context/CompanyContext";
import { useCompanyMembers } from "../hooks/useCompanyMembers";
import { assigneeBorderColor } from "../utils/planningColors";
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

const DAY_NAMES_SHORT = ["Mån", "Tis", "Ons", "Tor", "Fre"];

/** Måndag 00:00 samma ISO-vecka */
function startOfIsoWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Arbetsvecka mån–fre (5 dagar) */
function getWorkWeekDays(date) {
  const mon = startOfIsoWeekMonday(date);
  const days = [];
  for (let i = 0; i < 5; i++) {
    const dd = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    days.push(dd);
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

  const { width: windowWidth } = useWindowDimensions();
  const dayScrollRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  /** 'week' | 'month' */
  const [viewMode, setViewMode] = useState("week");
  const [dayPageIndex, setDayPageIndex] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
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

  const workWeekDays = useMemo(() => getWorkWeekDays(currentDate), [currentDate]);
  const weekNum = getWeekNumber(currentDate);
  const year = currentDate.getFullYear();
  const weekStartStr = useMemo(() => toDateStr(workWeekDays[0]), [workWeekDays]);
  const weekEndStr = useMemo(() => toDateStr(workWeekDays[4]), [workWeekDays]);
  const weekRangeLabel = useMemo(() => {
    const a = workWeekDays[0];
    const b = workWeekDays[4];
    if (!a || !b) return "";
    const o = { day: "numeric", month: "short" };
    return `${a.toLocaleDateString("sv-SE", o)} – ${b.toLocaleDateString("sv-SE", { ...o, year: "numeric" })}`;
  }, [workWeekDays]);

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
      const weekStart = workWeekDays[0].getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const dateStr = d.date || "";
        const dateTime = dateStr ? new Date(dateStr + "T12:00:00").getTime() : weekStart;
        const dayIndex = Math.round((dateTime - weekStart) / dayMs);
        const clamped = Math.max(0, Math.min(6, dayIndex));
        if (clamped > 4) return null;
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
      }).filter(Boolean);
      setBookings(list);
      setBookingsLoading(false);
    }, () => setBookingsLoading(false));
    return () => unsub();
  }, [companyId, selectedUserId, weekStartStr, weekEndStr, workWeekDays]);

  const goToToday = () => {
    setCurrentDate(new Date());
    setViewMode("week");
    setDayPageIndex(0);
    requestAnimationFrame(() => {
      dayScrollRef.current?.scrollTo({ x: 0, animated: true });
    });
  };

  const getBookingsForDay = useCallback(
    (dayIndex) =>
      bookings
        .filter((b) => b.dayIndex === dayIndex)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [bookings]
  );

  useEffect(() => {
    setDayPageIndex(0);
    requestAnimationFrame(() => {
      dayScrollRef.current?.scrollTo({ x: 0, animated: false });
    });
  }, [weekStartStr, windowWidth]);

  const goToPrevWeek = useCallback(() => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
    setViewMode("week");
  }, [currentDate]);

  const goToNextWeek = useCallback(() => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
    setViewMode("week");
  }, [currentDate]);

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
    const dayIdx = workWeekDays.findIndex(
      (d) =>
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
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
    if (editForm.dayIndex < 0 || editForm.dayIndex > 4) {
      Alert.alert("Ogiltig dag", "Välj en arbetsdag (mån–fre).");
      return;
    }
    const targetUserId = editForm.assignedToUserId || selectedUserId;
    if (!companyId || !targetUserId || !auth?.currentUser?.uid) {
      Alert.alert("Fel", "Du måste vara inloggad och kopplad till ett företag.");
      return;
    }

    const title = (editForm.title || "").trim() || "Namnlös bokning";
    const description = (editForm.description || "").trim();
    const dateStr = toDateStr(workWeekDays[editForm.dayIndex]);
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

  const assigneeAccent = useMemo(() => assigneeBorderColor(selectedUserId), [selectedUserId]);

  const monthGrid = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7;
    const dim = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return { cells, y, m };
  }, [calendarMonth]);

  const selectCalendarDay = useCallback(
    (day) => {
      if (day == null) return;
      const { y, m } = monthGrid;
      const picked = new Date(y, m, day);
      setCurrentDate(picked);
      setViewMode("week");
      const mon = startOfIsoWeekMonday(picked);
      const idx = Math.round((picked.getTime() - mon.getTime()) / 86400000);
      const page = Math.max(0, Math.min(4, idx));
      setDayPageIndex(page);
      requestAnimationFrame(() => {
        dayScrollRef.current?.scrollTo({ x: page * windowWidth, animated: true });
      });
    },
    [monthGrid, windowWidth]
  );

  const hasBookingOnDay = useCallback(
    (y, m, d) => {
      const key =
        y +
        "-" +
        String(m + 1).padStart(2, "0") +
        "-" +
        String(d).padStart(2, "0");
      return bookings.some((b) => b.date === key);
    },
    [bookings]
  );

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
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.topSafe, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Planering</Text>
          <TouchableOpacity
            style={[styles.iconPill, viewMode === "month" && styles.iconPillActive]}
            onPress={() => {
              setCalendarMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
              setViewMode((m) => (m === "month" ? "week" : "month"));
            }}
            accessibilityLabel="Växla månadsvy"
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={viewMode === "month" ? "#FFF" : "#475569"}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.memberPickerRow}
          onPress={() => setMemberPickerVisible(true)}
          disabled={membersLoading}
        >
          <Ionicons name="person-outline" size={18} color="#64748b" />
          <Text style={styles.memberPickerLabel} numberOfLines={1}>
            {membersLoading
              ? "Laddar..."
              : selectedMember
                ? `Visar ${selectedMember.displayName || selectedMember.email || selectedUserId}`
                : "Välj anställd"}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#64748b" />
        </TouchableOpacity>

        {viewMode === "week" ? (
          <>
            <View style={styles.weekNavPills}>
              <TouchableOpacity style={styles.navPill} onPress={goToPrevWeek}>
                <Text style={styles.navPillText}>Vecka bakåt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navPillPrimary} onPress={goToToday}>
                <Text style={styles.navPillPrimaryText}>Denna vecka</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navPill} onPress={goToNextWeek}>
                <Text style={styles.navPillText}>Vecka framåt</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekMetaRow}>
              <Text style={styles.weekBadge}>Vecka {weekNum}</Text>
              <Text style={styles.weekYear}>{year}</Text>
              <Text style={styles.weekRangeMuted} numberOfLines={1}>
                {weekRangeLabel}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() =>
                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
              }
            >
              <Ionicons name="chevron-back" size={22} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.monthNavTitle}>
              {calendarMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}
            </Text>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() =>
                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
              }
            >
              <Ionicons name="chevron-forward" size={22} color="#334155" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {bookingsLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={WorkaholicTheme.colors.primary} />
          <Text style={styles.loadingText}>Laddar bokningar...</Text>
        </View>
      )}

      {viewMode === "month" ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.monthScrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.monthBoard}>
            {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((wd) => (
              <Text key={wd} style={styles.monthWeekdayHdr}>
                {wd}
              </Text>
            ))}
            {monthGrid.cells.map((cell, i) => {
              if (cell == null) {
                return <View key={`e-${i}`} style={styles.monthCellEmpty} />;
              }
              const { y, m } = monthGrid;
              const isToday =
                new Date().getDate() === cell &&
                new Date().getMonth() === m &&
                new Date().getFullYear() === y;
              const dot = hasBookingOnDay(y, m, cell);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.monthCell, isToday && styles.monthCellToday]}
                  onPress={() => selectCalendarDay(cell)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.monthCellNum, isToday && styles.monthCellNumToday]}>{cell}</Text>
                  {dot ? <View style={styles.monthDot} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.monthHint}>Tryck på en dag för att öppna den veckans planering.</Text>
        </ScrollView>
      ) : (
        <>
          <View style={styles.boardShell}>
            <View style={styles.boardHeader}>
              <Text style={styles.boardHeaderTitle}>Arbetsvecka</Text>
              <Text style={styles.boardHeaderSub} numberOfLines={1}>
                {weekRangeLabel}
              </Text>
            </View>
            <View style={styles.dayPillRow}>
              {workWeekDays.map((d, i) => {
                const sub = d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
                const active = dayPageIndex === i;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayPill, active && styles.dayPillActive]}
                    onPress={() => {
                      setDayPageIndex(i);
                      dayScrollRef.current?.scrollTo({ x: i * windowWidth, animated: true });
                    }}
                  >
                    <Text style={[styles.dayPillWeek, active && styles.dayPillWeekActive]} numberOfLines={1}>
                      {DAY_NAMES_SHORT[i]}
                    </Text>
                    <Text style={[styles.dayPillSub, active && styles.dayPillSubActive]} numberOfLines={1}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <ScrollView
              ref={dayScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const idx = Math.round(x / Math.max(1, windowWidth));
                setDayPageIndex(Math.max(0, Math.min(4, idx)));
              }}
              style={styles.dayPager}
            >
              {workWeekDays.map((dayDate, dayIdx) => {
                const list = getBookingsForDay(dayIdx);
                return (
                  <ScrollView
                    key={dayIdx}
                    style={[styles.dayColumn, { width: windowWidth }]}
                    contentContainerStyle={{
                      paddingBottom: insets.bottom + 120,
                      paddingHorizontal: 12,
                      paddingTop: 8,
                    }}
                    showsVerticalScrollIndicator={false}
                  >
                    {list.length === 0 ? (
                      <Text style={styles.emptyDay}>Inget inplanerat</Text>
                    ) : (
                      list.map((booking) => (
                        <TouchableOpacity
                          key={booking.id}
                          style={[styles.jobCard, { borderLeftColor: assigneeAccent }]}
                          onPress={() => openEdit(booking)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.timeBadge}>
                            <Text style={styles.timeBadgeText}>
                              {booking.startTime}–{booking.endTime}
                            </Text>
                          </View>
                          <Text style={styles.jobWho} numberOfLines={1}>
                            {selectedMember?.displayName || selectedMember?.email || "—"}
                          </Text>
                          <Text style={styles.jobTitle} numberOfLines={3}>
                            {booking.title || "—"}
                          </Text>
                          {booking.description ? (
                            <Text style={styles.jobDesc} numberOfLines={4}>
                              {booking.description}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      {viewMode === "week" ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 90 }]}
          activeOpacity={0.8}
          onPress={openNewBooking}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      ) : null}

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
              {workWeekDays.map((day, i) => (
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
                    {DAY_NAMES_SHORT[i]}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  centerContent: { justifyContent: "center", alignItems: "center", padding: 24 },
  placeholderText: { fontSize: 16, color: "#666", textAlign: "center" },
  topSafe: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iconPillActive: {
    backgroundColor: WorkaholicTheme.colors.primary,
    borderColor: WorkaholicTheme.colors.primary,
  },
  memberPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  memberPickerLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#475569" },
  weekNavPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    justifyContent: "center",
  },
  navPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  navPillText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  navPillPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: WorkaholicTheme.colors.primary,
  },
  navPillPrimaryText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  weekMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  weekBadge: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  weekYear: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  weekRangeMuted: { flex: 1, fontSize: 11, color: "#94a3b8", fontWeight: "600", textAlign: "right", minWidth: 120 },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  monthNavBtn: { padding: 8 },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "capitalize",
  },
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  loadingText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  scrollView: { flex: 1 },
  monthScrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  monthBoard: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  monthWeekdayHdr: {
    width: "14.28%",
    paddingVertical: 8,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  monthCellEmpty: {
    width: "14.28%",
    aspectRatio: 1,
    backgroundColor: "#fafafa",
    borderWidth: 0.5,
    borderColor: "#f1f5f9",
  },
  monthCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  monthCellToday: {
    backgroundColor: "#eff6ff",
  },
  monthCellNum: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  monthCellNumToday: { color: WorkaholicTheme.colors.primary },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: WorkaholicTheme.colors.primary,
    marginTop: 4,
  },
  monthHint: {
    marginTop: 12,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500",
  },
  boardShell: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  boardHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "rgba(248,250,252,0.95)",
  },
  boardHeaderTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  boardHeaderSub: { fontSize: 11, color: "#64748b", fontWeight: "500", marginTop: 2 },
  dayPillRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  dayPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  dayPillActive: {
    borderColor: WorkaholicTheme.colors.primary,
    backgroundColor: "#fafafa",
  },
  dayPillWeek: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "capitalize",
  },
  dayPillWeekActive: { color: "#0f172a" },
  dayPillSub: { fontSize: 9, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  dayPillSubActive: { color: WorkaholicTheme.colors.primary },
  dayPager: { flex: 1 },
  dayColumn: {},
  emptyDay: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 24,
  },
  jobCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  timeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  timeBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  jobWho: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  jobTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", lineHeight: 18 },
  jobDesc: { fontSize: 12, color: "#475569", marginTop: 6, lineHeight: 16 },

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
