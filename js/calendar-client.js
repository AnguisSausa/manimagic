import { db, auth } from "./firebase-config.js";
import { doc, getDoc, collection, query, getDocs, where, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const calendarGrid = document.getElementById('calendarGrid');
const currentMonthLabel = document.getElementById('currentMonthLabel');
const timeSlotsSection = document.getElementById('timeSlotsSection');
const timeSlotsGrid = document.getElementById('timeSlotsGrid');
const confirmBtn = document.getElementById('confirmAppointmentBtn');

let currentDate = new Date();

// State
let availabilitySettings = null;
let availabilityOverrides = {};
let selectedDate = null;
let selectedTime = null;

export async function initClientCalendar() {
    await loadAvailabilityData();
    renderClientCalendar();

    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    confirmBtn.addEventListener('click', saveAppointment);
}

async function loadAvailabilityData() {
    try {
        const settingsSnap = await getDoc(doc(db, "settings", "availability"));
        if (settingsSnap.exists()) availabilitySettings = settingsSnap.data();

        const q = query(collection(db, "availability_overrides"));
        const overridesSnap = await getDocs(q);
        availabilityOverrides = {};
        overridesSnap.forEach(doc => availabilityOverrides[doc.id] = doc.data());
    } catch (e) {
        console.error("Error loading availability:", e);
    }
}

function renderClientCalendar() {
    calendarGrid.innerHTML = '';

    // UI Reset
    timeSlotsSection.classList.add('hidden');
    confirmBtn.disabled = true;
    selectedDate = null;
    selectedTime = null;

    // Header
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    days.forEach(d => {
        const div = document.createElement('div');
        div.className = 'calendar-day-name';
        div.textContent = d;
        calendarGrid.appendChild(div);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentMonthLabel.textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate);

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-date empty';
        calendarGrid.appendChild(div);
    }

    for (let i = 1; i <= lastDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-date';
        div.textContent = i;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month, i).getDay();

        let isOpen = false;
        if (availabilitySettings && availabilitySettings.workDays.includes(dayOfWeek)) isOpen = true;

        if (availabilityOverrides[dateStr]) {
            if (availabilityOverrides[dateStr].status === 'closed') isOpen = false;
            if (availabilityOverrides[dateStr].status === 'open') isOpen = true;
        }

        // Disable past dates
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr < todayStr) isOpen = false;

        if (isOpen) {
            div.classList.add('available');
            div.addEventListener('click', () => selectDate(div, dateStr));
        } else {
            div.classList.add('disabled');
            div.style.opacity = '0.5';
            div.style.cursor = 'not-allowed';
            div.style.backgroundColor = '#f0f0f0';
        }

        calendarGrid.appendChild(div);
    }
}

async function selectDate(element, dateStr) {
    document.querySelectorAll('.calendar-date').forEach(d => d.classList.remove('active'));
    element.classList.add('active');
    selectedDate = dateStr;

    // Load Slots
    await generateTimeSlots(dateStr);
}

async function generateTimeSlots(dateStr) {
    timeSlotsSection.classList.remove('hidden');
    timeSlotsGrid.innerHTML = '<p>Cargando horarios...</p>';

    let start = availabilitySettings.startTime; // "09:00"
    let end = availabilitySettings.endTime;     // "18:00"

    // Check Override Hours
    if (availabilityOverrides[dateStr] && availabilityOverrides[dateStr].startTime) {
        start = availabilityOverrides[dateStr].startTime;
        end = availabilityOverrides[dateStr].endTime;
    }

    // 1. Get Existing Appointments
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef, where("date", "==", dateStr));
    const querySnapshot = await getDocs(q);

    const bookedTimes = [];
    querySnapshot.forEach(doc => {
        bookedTimes.push(doc.data().time); // Assuming stored as "09:00"
    });

    // 2. Generate Slots (Hourly)
    const slots = [];
    let current = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);

    // Simple hourly loop
    for (let h = current; h < endHour; h++) {
        const timeLabel = `${String(h).padStart(2, '0')}:00`;

        if (!bookedTimes.includes(timeLabel)) {
            slots.push(timeLabel);
        }
    }

    // 3. Render
    timeSlotsGrid.innerHTML = '';
    if (slots.length === 0) {
        timeSlotsGrid.innerHTML = '<p>No hay horarios disponibles.</p>';
        return;
    }

    slots.forEach(time => {
        const btn = document.createElement('button');
        btn.className = 'slot-btn'; // Needs CSS
        btn.textContent = time;
        btn.style.padding = '0.5rem';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', () => {
            document.querySelectorAll('.slot-btn').forEach(b => {
                b.style.background = 'white';
                b.style.color = 'black';
            });
            btn.style.background = 'var(--primary-color)';
            btn.style.color = 'white';
            selectedTime = time;
            confirmBtn.disabled = false;
        });

        timeSlotsGrid.appendChild(btn);
    });
}

async function saveAppointment() {
    if (!selectedDate || !selectedTime) return;

    // Get Form Data
    // Note: 'selectedService' is global in booking.html (script tag), 
    // we might need to access it differently or move that state here.
    // For now assuming we can access DOM elements.

    // Hack: Read from global scope variable defined in HTML script
    // ideally we should export selectService logic too.
    const serviceName = window.selectedService || "Servicio General";

    const phone = document.getElementById('clientPhone').value;
    const allergies = document.getElementById('clientAllergies').value;
    const user = auth.currentUser;

    if (!user) {
        alert("Debes iniciar sesión para agendar.");
        return;
    }

    if (!phone) {
        alert("Por favor ingresa un teléfono.");
        return;
    }

    const appointmentData = {
        userId: user.uid,
        userName: user.email, // Or fetch name from profile
        date: selectedDate,
        time: selectedTime,
        service: serviceName,
        phone: phone,
        allergies: allergies,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "appointments"), appointmentData);
        alert("¡Cita confirmada exitosamente!");
        window.location.reload(); // Reset flow
    } catch (e) {
        console.error("Error saving appointment:", e);
        alert("Error al guardar: " + e.message);
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderClientCalendar();
}
