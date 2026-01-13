import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Updates the client counter in the sidebar
 */
export async function updateClientCounter() {
    try {
        const q = query(
            collection(db, "users"),
            where("role", "==", "client")
        );
        const querySnapshot = await getDocs(q);
        const count = querySnapshot.size;

        const badge = document.getElementById("client-count-badge");
        if (badge) {
            badge.innerText = count;
            badge.style.display = count > 0 ? "inline-block" : "none";
        }
    } catch (error) {
        console.error("Error updating client counter:", error);
    }
}

/**
 * Checks for low stock and displays a notification if needed
 * @param {string} containerId - The ID of the container to inject the alert into
 */
export async function checkLowStockAlert(containerId) {
    try {
        const querySnapshot = await getDocs(collection(db, "inventory"));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        const lowStockItems = products.filter(p => p.category !== 'Servicio' && p.stock < 3);

        const container = document.getElementById(containerId);
        if (container && lowStockItems.length > 0) {
            container.innerHTML = `
                <div class="floating-stock-alert">
                    <p>⚠️ <b>Atención:</b> Cuentas con bajo stock en ${lowStockItems.length} producto(s).</p>
                    <button class="btn-link" onclick="window.location.href='inventory.html'">Revisar inventario ahora</button>
                </div>
            `;
        } else if (container) {
            container.innerHTML = "";
        }
    } catch (error) {
        console.error("Error checking low stock:", error);
    }
}

// Auto-run counter update if the badge exists
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("client-count-badge")) {
        updateClientCounter();
    }
});
