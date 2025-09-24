// Importa las funciones necesarias del SDK de Firebase que necesitas
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, onValue, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Tu configuración de Firebase, tal como la proporcionaste
const firebaseConfig = {
  apiKey: "AIzaSyD1ZDBAiPZiSUU-swsB_h_zecivcGjkHvs",
  authDomain: "invitacion-babyshower.firebaseapp.com",
  databaseURL: "https://invitacion-babyshower-default-rtdb.firebaseio.com",
  projectId: "invitacion-babyshower",
  storageBucket: "invitacion-babyshower.appspot.com", // Corregí un pequeño typo aquí
  messagingSenderId: "860574304601",
  appId: "1:860574304601:web:49d0a6ea082ee94110a448"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
const accessScreen = document.getElementById('access-screen');
const invitationContent = document.getElementById('invitation-content');
const accessButton = document.getElementById('access-button');
const accessCodeInput = document.getElementById('access-code');
const errorMessage = document.getElementById('error-message');
const giftListButton = document.getElementById('gift-list-button');
const giftListContainer = document.getElementById('gift-list-container');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmationText = document.getElementById('confirmation-text');
const confirmYesButton = document.getElementById('confirm-yes');
const confirmNoButton = document.getElementById('confirm-no');

let currentGiftId = null;
let userAccessCode = null;

// --- FUNCIÓN PARA CARGAR DATOS GENERALES DEL EVENTO ---
async function loadEventDetails() {
    const generalRef = ref(db, 'general');
    const snapshot = await get(generalRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        document.getElementById('event-title').textContent = data.titulo;
        document.getElementById('event-date').textContent = data.fecha;
        document.getElementById('event-time').textContent = data.hora;
        document.getElementById('event-location').textContent = data.ubicacion;
        document.getElementById('event-map-link').href = data.enlaceMapa;
        document.getElementById('event-note').textContent = data.nota;
        document.getElementById('parents-names').textContent = data.padres;
    }
}

// --- LÓGICA DE ACCESO ---
accessButton.addEventListener('click', async () => {
    const code = accessCodeInput.value.trim().toUpperCase();
    if (!code) {
        showError("Por favor, introduce un código.");
        return;
    }

    const invitationRef = ref(db, `invitaciones/${code}`);
    try {
        const snapshot = await get(invitationRef);
        if (snapshot.exists()) {
            userAccessCode = code;
            sessionStorage.setItem('babyShowerAccessCode', code);
            showInvitation();
        } else {
            showError("El código no es válido. Inténtalo de nuevo.");
        }
    } catch (error) {
        console.error("Error al validar el código:", error);
        showError("Ocurrió un error. Por favor, intenta más tarde.");
    }
});

function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => { errorMessage.textContent = ''; }, 3000);
}

function showInvitation() {
    accessScreen.classList.add('hidden');
    invitationContent.classList.remove('hidden');
    loadEventDetails();
    listenForGiftUpdates(); // Empezamos a escuchar cambios en los regalos
}

// --- LÓGICA DE LA LISTA DE REGALOS ---
giftListButton.addEventListener('click', () => {
    giftListContainer.classList.toggle('show');
});

function listenForGiftUpdates() {
    const giftsRef = ref(db, 'regalos');
    onValue(giftsRef, (snapshot) => {
        giftListContainer.innerHTML = ''; // Limpiamos la lista para repintarla
        const gifts = snapshot.val();
        for (const giftId in gifts) {
            const gift = gifts[giftId];
            
            const giftElement = document.createElement('div');
            giftElement.classList.add('gift-item');
            
            const giftName = document.createElement('p');
            giftName.textContent = gift.nombre;

            const selectButton = document.createElement('button');

            if (gift.tomado === true) {
                giftElement.classList.add('taken');
                selectButton.textContent = `Seleccionado`;
                selectButton.disabled = true;
            } else {
                selectButton.textContent = 'Elegir Regalo';
                selectButton.dataset.id = giftId;
                selectButton.dataset.name = gift.nombre;
                selectButton.addEventListener('click', handleGiftSelection);
            }

            giftElement.appendChild(giftName);
            giftElement.appendChild(selectButton);
            giftListContainer.appendChild(giftElement);
        }
    });
}

function handleGiftSelection(event) {
    currentGiftId = event.target.dataset.id;
    const giftName = event.target.dataset.name;
    confirmationText.textContent = `¿Confirmas que quieres regalar "${giftName}"? Esta acción no se puede deshacer.`;
    confirmationModal.classList.remove('hidden');
}

// --- LÓGICA DEL MODAL DE CONFIRMACIÓN ---
confirmNoButton.addEventListener('click', () => {
    confirmationModal.classList.add('hidden');
    currentGiftId = null;
});

confirmYesButton.addEventListener('click', async () => {
    if (!currentGiftId || !userAccessCode) return;

    confirmYesButton.disabled = true;
    confirmYesButton.textContent = 'Procesando...';

    try {
        const userRef = ref(db, `invitaciones/${userAccessCode}`);
        const userSnapshot = await get(userRef);
        const userName = userSnapshot.exists() ? userSnapshot.val().nombres[0] : 'un invitado especial';

        const giftRef = ref(db, `regalos/${currentGiftId}`);
        const updates = {
            tomado: true,
            seleccionadoPor: userName
        };
        await update(giftRef, updates);

        confirmationModal.innerHTML = `<div class="modal-content"><h3>¡Muchísimas gracias, ${userName}!</h3><p>Tu regalo ha sido registrado. Significa el mundo para nosotros. ¡Te esperamos con ansias!</p></div>`;
        setTimeout(() => {
            confirmationModal.classList.add('hidden');
            // Resetear el modal para futuras selecciones si fuera necesario
            confirmationModal.innerHTML = `<div class="modal-content">
                <p id="confirmation-text"></p>
                <button id="confirm-yes">Sí, es un regalo</button>
                <button id="confirm-no">No, volver</button>
            </div>`;
        }, 5000);

    } catch (error) {
        console.error("Error al seleccionar el regalo: ", error);
        confirmationText.textContent = "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
        confirmYesButton.disabled = false;
        confirmYesButton.textContent = 'Sí, es un regalo';
    }
});

// --- COMPROBACIÓN DE SESIÓN AL CARGAR LA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    const savedCode = sessionStorage.getItem('babyShowerAccessCode');
    if (savedCode) {
        userAccessCode = savedCode;
        showInvitation();
    }
});
