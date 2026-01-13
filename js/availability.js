import { db } from "./firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === Guardar Configuración (Admin) ===
export async function saveAvailabilitySettings(workDays, start, end) {
    try {
        await setDoc(doc(db, "settings", "availability"), {
            workDays: workDays, // Array of numbers [1, 2, 3...]
            startTime: start,
            endTime: end,
            updatedAt: new Date().toISOString()
        });
        alert("¡Horarios guardados correctamente!");
    } catch (error) {
        console.error("Error al guardar horarios:", error);
        alert("Error: " + error.message);
    }
}

// === Cargar Configuración ===
export async function loadAvailabilitySettings() {
    try {
        const docRef = doc(db, "settings", "availability");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null; // No config yet
        }
    } catch (error) {
        console.error("Error al cargar horarios:", error);
        return null;
    }
}
