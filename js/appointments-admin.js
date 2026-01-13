import { db } from "./firebase-config.js";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tableBody = document.getElementById('appointmentsTableBody');
let currentAppointmentId = null;

export async function initAppointmentsAdmin() {
    await loadAppointments();

    // Modal Listeners
    document.getElementById('closeCompleteModal').addEventListener('click', closeCompleteModal);
    document.getElementById('confirmCompleteBtn').addEventListener('click', confirmCompletion);
}

async function loadAppointments() {
    try {
        const q = query(
            collection(db, "appointments"),
            where("status", "==", "pending")
            // Note: Compound queries like 'where' + 'orderBy' might require an index in Firebase Console.
            // If it fails, we will remove orderBy and sort in JS.
        );

        const snapshot = await getDocs(q);

        tableBody.innerHTML = '';

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="padding:1rem; text-align:center;">No hay citas pendientes.</td></tr>';
            return;
        }

        const appts = [];
        snapshot.forEach(doc => appts.push({ id: doc.id, ...doc.data() }));

        // Sort by Date/Time (Client side to avoid index requirement for now)
        appts.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });

        appts.forEach(appt => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            tr.innerHTML = `
                <td style="padding: 1rem;">
                    <div style="font-weight:bold;">${appt.date}</div>
                    <div style="color:var(--accent-color);">${appt.time}</div>
                </td>
                <td style="padding: 1rem;">${appt.userName || 'Usuario'}</td>
                <td style="padding: 1rem;">
                    <span style="background:var(--secondary-color); padding:0.2rem 0.5rem; border-radius:5px;">${appt.service}</span>
                    ${appt.allergies ? `<div style="font-size:0.8rem; color:red; margin-top:0.2rem;">⚠️ ${appt.allergies}</div>` : ''}
                </td>
                <td style="padding: 1rem;">
                    <a href="https://wa.me/${appt.phone.replace(/[^0-9]/g, '')}" target="_blank" style="text-decoration:none; color:var(--primary-color);">
                        📱 ${appt.phone}
                    </a>
                </td>
                <td style="padding: 1rem;">
                    <button class="btn-complete" data-id="${appt.id}" style="
                        background: #4CAF50; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;
                    ">✅ Completar</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Add Listeners to buttons
        document.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                openCompleteModal(btn.dataset.id);
            });
        });

    } catch (error) {
        console.error("Error loading appointments:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}

// === Modal Logic ===
function openCompleteModal(id) {
    currentAppointmentId = id;
    document.getElementById('servicePrice').value = '';
    document.getElementById('completeModal').style.display = 'flex';
}

function closeCompleteModal() {
    document.getElementById('completeModal').style.display = 'none';
    currentAppointmentId = null;
}

async function confirmCompletion() {
    const price = document.getElementById('servicePrice').value;

    if (!price || price <= 0) {
        alert("Por favor ingresa un precio válido.");
        return;
    }

    try {
        const docRef = doc(db, "appointments", currentAppointmentId);
        await updateDoc(docRef, {
            status: 'completed',
            price: parseFloat(price),
            completedAt: new Date().toISOString()
        });

        alert("¡Cita completada y cobrada!");
        closeCompleteModal();
        loadAppointments(); // Refresh table
    } catch (error) {
        console.error("Error updating appointment:", error);
        alert("Error: " + error.message);
    }
}
