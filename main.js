/**
 * TechSecure AI - Main Logic
 * Handles Authentication, Supabase integration, and UI Transitions
 */

// Teachable Machine Configuration
const TM_MODEL_URL = "https://teachablemachine.withgoogle.com/models/5C65Arvky/";
let recognizer;

async function initTeachableMachine() {
    const selStatus = document.getElementById('selection-status-message');
    
    try {
        // Solicitar permisos de micrófono EXPLÍCITAMENTE primero
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Lo detenemos de inmediato porque Teachable Machine abrirá su propio canal
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        console.error("Error al acceder al micrófono detallado:", err);
        if (selStatus) selStatus.textContent = `Error: ${err.name || "Desconocido"} - ${err.message || "Fallo en audio"}`;
        // Quitamos la alerta bloqueante para no congelar la pantalla.
        return;
    }

    const checkpointURL = TM_MODEL_URL + "model.json"; 
    const metadataURL = TM_MODEL_URL + "metadata.json";

    try {
        recognizer = speechCommands.create(
            "BROWSER_FFT", 
            undefined, 
            checkpointURL,
            metadataURL);

        await recognizer.ensureModelLoaded();
        
        const classLabels = recognizer.wordLabels();
        console.log("TM Model Loaded. Labels:", classLabels);
        
        // Feed the labels to UI if open
        if (selStatus) selStatus.textContent = 'Micrófono listo. Clases: ' + classLabels.join(', ');

        startListening();
    } catch (err) {
        console.error("Error cargando el modelo TM:", err);
        if (selStatus) selStatus.textContent = "Error cargando modelo de voz.";
    }
}

function startListening() {
    const aiStatusText = document.getElementById('ai-status-text');
    const detectedCommand = document.getElementById('detected-command');
    const detectionMsg = document.getElementById('detection-msg');

    recognizer.listen(result => {
        const scores = result.scores;
        const labels = recognizer.wordLabels();
        
        // Find the index with the highest probability
        const maxScore = Math.max(...scores);
        const index = scores.indexOf(maxScore);
        const label = labels[index];
        const labelLower = label.toLowerCase();
        
        // Update Modal UI if open to show real-time feedback
        const selStatus = document.getElementById('selection-status-message');
        if (selStatus && maxScore > 0.5) {
            selStatus.textContent = `Escuchando (${Math.round(maxScore*100)}%): ${label}`;
        }

        if (maxScore > 0.70) { // Lowered threshold for better response
            detectedCommand.textContent = label;
            
            if (labelLower.includes("registrar") || labelLower.includes("registro")) {
                detectionMsg.textContent = "Modo registro activado";
                clearMessageAfterDelay(detectionMsg);
                if (typeof startRegistrationFlow === 'function') startRegistrationFlow();
            } else if (labelLower.includes("ingresar") || labelLower.includes("login") || labelLower.includes("entrar")) {
                detectionMsg.textContent = "Modo login activado";
                clearMessageAfterDelay(detectionMsg);
                if (typeof startLoginFlow === 'function') startLoginFlow();
            }
        }
    }, {
        includeSpectrogram: true,
        probabilityThreshold: 0.70,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.50
    });

    aiStatusText.textContent = "Escuchando...";
}

function clearMessageAfterDelay(element) {
    setTimeout(() => {
        element.textContent = "";
    }, 3000);
}

// Global initialization - Removido el listener agresivo

// Supabase Configuration
const SUPABASE_URL = 'https://iyloxlwvonyvsmzxostp.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // USER: Reemplaza con tu Anon Key real

let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.warn("Supabase no se cargó correctamente:", e);
}

// Supabase Test Functionality
document.addEventListener('DOMContentLoaded', () => {
    const supabaseForm = document.getElementById('supabase-test-form');
    const dbStatusMsg = document.getElementById('db-status-msg');

    if (supabaseForm) {
        supabaseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!supabaseClient) {
                dbStatusMsg.textContent = "Error: Configura tu SUPABASE_KEY en main.js";
                dbStatusMsg.style.color = "#ff4d4d";
                return;
            }

            const nombre = document.getElementById('db-nombre').value;
            const usuario = document.getElementById('db-usuario').value;

            dbStatusMsg.textContent = "Guardando...";
            dbStatusMsg.style.color = "var(--accent)";

            try {
                const { data, error } = await supabaseClient
                    .from('usuarios')
                    .insert([
                        { 
                            nombre_completo: nombre, 
                            usuario: usuario,
                            correo: `${usuario}@ejemplo.com`,
                            clave_hash: "test_hash",
                            foto_url: ""
                        }
                    ]);

                if (error) throw error;

                dbStatusMsg.textContent = "¡Datos guardados correctamente!";
                dbStatusMsg.style.color = "#00ff88";
                supabaseForm.reset();
            } catch (err) {
                console.error("Error en Supabase:", err);
                dbStatusMsg.textContent = "Error: " + (err.message || "No se pudo conectar");
                dbStatusMsg.style.color = "#ff4d4d";
            }
        });
    }
});

// Camera Test Functionality (FASE 4)
document.addEventListener('DOMContentLoaded', () => {
    const btnStartCamera = document.getElementById('btn-start-camera');
    const btnCapturePhoto = document.getElementById('btn-capture-photo');
    const videoFeed = document.getElementById('camera-feed');
    const imgPreview = document.getElementById('camera-preview');
    const base64OutputContainer = document.getElementById('base64-output-container');
    const base64Output = document.getElementById('base64-output');

    let localStream = null;

    if (btnStartCamera) {
        btnStartCamera.addEventListener('click', async () => {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                videoFeed.srcObject = localStream;
                videoFeed.style.display = 'block';
                imgPreview.style.display = 'none';
                btnStartCamera.style.display = 'none';
                btnCapturePhoto.style.display = 'block';
                base64OutputContainer.style.display = 'none';
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("No se pudo acceder a la cámara. Asegúrate de dar los permisos correspondientes. Detalle: " + err.message);
            }
        });
    }

    if (btnCapturePhoto) {
        btnCapturePhoto.addEventListener('click', () => {
            if (!localStream) return;

            const canvas = document.createElement('canvas');
            canvas.width = videoFeed.videoWidth || 640;
            canvas.height = videoFeed.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);

            const dataURL = canvas.toDataURL('image/jpeg');
            
            // Show preview and base64
            videoFeed.style.display = 'none';
            imgPreview.src = dataURL;
            imgPreview.style.display = 'block';
            
            base64Output.value = dataURL;
            base64OutputContainer.style.display = 'block';

            // Stop video stream
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;

            // Reset buttons
            btnCapturePhoto.style.display = 'none';
            btnStartCamera.style.display = 'block';
            btnStartCamera.textContent = 'Tomar otra foto';

            // FASE 5: Upload to Supabase Storage
            uploadToSupabaseStorage(dataURL);
        });
    }

    async function uploadToSupabaseStorage(dataURL) {
        const storageStatusMsg = document.getElementById('storage-status-msg');
        const storageUrlContainer = document.getElementById('storage-url-container');
        const storageUrl = document.getElementById('storage-url');

        if (!supabaseClient) {
            storageStatusMsg.textContent = "Error: Configura tu SUPABASE_KEY en main.js";
            storageStatusMsg.style.color = "#ff4d4d";
            return;
        }

        storageStatusMsg.textContent = "Subiendo imagen a Supabase (Bucket 'fotos')...";
        storageStatusMsg.style.color = "var(--accent)";
        storageUrlContainer.style.display = 'none';

        try {
            // Convert Data URL to Blob
            const arr = dataURL.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while(n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], {type: mime});

            // Upload to Supabase Storage
            const fileName = `captura_${Date.now()}.jpg`;
            const { data, error } = await supabaseClient.storage
                .from('fotos')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg'
                });

            if (error) throw error;

            // Get Public URL
            const { data: publicData } = supabaseClient.storage
                .from('fotos')
                .getPublicUrl(fileName);
            
            storageStatusMsg.textContent = "¡Imagen subida correctamente!";
            storageStatusMsg.style.color = "#00ff88";
            
            storageUrl.href = publicData.publicUrl;
            storageUrl.textContent = publicData.publicUrl;
            storageUrlContainer.style.display = 'block';

        } catch (err) {
            console.error("Error subiendo imagen:", err);
            storageStatusMsg.textContent = "Error: " + (err.message || "Verifica que el bucket 'fotos' exista y sea público.");
            storageStatusMsg.style.color = "#ff4d4d";
        }
    }
});

// FASE 7: Login Flow
function startLoginFlow() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.add('active');
    
    // Hide the selection modal
    const selectionFlow = document.getElementById('auth-flow-selection');
    if (selectionFlow) selectionFlow.style.display = 'none';

    // Show login step 1
    const loginStep1 = document.getElementById('auth-flow-step-1');
    const loginStep2 = document.getElementById('auth-flow-step-2');
    if (loginStep1) loginStep1.style.display = 'block';
    if (loginStep2) loginStep2.style.display = 'none';
    
    // Hide all register steps
    const regStep1 = document.getElementById('register-flow-step-1');
    const regStep2 = document.getElementById('register-flow-step-2');
    if (regStep1) regStep1.style.display = 'none';
    if (regStep2) regStep2.style.display = 'none';
    
    document.getElementById('login-error-msg').textContent = "";
}

// UI Event Listeners & Transitions
const authTrigger = document.getElementById('auth-trigger');
const authModal = document.getElementById('auth-modal');
const modalClose = document.querySelector('.modal-close');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const btnSelectLogin = document.getElementById('btn-select-login');
const btnSelectRegister = document.getElementById('btn-select-register');
let loginLocalStream = null;

authTrigger?.addEventListener('click', () => {
    // Show Selection Modal
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.add('active');
    
    document.getElementById('auth-flow-selection').style.display = 'block';
    
    // Hide others
    const loginStep1 = document.getElementById('auth-flow-step-1');
    const loginStep2 = document.getElementById('auth-flow-step-2');
    const regStep1 = document.getElementById('register-flow-step-1');
    const regStep2 = document.getElementById('register-flow-step-2');
    if (loginStep1) loginStep1.style.display = 'none';
    if (loginStep2) loginStep2.style.display = 'none';
    if (regStep1) regStep1.style.display = 'none';
    if (regStep2) regStep2.style.display = 'none';

    const selStatus = document.getElementById('selection-status-message');
    if (!recognizer) {
        selStatus.textContent = "Activando micrófono...";
        initTeachableMachine()
            .then(() => {
                selStatus.textContent = 'Escuchando... Dí "ingresar" o "registrar"';
            })
            .catch(e => {
                selStatus.textContent = "Error de IA de Voz";
            });
    } else {
        selStatus.textContent = 'Escuchando... Dí "ingresar" o "registrar"';
    }
});

btnSelectLogin?.addEventListener('click', startLoginFlow);
btnSelectRegister?.addEventListener('click', startRegistrationFlow);

modalClose?.addEventListener('click', () => {
    authModal.classList.remove('active');
    if (loginLocalStream) {
        loginLocalStream.getTracks().forEach(track => track.stop());
        loginLocalStream = null;
    }
});

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorMsg = document.getElementById('login-error-msg');
        const btnNext = document.getElementById('btn-login-next');

        if (!supabaseClient) {
            errorMsg.textContent = "Error: Cliente de base de datos no configurado.";
            return;
        }

        btnNext.textContent = "Verificando...";
        btnNext.disabled = true;

        try {
            // Validate against Supabase
            const { data, error } = await supabaseClient
                .from('usuarios')
                .select('*')
                .eq('usuario', username)
                .eq('clave_hash', password)
                .single();

            if (error || !data) {
                errorMsg.textContent = "Usuario o contraseña incorrectos.";
                btnNext.textContent = "Siguiente";
                btnNext.disabled = false;
                return;
            }

            // If credentials match -> Step 2: Camera Biometric
            document.getElementById('auth-flow-step-1').style.display = 'none';
            document.getElementById('auth-flow-step-2').style.display = 'block';
            
            const loginCameraFeed = document.getElementById('login-camera-feed');
            const loginStatusMsg = document.getElementById('login-status-message');
            const loginBtnVerify = document.getElementById('login-btn-verify');

            loginLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            loginCameraFeed.srcObject = loginLocalStream;
            loginCameraFeed.style.display = 'block';
            loginBtnVerify.style.display = 'block';

            // Integración de Biometría Real con Face-API
            loginStatusMsg.textContent = "Cargando motor biométrico (Face-API)...";
            loginStatusMsg.style.color = "var(--text-muted)";
            
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            
            try {
                await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

                loginStatusMsg.textContent = "Descargando perfil biométrico...";
                
                const profileImg = new Image();
                profileImg.crossOrigin = 'anonymous'; // Necesario para imágenes de Supabase
                profileImg.src = data.foto_url;
                
                await new Promise((resolve, reject) => {
                    profileImg.onload = resolve;
                    profileImg.onerror = reject;
                });

                const profileDetection = await faceapi.detectSingleFace(profileImg).withFaceLandmarks().withFaceDescriptor();

                if (!profileDetection) {
                     loginStatusMsg.textContent = "Error: No se detectó un rostro válido en tu foto de registro original.";
                     loginStatusMsg.style.color = "#ff4d4d";
                     return;
                }

                const profileDescriptor = profileDetection.descriptor;
                loginStatusMsg.textContent = "¡Mira a la cámara! Analizando rostro...";

                let isVerified = false;
                let attempts = 0;
                
                const verifyInterval = setInterval(async () => {
                    if (isVerified || !loginLocalStream) return;
                    
                    if (attempts >= 15) {
                        clearInterval(verifyInterval);
                        loginStatusMsg.textContent = "Validación fallida: El rostro no coincide.";
                        loginStatusMsg.style.color = "#ff4d4d";
                        return;
                    }

                    attempts++;
                    
                    if (loginCameraFeed.videoWidth === 0) return;

                    const liveDetection = await faceapi.detectSingleFace(loginCameraFeed).withFaceLandmarks().withFaceDescriptor();

                    if (liveDetection) {
                        const distance = faceapi.euclideanDistance(profileDescriptor, liveDetection.descriptor);
                        console.log(`Intento ${attempts}: Distancia facial: ${distance}`);
                        
                        if (distance < 0.55) { // < 0.6 es buena métrica, 0.55 es estricto SaaS
                            isVerified = true;
                            clearInterval(verifyInterval);
                            
                            const precision = ((1 - distance)*100).toFixed(1);
                            loginStatusMsg.textContent = `¡Identidad comprobada! Coincidencia del ${precision}%`;
                            loginStatusMsg.style.color = "#00ff88";
                            loginBtnVerify.textContent = "Accediendo...";
                            
                            setTimeout(() => {
                                if (loginLocalStream) {
                                    loginLocalStream.getTracks().forEach(track => track.stop());
                                    loginLocalStream = null;
                                }
                                authModal.classList.remove('active');
                                document.getElementById('public-site').style.display = 'none';
                                document.getElementById('dashboard').style.display = 'flex';
                                document.getElementById('user-name').textContent = data.nombre_completo;
                                loadDashboardData();
                                
                                loginForm.reset();
                                btnNext.textContent = "Siguiente";
                                btnNext.disabled = false;
                            }, 1500);
                        } else {
                            loginStatusMsg.textContent = `Analizando... Sujeto no verificado (Dist: ${distance.toFixed(2)})`;
                        }
                    } else {
                        loginStatusMsg.textContent = "Ajusta la cámara, rostro no detectado claramente.";
                    }
                }, 1000);

            } catch (err) {
                console.error("Biometric init error:", err);
                loginStatusMsg.textContent = "Error de motor biométrico: " + (err.message || "Fallo en IA.");
                loginStatusMsg.style.color = "#ff4d4d";
            }

        } catch (err) {
            console.error("Login Error:", err);
            errorMsg.textContent = "Error en el sistema.";
            btnNext.textContent = "Siguiente";
            btnNext.disabled = false;
        }
    });
}

logoutBtn?.addEventListener('click', () => {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('public-site').style.display = 'block';
});

function loadDashboardData() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    const activities = [
        { user: 'Admin', action: 'Acceso Biométrico', date: 'Hace 5 min' },
        { user: 'Nova AI', action: 'Escaneo de Red', date: 'Hace 12 min' },
        { user: 'System', action: 'Backup de DB', date: 'Hace 30 min' }
    ];

    activities.forEach(item => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <span>${item.user}</span>
            <span>${item.action}</span>
            <span class="muted">${item.date}</span>
        `;
        activityList.appendChild(row);
    });
}

// FASE 6: Registration Logic
function startRegistrationFlow() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.add('active');
    
    // Hide the selection modal
    const selectionFlow = document.getElementById('auth-flow-selection');
    if (selectionFlow) selectionFlow.style.display = 'none';

    // Hide all login steps
    const loginStep1 = document.getElementById('auth-flow-step-1');
    const loginStep2 = document.getElementById('auth-flow-step-2');
    if (loginStep1) loginStep1.style.display = 'none';
    if (loginStep2) loginStep2.style.display = 'none';
    
    // Show register step 1
    const regStep1 = document.getElementById('register-flow-step-1');
    const regStep2 = document.getElementById('register-flow-step-2');
    if (regStep1) regStep1.style.display = 'block';
    if (regStep2) regStep2.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const regCameraFeed = document.getElementById('reg-camera-feed');
    const regCameraPreview = document.getElementById('reg-camera-preview');
    const regBtnCapture = document.getElementById('reg-btn-capture');
    const regBtnSave = document.getElementById('reg-btn-save');
    const regStatusMsg = document.getElementById('reg-status-message');
    
    let regLocalStream = null;
    let regCapturedImageBase64 = null;

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            document.getElementById('register-flow-step-1').style.display = 'none';
            document.getElementById('register-flow-step-2').style.display = 'block';
            
            regStatusMsg.textContent = "Activando cámara...";
            regStatusMsg.style.color = "var(--text-muted)";
            
            try {
                regLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                regCameraFeed.srcObject = regLocalStream;
                regCameraFeed.style.display = 'block';
                regCameraPreview.style.display = 'none';
                regBtnCapture.style.display = 'block';
                regBtnSave.style.display = 'none';
                regStatusMsg.textContent = "Por favor, enfoca tu rostro";
            } catch (err) {
                console.error("Camera error:", err);
                regStatusMsg.textContent = "Error de cámara: " + err.message;
                regStatusMsg.style.color = "#ff4d4d";
            }
        });
    }

    if (regBtnCapture) {
        regBtnCapture.addEventListener('click', () => {
            if (!regLocalStream) return;
            const canvas = document.createElement('canvas');
            canvas.width = regCameraFeed.videoWidth || 640;
            canvas.height = regCameraFeed.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(regCameraFeed, 0, 0, canvas.width, canvas.height);
            regCapturedImageBase64 = canvas.toDataURL('image/jpeg');

            // Stop local stream
            regLocalStream.getTracks().forEach(track => track.stop());
            regLocalStream = null;

            regCameraFeed.style.display = 'none';
            regCameraPreview.src = regCapturedImageBase64;
            regCameraPreview.style.display = 'block';

            regBtnCapture.style.display = 'none';
            regBtnSave.style.display = 'block';
            regStatusMsg.textContent = "Rostro capturado. Listo para guardar.";
            regStatusMsg.style.color = "#00ff88";
        });
    }

    if (regBtnSave) {
        regBtnSave.addEventListener('click', async () => {
            regStatusMsg.textContent = "Procesando registro... Por favor espera.";
            regStatusMsg.style.color = "var(--accent)";
            regBtnSave.style.display = 'none';

            if (!supabaseClient) {
                regStatusMsg.textContent = "Error: Configura tu SUPABASE_KEY en main.js";
                regStatusMsg.style.color = "#ff4d4d";
                regBtnSave.style.display = 'block';
                return;
            }

            try {
                // 1. Convert base64 to Blob for Supabase Storage
                const arr = regCapturedImageBase64.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--) { u8arr[n] = bstr.charCodeAt(n); }
                const blob = new Blob([u8arr], {type: mime});

                // 2. Upload photo to 'fotos' bucket
                const fileName = `profile_${Date.now()}.jpg`;
                const { error: storageError } = await supabaseClient.storage
                    .from('fotos')
                    .upload(fileName, blob, { contentType: 'image/jpeg' });
                
                if (storageError) throw storageError;

                const { data: publicData } = supabaseClient.storage.from('fotos').getPublicUrl(fileName);
                const photoUrl = publicData.publicUrl;

                // 3. Insert user record to 'usuarios' table
                const nombre = document.getElementById('reg-nombre').value;
                const email = document.getElementById('reg-email').value;
                const username = document.getElementById('reg-username').value;
                const password = document.getElementById('reg-password').value; // En un SaaS real esto va hasheado en Auth

                const { error: dbError } = await supabaseClient
                    .from('usuarios')
                    .insert([{
                        nombre_completo: nombre,
                        correo: email,
                        usuario: username,
                        clave_hash: password, 
                        foto_url: photoUrl
                    }]);

                if (dbError) throw dbError;

                regStatusMsg.textContent = "Registro completado correctamente";
                regStatusMsg.style.color = "#00ff88";

                // Return to clean state after 3 seconds
                setTimeout(() => {
                    document.getElementById('auth-modal').classList.remove('active');
                    registerForm.reset();
                    regCameraPreview.style.display = 'none';
                    regStatusMsg.textContent = "";
                }, 3000);

            } catch(e) {
                console.error("Register Error:", e);
                regStatusMsg.textContent = "Error en el registro: " + (e.message || "Revisa si el bucket existe.");
                regStatusMsg.style.color = "#ff4d4d";
                regBtnSave.style.display = 'block';
            }
        });
    }
});
