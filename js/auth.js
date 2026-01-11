import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === Helper: Custom Toast Notification ===
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Remove from DOM after animation
    setTimeout(() => {
        toast.remove();
        if (container.childNodes.length === 0) {
            container.remove();
        }
    }, 3500);
}

// Hacer showToast accesible globalmente para otros scripts
window.showToast = showToast;

// === Helper: Custom Confirmation Modal ===
export function showConfirm(title, message, callback) {
    let modal = document.getElementById("confirm-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "confirm-modal";
        modal.className = "confirm-modal";
        modal.innerHTML = `
            <div class="confirm-content">
                <h3 class="confirm-title">${title}</h3>
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button id="confirm-no" class="btn-confirm btn-confirm-no">Cancelar</button>
                    <button id="confirm-yes" class="btn-confirm btn-confirm-yes">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.querySelector(".confirm-title").innerText = title;
        modal.querySelector("p").innerText = message;
    }

    modal.style.display = "block";

    const btnYes = document.getElementById("confirm-yes");
    const btnNo = document.getElementById("confirm-no");

    const handleYes = () => {
        modal.style.display = "none";
        btnYes.removeEventListener("click", handleYes);
        btnNo.removeEventListener("click", handleNo);
        callback(true);
    };

    const handleNo = () => {
        modal.style.display = "none";
        btnYes.removeEventListener("click", handleYes);
        btnNo.removeEventListener("click", handleNo);
        callback(false);
    };

    btnYes.addEventListener("click", handleYes);
    btnNo.addEventListener("click", handleNo);
}

window.showConfirm = showConfirm;

// === Registro (Sign Up) ===
// Por defecto crea cuenta de CLIENTE.
// Para Admin, se manejará manualmente o con una función especial después.
export async function registerUser(name, email, password) {
    try {
        // 1. Crear usuario en Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Guardar datos adicionales en Firestore (Colección "users")
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            role: "client", // Role por defecto
            createdAt: new Date().toISOString()
        });

        showToast("¡Cuenta creada exitosamente! Bienvenido, " + name, "success");
        setTimeout(() => {
            window.location.href = "client/booking.html";
        }, 1500);

    } catch (error) {
        console.error("Error en registro:", error);
        showToast("Error al registrar: " + error.message, "error");
    }
}

// === Inicio de Sesión (Login) ===
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // === BACKDOOR TEMPORAL: Auto-promover a Admin ===
        // Esto asegura que tu cuenta tenga permisos de admin automáticamente al entrar.
        if (user.email === "mialeal96333@gmail.com") {
            await setDoc(doc(db, "users", user.uid), { role: "admin" }, { merge: true });
            console.log("¡Usuario promovido a Admin automáticamente!");
        }

        // Verificar el Rol del usuario en Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            showToast("¡Bienvenido de nuevo!", "success");

            setTimeout(() => {
                // Redirección basada en Rol
                if (userData.role === "admin") {
                    window.location.href = "admin/dashboard.html";
                } else {
                    window.location.href = "client/booking.html";
                }
            }, 1000);
        } else {
            window.location.href = "client/booking.html";
        }

    } catch (error) {
        console.error("Error en login:", error);
        showToast("Error al iniciar sesión: " + error.message, "error");
    }
}

// === Cerrar Sesión ===
export async function logoutUser() {
    try {
        await signOut(auth);
        window.location.href = "../index.html"; // Ajustar ruta según donde se llame
    } catch (error) {
        console.error("Error al salir:", error);
    }
}

// === Observador de Estado (Para proteger rutas) ===
export function checkAuthState(requiredRole = null) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // No logueado -> ir a login
            // (Si ya estamos en index.html ignora)
            if (!window.location.pathname.endsWith("index.html")) {
                window.location.href = "../index.html";
            }
        } else {
            // Logueado -> Obtener datos y mostrar perfil
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            let userData;
            if (docSnap.exists()) {
                userData = docSnap.data();
            } else {
                // Fallback: Si no hay documento en Firestore, usar info de Auth
                userData = {
                    name: user.displayName || user.email.split('@')[0],
                    role: 'client'
                };
            }

            // --- MOSTRAR PERFIL EN CABECERA ---
            const navProfile = document.getElementById("nav-user-profile");
            const navUserName = document.getElementById("nav-user-name");

            if (navProfile && navUserName) {
                navUserName.innerText = userData.name || 'Usuario';
                navProfile.style.display = 'flex';
            } else {
                const headerElement = document.getElementById("header-user-actions") ||
                    document.querySelector(".page-header") ||
                    document.querySelector("header div:last-child") ||
                    document.querySelector("header");

                if (headerElement && !document.getElementById("nav-user-profile")) {
                    const profileDiv = document.createElement("div");
                    profileDiv.id = "nav-user-profile";
                    profileDiv.className = "user-profile";
                    profileDiv.style.marginRight = "1rem";
                    profileDiv.innerHTML = `
                        <div class="user-avatar">👤</div>
                        <span class="user-name" id="nav-user-name" style="white-space: nowrap;">${userData.name || 'Usuario'}</span>
                    `;

                    if (headerElement.id === "header-user-actions") {
                        headerElement.insertBefore(profileDiv, headerElement.firstChild);
                    } else {
                        headerElement.appendChild(profileDiv);
                    }
                }
            }

            // --- VERIFICAR ROL SI ES NECESARIO ---
            if (requiredRole && userData.role !== requiredRole) {
                showToast("Acceso no autorizado", "error");
                setTimeout(() => {
                    if (userData.role === 'client') window.location.href = "../client/booking.html";
                    else window.location.href = "../admin/dashboard.html";
                }, 1500);
            }
        }
    });
}
