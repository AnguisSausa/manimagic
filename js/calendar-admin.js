import { db } from "./firebase-config.js";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const calendarGrid = document.getElementById('calendarGrid');
const currentMonthLabel = document.getElementById('currentMonthLabel');
let currentDate = new Date();

// === State ===
let availabilityOverrides = {}; // Cache for overrides { "2026-01-13": { status: 'closed' } }

export async function initCalendar() {
    await loadOverrides();
    renderCalendar();

    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));

    // Modal Listeners
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('saveDayBtn').addEventListener('click', saveDayOverride);
}

// === Rendering ===
function renderCalendar() {
    calendarGrid.innerHTML = '';

    // Header Row
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

        // Construct ID for lookup: YYYY-MM-DD
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        div.dataset.date = dateStr;

        // Check Override Status
        if (availabilityOverrides[dateStr]) {
            if (availabilityOverrides[dateStr].status === 'closed') {
                div.style.backgroundColor = '#ffcccc'; // Light red for closed
                div.style.textDecoration = 'line-through';
            } else if (availabilityOverrides[dateStr].status === 'open') {
                div.style.backgroundColor = '#ccffcc'; // Light green for explicit open
            }
        }

        // Click Event
        div.addEventListener('click', () => openDayModal(dateStr));

        calendarGrid.appendChild(div);
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

// === Overrides Logic (Firestore) ===
async function loadOverrides() {
    // In a real app, query by month range. For now, get all.
    const q = query(collection(db, "availability_overrides"));
    const snapshot = await getDocs(q);
    availabilityOverrides = {};
    snapshot.forEach(doc => {
        availabilityOverrides[doc.id] = doc.data();
    });
}

// === Modal Logic ===
let selectedDateStr = null;

function openDayModal(dateStr) {
    selectedDateStr = dateStr;
    document.getElementById('modalDateTitle').textContent = `Gestionar: ${dateStr}`;
    const modal = document.getElementById('dayModal');
    modal.style.display = 'flex';

    // Reset or Load existing values
    if (availabilityOverrides[dateStr]) {
        document.getElementById('dayStatus').value = availabilityOverrides[dateStr].status;
        document.getElementById('dayStart').value = availabilityOverrides[dateStr].startTime || '';
        document.getElementById('dayEnd').value = availabilityOverrides[dateStr].endTime || '';
    } else {
        document.getElementById('dayStatus').value = 'open';
        document.getElementById('dayStart').value = '';
        document.getElementById('dayEnd').value = '';
    }
}

function closeModal() {
    document.getElementById('dayModal').style.display = 'none';
}

async function saveDayOverride() {
    const status = document.getElementById('dayStatus').value;
    const start = document.getElementById('dayStart').value;
    const end = document.getElementById('dayEnd').value;

    const data = {
        status,
        startTime: start,
        endTime: end,
        updatedAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "availability_overrides", selectedDateStr), data);
        availabilityOverrides[selectedDateStr] = data; // Update local cache
        renderCalendar(); // Re-render to show changes
        closeModal();
        alert("Disponibilidad actualizada para el día " + selectedDateStr);
    } catch (error) {
        console.error("Error saving override", error);
        alert("Error: " + error.message);
    }
}
