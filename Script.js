const API_BASE = "https://portfolio-api-three-black.vercel.app/api/v1";
let currentUser = null;
let editingProjectId = null;

// Inicializacion
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    document.getElementById('btn-save-project').addEventListener('click', handleSaveProject);

    // Enter para submit en login
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Enter para submit en register
    document.getElementById('register-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// Navegacion y Auth
function showView(viewName) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(viewName);
    if (targetView) {
        targetView.classList.add('active');
    }
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('userData');

    console.log('Verificando autenticacion...');
    console.log('Token:', token ? 'Existe' : 'No existe');
    console.log('User data:', user);

    if (token && user) {
        try {
            currentUser = JSON.parse(user);
            console.log('Usuario cargado:', currentUser);
            showView('home');
            loadProjects();
            updateUserDisplay();
        } catch (error) {
            console.error('Error al parsear userData:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            showView('login');
        }
    } else {
        console.log('No hay sesion activa');
        showView('login');
    }
}

function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.name;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    showView('login');
    showAlert('login-alert', 'Sesion cerrada correctamente', 'success');
}

// Alerts
function showAlert(containerId, message, type = 'error') {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    if (!email || !password) {
        showAlert('login-alert', 'Por favor completa todos los campos');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Iniciando sesion...';

    try {
        console.log('Intentando login con:', email);

        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Respuesta completa del login:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(data.message || 'Error al iniciar sesion');
        }

        // Verificar que tengamos token
        if (!data.token) {
            throw new Error('No se recibio token del servidor');
        }

        console.log('Token recibido:', data.token.substring(0, 20) + '...');

        // La API puede devolver el usuario de diferentes formas
        // Revisar todas las posibles ubicaciones
        let userData = data.user || data.usuario || data.data?.user;

        console.log('userData extraído:', userData);

        if (!userData || !userData.id) {
            console.warn('No se recibio informacion del usuario, usando email como referencia');
            // Si no viene el usuario, creamos uno básico
            userData = {
                id: data.userId || data.id || 'temp-id',
                email: email,
                name: data.name || email.split('@')[0],
                itsonId: data.itsonId || ''
            };
        }

        // Guardar token y datos de usuario
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(userData));
        currentUser = userData;

        console.log('Datos guardados correctamente');
        console.log('currentUser final:', currentUser);

        // Limpiar formulario
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';

        showView('home');
        loadProjects();
        updateUserDisplay();

    } catch (error) {
        console.error('Error en login:', error);
        showAlert('login-alert', error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Iniciar sesion';
    }
}

// Register
async function handleRegister() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const itsonId = document.getElementById('register-itsonid').value.trim();
    const password = document.getElementById('register-password').value;
    const btn = document.getElementById('btn-register');

    if (!name || !email || !itsonId || !password) {
        showAlert('register-alert', 'Por favor completa todos los campos');
        return;
    }

    if (name.length < 6) {
        showAlert('register-alert', 'El nombre debe tener al menos 6 caracteres');
        return;
    }

    if (itsonId.length !== 6 || !/^\d{6}$/.test(itsonId)) {
        showAlert('register-alert', 'El ITSON ID debe ser de 6 dígitos numéricos');
        return;
    }

    if (password.length < 6) {
        showAlert('register-alert', 'La contraseña debe tener al menos 6 caracteres');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, itsonId, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al registrar usuario');
        }

        showAlert('register-alert', 'Cuenta creada exitosamente. Ahora puedes iniciar sesion.', 'success');

        setTimeout(() => {
            showView('login');
            document.getElementById('login-email').value = email;
        }, 2000);

    } catch (error) {
        showAlert('register-alert', error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Crear cuenta';
    }
}

// Projects CRUD
async function loadProjects() {
    const container = document.getElementById('projects-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando proyectos...</p></div>';

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/projects`, {
            headers: { 'auth-token': token }
        });

        if (!response.ok) {
            throw new Error('Error al cargar proyectos');
        }

        const projects = await response.json();
        displayProjects(projects);

    } catch (error) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"></div>
                        <h3 class="empty-title">Error al cargar proyectos</h3>
                        <p class="empty-text">${error.message}</p>
                        <button class="btn" onclick="loadProjects()">Reintentar</button>
                    </div>
                `;
    }
}

function displayProjects(projects) {
    const container = document.getElementById('projects-container');

    if (projects.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📁</div>
                        <h3 class="empty-title">No tienes proyectos aún</h3>
                        <p class="empty-text">Comienza creando tu primer proyecto</p>
                        <button class="btn" onclick="openCreateModal()">+ Crear Proyecto</button>
                    </div>
                `;
        return;
    }

    const projectsHTML = projects.map(project => `
                <div class="project-card">
                    <div class="project-header">
                        <h3 class="project-title">${escapeHtml(project.title)}</h3>
                    </div>
                    <p class="project-description">${escapeHtml(project.description)}</p>
                    ${project.technologies && project.technologies.length > 0 ? `
                        <div class="project-tech">
                            ${project.technologies.map(tech => `<span class="tech-tag">${escapeHtml(tech)}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${project.repository ? `
                        <p style="margin-bottom: 16px; font-size: 14px;">
                            <a href="${escapeHtml(project.repository)}" target="_blank" class="link">Ver repositorio →</a>
                        </p>
                    ` : ''}
                    <div class="project-actions">
                        <button class="btn btn-small btn-secondary" onclick="openEditModal('${project._id}')">Editar</button>
                        <button class="btn btn-small btn-danger" onclick="confirmDelete('${project._id}')">Eliminar</button>
                    </div>
                </div>
            `).join('');

    container.innerHTML = `<div class="projects-grid">${projectsHTML}</div>`;
}

function openCreateModal() {
    editingProjectId = null;
    document.getElementById('modal-title').textContent = 'Nuevo Proyecto';
    document.getElementById('project-title').value = '';
    document.getElementById('project-description').value = '';
    document.getElementById('project-technologies').value = '';
    document.getElementById('project-repository').value = '';
    document.getElementById('project-images').value = '';
    document.getElementById('modal-alert').innerHTML = '';
    document.getElementById('project-modal').classList.add('active');
}

async function openEditModal(projectId) {
    editingProjectId = projectId;
    document.getElementById('modal-title').textContent = 'Editar Proyecto';
    document.getElementById('modal-alert').innerHTML = '';
    document.getElementById('project-modal').classList.add('active');

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
            headers: { 'auth-token': token }
        });

        if (!response.ok) throw new Error('Error al cargar proyecto');

        const project = await response.json();

        document.getElementById('project-title').value = project.title || '';
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-technologies').value = project.technologies ? project.technologies.join(', ') : '';
        document.getElementById('project-repository').value = project.repository || '';
        document.getElementById('project-images').value = project.images ? project.images.join(', ') : '';

    } catch (error) {
        showAlert('modal-alert', error.message);
    }
}

function closeModal() {
    document.getElementById('project-modal').classList.remove('active');
    editingProjectId = null;
}

async function handleSaveProject() {
    console.log('=== INICIANDO GUARDADO DE PROYECTO ===');

    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const technologiesStr = document.getElementById('project-technologies').value.trim();
    const repository = document.getElementById('project-repository').value.trim();
    const imagesStr = document.getElementById('project-images').value.trim();
    const btn = document.getElementById('btn-save-project');

    console.log('Valores del formulario:', { title, description, technologiesStr, repository, imagesStr });

    if (!title || !description) {
        showAlert('modal-alert', 'El título y la descripcion son obligatorios');
        return;
    }

    // Construir el objeto del proyecto
    // NO incluir userId - la API lo obtiene del token
    const projectData = {
        title,
        description,
        technologies: technologiesStr ? technologiesStr.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    // Solo agregar repository si tiene valor
    if (repository) {
        projectData.repository = repository;
    }

    // Solo agregar images si tiene valor
    if (imagesStr) {
        projectData.images = imagesStr.split(',').map(i => i.trim()).filter(Boolean);
    }

    console.log('Datos del proyecto a enviar:', projectData);

    btn.disabled = true;
    btn.textContent = editingProjectId ? 'Actualizando...' : 'Guardando...';

    try {
        const token = localStorage.getItem('authToken');

        console.log('Token encontrado:', token ? 'Sí (' + token.substring(0, 20) + '...)' : 'NO');

        if (!token) {
            throw new Error('No hay sesion activa. Por favor inicia sesion nuevamente.');
        }

        const url = editingProjectId
            ? `${API_BASE}/projects/${editingProjectId}`
            : `${API_BASE}/projects`;

        console.log('URL de la peticion:', url);
        console.log('Método:', editingProjectId ? 'PUT' : 'POST');

        const response = await fetch(url, {
            method: editingProjectId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'auth-token': token
            },
            body: JSON.stringify(projectData)
        });

        console.log('Status de la respuesta:', response.status, response.statusText);

        const data = await response.json();
        console.log('Respuesta completa del servidor:', data);

        if (!response.ok) {
            const errorMsg = data.message || data.error || data.msg || `Error ${response.status}: ${response.statusText}`;
            console.error('Error de la API:', errorMsg);
            throw new Error(errorMsg);
        }

        console.log('Proyecto guardado exitosamente');
        showAlert('modal-alert', `Proyecto ${editingProjectId ? 'actualizado' : 'creado'} exitosamente`, 'success');

        setTimeout(() => {
            closeModal();
            loadProjects();
        }, 1500);

    } catch (error) {
        console.error('Error capturado:', error);
        console.error('Stack:', error.stack);
        showAlert('modal-alert', 'Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Proyecto';
        console.log('=== FIN DEL PROCESO ===');
    }
}

async function confirmDelete(projectId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta accion no se puede deshacer.')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'auth-token': token }
        });

        if (!response.ok) {
            throw new Error('Error al eliminar proyecto');
        }

        loadProjects();

    } catch (error) {
        alert('Error al eliminar proyecto: ' + error.message);
    }
}

// Utilities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal on outside click
document.getElementById('project-modal').addEventListener('click', (e) => {
    if (e.target.id === 'project-modal') {
        closeModal();
    }
});