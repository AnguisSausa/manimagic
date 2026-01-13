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
        // Consultar usuarios con rol "client"
        // Quitamos orderBy para evitar la necesidad de crear un índice compuesto en Firebase
        const q = query(
            collection(db, "users"),
            where("role", "==", "client")
        );

        const querySnapshot = await getDocs(q);

        // Limpiar contenedor
        clientListContainer.innerHTML = "";

        if (querySnapshot.empty) {
            clientListContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>No hay clientes registrados todavía.</p>
                </div>
            `;
            return;
        }

        // Convertir a array y ordenar alfabéticamente en el cliente
        const clients = [];
        querySnapshot.forEach(doc => {
            clients.push({ id: doc.id, ...doc.data() });
        });

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
            <p>${email} | ${phone}</p>
        </div>
        <div class="client-stats">
            <span class="badge">Nuevo Cliente</span>
        </div>
    `;

    clientListContainer.appendChild(card);
}

// Inicializar
document.addEventListener("DOMContentLoaded", fetchClients);
