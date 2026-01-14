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

            // Photo Button Logic
            // Photo Button Logic
            let photoHtml = '';
            if (appt.photoBase64) {
                photoHtml = `<button class="view-photo-btn" data-photo="${appt.id}" style="border:none; background:none; cursor:pointer; padding:0;">
                    <img src="${appt.photoBase64}" style="width:35px; height:35px; object-fit:cover; border-radius:4px; border:1px solid #ccc;">
               </button>`;
            }

            tr.innerHTML = `
                <td style="padding: 0.5rem;">
                    <div style="font-weight:bold;">${appt.date}</div>
                    <div style="color:var(--accent-color); font-size:0.8rem;">${appt.time}</div>
                </td>
                <td style="padding: 0.5rem;">
                    <div>${appt.userName || 'Usuario'}</div>
                    <div style="font-size:0.8rem; color:#666;">${appt.service}</div>
                    ${appt.allergies ? `<div style="font-size:0.7rem; color:red;">⚠️ ${appt.allergies}</div>` : ''}
                </td>
                <td style="padding: 0.5rem;">
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        ${photoHtml}
                        <a href="https://wa.me/${appt.phone.replace(/[^0-9]/g, '')}" target="_blank" title="WhatsApp" style="text-decoration:none; font-size:1.2rem;">📱</a>
                        <button class="btn-complete" data-id="${appt.id}" title="Completar" style="
                            background: none; border: none; cursor: pointer; font-size:1.2rem;
                        ">✅</button>
                        <button class="btn-cancel" data-id="${appt.id}" title="Cancelar" style="
                            background: none; border: none; cursor: pointer; font-size:1.2rem;
                        ">❌</button>
                    </div>
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

        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                cancelAppointmentAdmin(btn.dataset.id);
            });
        });

        // Add Listeners for Photos
        document.querySelectorAll('.view-photo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const apptId = btn.dataset.photo;
                const appt = appts.find(a => a.id === apptId);
                if (appt && appt.photoBase64) {
                    openPhotoModal(appt.photoBase64);
                }
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

        if (window.showToast) window.showToast("¡Cita completada y cobrada!", "success");
        else alert("¡Cita completada y cobrada!");

        closeCompleteModal();
        loadAppointments(); // Refresh table
    } catch (error) {
        console.error("Error updating appointment:", error);
        if (window.showToast) window.showToast("Error: " + error.message, "error");
        else alert("Error: " + error.message);
    }
}

function openPhotoModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    if (modal && modalImg) {
        modalImg.src = src;
        modal.style.display = 'flex';
    }
}

// Global listener for closing the image modal
document.addEventListener('DOMContentLoaded', () => {
    const imageModal = document.getElementById('imageModal');
    const closeBtn = document.getElementById('closeImageModal');
    if (closeBtn && imageModal) {
        closeBtn.onclick = () => imageModal.style.display = 'none';
        imageModal.onclick = (e) => {
            if (e.target === imageModal) imageModal.style.display = 'none';
        };
    }
});

async function cancelAppointmentAdmin(id) {
    if (!confirm("¿Seguro que deseas cancelar esta cita? Esta acción liberará el horario.")) return;

    try {
        const docRef = doc(db, "appointments", id);
        await updateDoc(docRef, {
            status: 'canceled',
            canceledAt: new Date().toISOString()
        });

        if (window.showToast) window.showToast("Cita cancelada y horario liberado.", "success");
        else alert("Cita cancelada y horario liberado.");

        loadAppointments(); // Refresh table
    } catch (error) {
        console.error("Error canceling appointment:", error);
        if (window.showToast) window.showToast("Error: " + error.message, "error");
        else alert("Error: " + error.message);
    }
}
