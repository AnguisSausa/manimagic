import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { checkAuthState, logoutUser } from "./auth.js";

// Proteger la ruta (solo admins)
checkAuthState("admin");

// Elementos del DOM
const inventoryTableBody = document.getElementById("inventory-table-body");
const productForm = document.getElementById("product-form");
const productModal = document.getElementById("product-modal");
const btnAddProduct = document.getElementById("btn-add-product");
const closeModal = document.getElementById("close-modal");
const modalTitle = document.getElementById("modal-title");
const searchInput = document.getElementById("search-input");
const productCategory = document.getElementById("product-category");
const stockContainer = document.getElementById("stock-container");
const logoutBtn = document.getElementById("logout-btn");
const stockAlertContainer = document.getElementById("stock-alert-container");

// Cerrar Sesión
logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logoutUser();
});

let allProducts = [];

// Mostrar/ocultar stock según categoría
productCategory.addEventListener("change", () => {
    if (productCategory.value === "Servicio") {
        stockContainer.style.display = "none";
        document.getElementById("product-stock").value = "";
    } else {
        stockContainer.style.display = "block";
    }
});

// Abrir modal - Modo Agregar
btnAddProduct.addEventListener("click", () => {
    productForm.reset();
    document.getElementById("product-id").value = "";
    modalTitle.innerText = "Nuevo Producto";
    stockContainer.style.display = "block";
    productModal.style.display = "block";
});

// Cerrar modal
closeModal.addEventListener("click", () => {
    productModal.style.display = "none";
});

window.onclick = (event) => {
    if (event.target == productModal) {
        productModal.style.display = "none";
    }
};

// Cargar productos
async function fetchProducts() {
    try {
        const q = query(collection(db, "inventory"), orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        checkLowStock(allProducts);
        renderTable(allProducts);
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

// Verificar stock bajo
function checkLowStock(products) {
    const lowStockItems = products.filter(p => p.category !== 'Servicio' && p.stock < 3);

    if (lowStockItems.length > 0) {
        stockAlertContainer.innerHTML = `
            <div class="stock-alert-banner">
                <span>⚠️ <b>Aviso de Stock Bajo:</b> Tienes ${lowStockItems.length} productos con menos de 3 unidades.</span>
            </div>
        `;
    } else {
        stockAlertContainer.innerHTML = "";
    }
}

// Renderizar tabla
function renderTable(products) {
    inventoryTableBody.innerHTML = "";
    products.forEach((product) => {
        const tr = document.createElement("tr");
        const isLowStock = product.category !== 'Servicio' && product.stock < 3;

        if (isLowStock) {
            tr.classList.add("row-low-stock");
        }

        tr.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>
                ${product.category === 'Servicio' ? '--' : `
                    <span class="stock-badge ${isLowStock ? 'low' : 'ok'}">
                        ${product.stock} unidades
                    </span>
                `}
            </td>
            <td>$${parseFloat(product.price).toFixed(2)}</td>
            <td>
                <button class="action-btn btn-edit" data-id="${product.id}">Editar</button>
                <button class="action-btn btn-delete" data-id="${product.id}">Borrar</button>
            </td>
        `;
        inventoryTableBody.appendChild(tr);
    });

    // Asignar eventos a los botones de acción
    document.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", (e) => handleEdit(e.target.dataset.id));
    });
    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", (e) => handleDelete(e.target.dataset.id));
    });
}

// Guardar/Actualizar Producto
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("product-id").value;
    const name = document.getElementById("product-name").value;
    const category = document.getElementById("product-category").value;
    const stock = document.getElementById("product-stock").value;
    const price = document.getElementById("product-price").value;

    const productData = {
        name,
        category,
        stock: category === "Servicio" ? 0 : parseInt(stock),
        price: parseFloat(price),
        updatedAt: new Date().toISOString()
    };

    try {
        if (id) {
            // Editar
            await updateDoc(doc(db, "inventory", id), productData);
            window.showToast("Producto actualizado exitosamente", "success");
        } else {
            // Agregar
            productData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "inventory"), productData);
            window.showToast("Producto agregado exitosamente", "success");
        }
        productModal.style.display = "none";
        productForm.reset();
        fetchProducts();
    } catch (error) {
        console.error("Error al guardar:", error);
        window.showToast("Error al guardar el producto", "error");
    }
});

// Eliminar Producto
async function handleDelete(id) {
    window.showConfirm(
        "¿Eliminar producto?",
        "¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.",
        async (confirmed) => {
            if (confirmed) {
                try {
                    await deleteDoc(doc(db, "inventory", id));
                    window.showToast("Producto eliminado", "success");
                    fetchProducts();
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    window.showToast("Error al eliminar", "error");
                }
            }
        }
    );
}

// Editar Producto (Cargar datos en modal)
function handleEdit(id) {
    const product = allProducts.find(p => p.id === id);
    if (product) {
        document.getElementById("product-id").value = product.id;
        document.getElementById("product-name").value = product.name;
        document.getElementById("product-category").value = product.category;
        document.getElementById("product-stock").value = product.stock || "";
        document.getElementById("product-price").value = product.price;

        modalTitle.innerText = "Editar Producto";
        stockContainer.style.display = product.category === "Servicio" ? "none" : "block";
        productModal.style.display = "block";
    }
}

// Buscar Producto
searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
    renderTable(filtered);
});

// Inicializar
fetchProducts();
