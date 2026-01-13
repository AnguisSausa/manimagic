import { db } from "./firebase-config.js";
import { doc, getDoc, collection, query, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const calendarGrid = document.getElementById('calendarGrid');
const currentMonthLabel = document.getElementById('currentMonthLabel');
let currentDate = new Date();

// State
let availabilitySettings = null;
let availabilityOverrides = {};

export async function initClientCalendar() {
    await loadAvailabilityData();
    renderClientCalendar();

    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
}

async function loadAvailabilityData() {
    // 1. General Settings
    try {
        const settingsSnap = await getDoc(doc(db, "settings", "availability"));
        if (settingsSnap.exists()) {
            availabilitySettings = settingsSnap.data();
        } else {
            console.warn("No availability settings found.");
        }

        // 2. Overrides
        const q = query(collection(db, "availability_overrides"));
        const overridesSnap = await getDocs(q);
        availabilityOverrides = {};
        overridesSnap.forEach(doc => {
            availabilityOverrides[doc.id] = doc.data();
        });

    } catch (e) {
        console.error("Error loading availability:", e);
    }
}

function renderClientCalendar() {
    calendarGrid.innerHTML = '';

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

    // Empty Slots
    for (let i = 0; i < firstDayIndex; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-date empty';
        calendarGrid.appendChild(div);
    }

    // Days
    for (let i = 1; i <= lastDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-date';
        div.textContent = i;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month, i).getDay(); // 0=Sun, 1=Mon...

        // === Availability Logic ===
        let isOpen = false;

        // 1. Check General Rule
        if (availabilitySettings && availabilitySettings.workDays.includes(dayOfWeek)) {
            isOpen = true;
        }

        // 2. Check Overrides
        if (availabilityOverrides[dateStr]) {
            if (availabilityOverrides[dateStr].status === 'closed') isOpen = false;
            if (availabilityOverrides[dateStr].status === 'open') isOpen = true;
        }

        // 3. Past Dates (Optional: prevent back-booking)
        // For simplicity, let's just use strict equality for today or future. 
        // Real implementation would check milliseconds.

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

function selectDate(element, dateStr) {
    // UI Highlight
    document.querySelectorAll('.calendar-date').forEach(d => d.classList.remove('active'));
    element.classList.add('active');

    console.log("Selected Date:", dateStr);
    // TODO: Trigget slot calculation for this date
    // loadTimeSlots(dateStr);
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderClientCalendar();
}
