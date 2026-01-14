import { db } from "./firebase-config.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { checkAuthState, logoutUser } from "./auth.js";

// Proteger la ruta (solo admins)
checkAuthState("admin");

// Elementos del DOM
const clientListContainer = document.getElementById("client-list");
const logoutBtn = document.getElementById("logout-btn");

// Cerrar Sesión
if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logoutUser();
    });
}

/**
 * Carga los clientes desde Firestore
 */
async function fetchClients() {
    try {
        // 1. Obtener todos los usuarios con rol "client"
        const qUsers = query(
            collection(db, "users"),
            where("role", "==", "client")
        );
        const usersSnapshot = await getDocs(qUsers);

        // 2. Obtener todas las citas para extraer números de teléfono si faltan en el perfil
        // Esto ayuda a mostrar el teléfono de clientes que ya han agendado antes
        const apptsSnapshot = await getDocs(collection(db, "appointments"));
        const phonesByUid = {};
        apptsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId && data.phone) {
                phonesByUid[data.userId] = data.phone;
            }
        });

        // Limpiar contenedor
        clientListContainer.innerHTML = "";

        if (usersSnapshot.empty) {
            clientListContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>No hay clientes registrados todavía.</p>
                </div>
            `;
            return;
        }

        const clients = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            // Si el teléfono no está en el perfil, buscarlo en las citas
            if (!userData.phone && phonesByUid[doc.id]) {
                userData.phone = phonesByUid[doc.id];
            }
            clients.push({ id: doc.id, ...userData });
        });

        // Ordenar alfabéticamente
        clients.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        // Renderizar cada cliente
        clients.forEach((client) => {
            renderClientCard(client);
        });

    } catch (error) {
        console.error("Error al cargar clientes:", error);
        clientListContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #e74c3c;">
                <p>Error al cargar la lista de clientes. Verifica la consola.</p>
            </div>
        `;
    }
}

/**
 * Renderiza una tarjeta de cliente
 */
function renderClientCard(client) {
    const card = document.createElement("div");
    card.className = "client-card";

    // Formatear teléfono si existe, de lo contrario mostrar guión
    const phone = client.phone || "Sin teléfono";
    const email = client.email || "Sin correo";
    const name = client.name || "Sin nombre";

    card.innerHTML = `
        <div class="client-info">
            <h3>${name}</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Tel:</strong> ${phone}</p>
        </div>
        <div class="client-stats">
            <span class="badge">Nuevo Cliente</span>
        </div>
    `;

    clientListContainer.appendChild(card);
}

// Inicializar
document.addEventListener("DOMContentLoaded", fetchClients);
