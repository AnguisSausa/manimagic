import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

        alert("¡Cuenta creada exitosamente! Bienvenido, " + name);
        window.location.href = "client/booking.html";

    } catch (error) {
        console.error("Error en registro:", error);
        alert("Error al registrar: " + error.message);
    }
}

// === Inicio de Sesión (Login) ===
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verificar el Rol del usuario en Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();

            // Redirección basada en Rol
            if (userData.role === "admin") {
                window.location.href = "admin/dashboard.html";
            } else {
                window.location.href = "client/booking.html";
            }
        } else {
            // Si el usuario no existe en la BD (caso raro), mandarlo a cliente
            window.location.href = "client/booking.html";
        }

    } catch (error) {
        console.error("Error en login:", error);
        alert("Error al iniciar sesión: " + error.message);
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
            // Logueado -> Verificar rol si es necesario
            if (requiredRole) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const role = docSnap.data().role;
                    if (role !== requiredRole) {
                        alert("Acceso no autorizado. Redirigiendo...");
                        // Redirigir a su lugar correcto
                        if (role === 'client') window.location.href = "../client/booking.html";
                        else window.location.href = "../admin/dashboard.html";
                    }
                }
            }
        }
    });
}
