// ==========================================
// ESTADO E VARIÁVEIS GLOBAIS
// ==========================================
let empresas = [];
let editandoId = null;
let currentViewMode = localStorage.getItem('nexus_view_mode') || 'table';

// ==========================================
// SELETORES DE ELEMENTOS
// ==========================================
const sidebar = document.querySelector(".sidebar");
const sidebarBtn = document.querySelector(".sidebarBtn");
const modal = document.getElementById("formModal");
const form = document.getElementById("empresaForm");
const tabelaBody = document.getElementById("tabelaEmpresas");
const tableContainer = document.getElementById("tableContainer");
const gridEmpresas = document.getElementById("gridEmpresas");
const emptyState = document.getElementById("emptyState");
const toastContainer = document.getElementById("toastContainer");
const topbarPins = document.getElementById("topbarPins");

const mainColumn = document.getElementById("mainColumn");
const iframeColumn = document.getElementById("iframeColumn");
const mapColumn = document.getElementById("mapColumn");
const clientesColumn = document.getElementById("clientesColumn");

const sistemaIframe = document.getElementById("sistemaIframe");
const iframeTitle = document.getElementById("iframeTitle");
const iframeIcon = document.getElementById("iframeIcon");
const iframeFallbackIcon = document.getElementById("iframeFallbackIcon");
const openExternalBtn = document.getElementById("openExternalBtn");
const dashboardTitle = document.getElementById("dashboardTitle");
const iframeAlert = document.getElementById("iframeAlert");

const subMenuEmpresas = document.getElementById("subMenuEmpresas");
const arrowEmpresas = document.getElementById("arrowEmpresas");
const liPainel = document.getElementById("liPainel");
const liMapa = document.getElementById("liMapa");
const liClientes = document.getElementById("liClientes");
const btnToggleView = document.getElementById("btnToggleView");

const pinCnpjInput = document.getElementById("pinCnpj");

// ==========================================
// INICIALIZAÇÃO E EVENTOS
// ==========================================
function init() {
    if (localStorage.getItem('nexus_auth') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const userEmail = localStorage.getItem('nexus_user');
    if (userEmail) {
        const username = userEmail.split('@')[0];
        const adminName = document.querySelector('.admin_name');
        if (adminName) adminName.innerText = username.charAt(0).toUpperCase() + username.slice(1);
    }

    if (sidebarBtn && sidebar) {
        sidebarBtn.onclick = function () {
            sidebar.classList.toggle("active");
        }
    }

    if (btnToggleView) {
        atualizarIconeToggle();
        btnToggleView.addEventListener('click', () => {
            currentViewMode = currentViewMode === 'table' ? 'grid' : 'table';
            localStorage.setItem('nexus_view_mode', currentViewMode);
            atualizarIconeToggle();
            renderizarViews();
            mostrarToast(currentViewMode === 'table' ? "Visão em Lista ativada." : "Visão em Grid ativada.", "info");
        });
    }

    const siteUrlField = document.getElementById('siteUrl');
    if (siteUrlField) {
        siteUrlField.addEventListener('blur', applyMagicAutoFill);
    }

    carregarDados();

    if (form) {
        form.addEventListener('submit', salvarEmpresa);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarEmpresas);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        const s = document.getElementById('searchInput');
        if (s) {
            s.focus();
            s.select();
        }
    }
    if (e.shiftKey && e.code === 'KeyN') {
        if (!modal.classList.contains('active')) {
            e.preventDefault();
            abrirModal();
        }
    }
});

function atualizarIconeToggle() {
    if (currentViewMode === 'grid') {
        btnToggleView.className = "bx bx-list-ul view-toggle-btn";
        btnToggleView.title = "Ver como Lista";
    } else {
        btnToggleView.className = "bx bx-grid-alt view-toggle-btn";
        btnToggleView.title = "Ver como Grid";
    }
}

function applyMagicAutoFill(e) {
    let url = e.target.value.trim();
    if (!url) return;

    try {
        let domainStr = url.startsWith('http') ? url : 'https://' + url;
        let domainHostname = new URL(domainStr).hostname.replace('www.', '');
        if (!domainHostname) return;

        let principalWord = domainHostname.split('.')[0];
        let nomeCapitalized = principalWord.charAt(0).toUpperCase() + principalWord.slice(1);

        let nomeField = document.getElementById('nomeEmpresa');
        if (!nomeField.value) nomeField.value = nomeCapitalized;

        let tipoField = document.getElementById('tipoItem');
        if (!tipoField.value) {
            if (url.includes('docs.google') || url.includes('excel')) {
                tipoField.value = 'planilha';
            } else if (url.includes('.gov.br')) {
                tipoField.value = 'sistema';
            } else {
                tipoField.value = 'sistema';
            }
        }
    } catch (err) {
    }
}

function getClearbitLogoUrl(url, nome) {
    let domain = "";
    if (url && url !== "-") {
        try {
            let domainStr = url.startsWith('http') ? url : 'https://' + url;
            domain = new URL(domainStr).hostname.replace('www.', '');
        } catch (e) { }
    }

    if (!domain && nome) {
        domain = nome.toLowerCase().trim().replace(/\s+/g, '') + '.com.br';
    }

    if (domain) {
        return 'https://logo.clearbit.com/' + domain + '?size=128';
    }

    return getUiAvatarUrl(nome);
}

function getGoogleFaviconUrl(url, nome) {
    let domain = "";
    if (url && url !== "-") {
        try {
            let domainStr = url.startsWith('http') ? url : 'https://' + url;
            domain = new URL(domainStr).hostname;
        } catch (e) { }
    }
    if (domain) {
        return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
    }
    return getUiAvatarUrl(nome);
}

function getUiAvatarUrl(nome) {
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(nome || 'A') + '&background=random&color=fff';
}

window.handleImageError = function (img, fallbackUrl, avatarUrl) {
    if (img.src === avatarUrl) return;
    img.onerror = null;
    img.src = fallbackUrl;
    setTimeout(() => {
        if (img.naturalWidth <= 16 && img.src.includes('google')) {
            img.src = avatarUrl;
        }
    }, 1000);
};

// ==========================================
// NAVEGAÇÃO / VIEWS (PAINEL vs IFRAME)
// ==========================================
function mostrarPainel() {
    mainColumn.classList.remove('hidden');
    iframeColumn.classList.add('hidden');
    if (mapColumn) mapColumn.classList.add('hidden');
    if (clientesColumn) clientesColumn.classList.add('hidden');

    dashboardTitle.innerText = "Painel de Controle";

    setTimeout(() => {
        if (sistemaIframe) sistemaIframe.src = '';
    }, 300);

    // Atualiza classes active na sidebar
    document.querySelectorAll(".nav-links li").forEach(li => li.classList.remove("active"));
    if (liPainel) liPainel.classList.add("active");
}

function mostrarClientes() {
    mainColumn.classList.add('hidden');
    iframeColumn.classList.add('hidden');
    if (mapColumn) mapColumn.classList.add('hidden');
    if (clientesColumn) clientesColumn.classList.remove('hidden');

    dashboardTitle.innerText = "Gestão de Clientes";

    document.querySelectorAll(".nav-links li").forEach(li => li.classList.remove("active"));
    if (liClientes) liClientes.classList.add("active");

    renderizarTabelaClientes();
}

function abrirIframeFullScreen(url, nomeEmpresa, empresaId) {
    if (!url || url === 'undefined') {
        mostrarToast("Este item não possui um link cadastrado.", "error");
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    mainColumn.classList.add('hidden');
    if (mapColumn) mapColumn.classList.add('hidden');
    if (clientesColumn) clientesColumn.classList.add('hidden');
    iframeColumn.classList.remove('hidden');

    dashboardTitle.innerText = "Visualização: " + nomeEmpresa;
    iframeTitle.innerText = nomeEmpresa;
    
    // Seletor de ícone se ainda existir no HTML novo
    if (iframeIcon) {
        iframeIcon.src = getClearbitLogoUrl(url, nomeEmpresa);
        iframeIcon.style.display = 'inline-block';
    }
    if (iframeFallbackIcon) iframeFallbackIcon.style.display = 'none';

    if (empresaId) {
        let emp = empresas.find(e => e.id === empresaId);
        const iframeNotes = document.getElementById("iframeNotes");
        if (iframeNotes) {
            iframeNotes.value = emp ? (emp.notas || "") : "";
            iframeNotes.oninput = (e) => {
                if (emp) {
                    emp.notas = e.target.value;
                    salvarDados();
                }
            };
        }
    }

    if (openExternalBtn) openExternalBtn.href = url;
    mostrarToast("Abrindo sistema...", "info");
    sistemaIframe.src = url;

    document.querySelectorAll(".nav-links li").forEach(li => li.classList.remove("active"));
}

function toggleSubMenuEmpresas() {
    if (subMenuEmpresas.style.display === "none" || subMenuEmpresas.style.display === "") {
        subMenuEmpresas.style.display = "block";
        arrowEmpresas.className = "bx bx-chevron-up";
    } else {
        subMenuEmpresas.style.display = "none";
        arrowEmpresas.className = "bx bx-chevron-down";
    }
}

function renderizarSidebarLogos() {
    subMenuEmpresas.innerHTML = "";
    if (empresas.length === 0) {
        subMenuEmpresas.innerHTML = "<li style='padding-left:15px; font-size:12px; color:var(--text-muted);'>Nenhum item cadastrado</li>";
        return;
    }

    empresas.forEach(emp => {
        const urlToUse = emp.siteUrl || '';
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";

        if (urlToUse) {
            a.onclick = (e) => {
                e.preventDefault();
                document.querySelectorAll(".nav-links a").forEach(l => l.classList.remove("active"));
                a.classList.add("active");
                abrirIframeFullScreen(urlToUse, emp.nome, emp.id);
            };
        } else {
            a.onclick = (e) => {
                e.preventDefault();
                mostrarToast("Sem link de acesso!", "error");
            }
            a.style.opacity = '0.5';
        }

        const img = document.createElement("img");
        img.src = getClearbitLogoUrl(urlToUse, emp.nome);
        img.onerror = function () {
            window.handleImageError(this, getGoogleFaviconUrl(urlToUse, emp.nome), getUiAvatarUrl(emp.nome));
        };
        img.alt = emp.nome;

        const span = document.createElement("span");
        span.className = "company-name";
        span.innerText = emp.nome.length > 20 ? emp.nome.substring(0, 17) + "..." : emp.nome;

        a.appendChild(img);
        a.appendChild(span);
        li.appendChild(a);
        subMenuEmpresas.appendChild(li);
    });
}

function renderizarPinosTopbar() {
    if (!topbarPins) return;
    topbarPins.innerHTML = "";

    const pinados = empresas.filter(emp => emp.isPinned === true);

    pinados.forEach(emp => {
        const urlToUse = emp.siteUrl || '';
        const img = document.createElement("img");
        img.src = getClearbitLogoUrl(urlToUse, emp.nome);
        img.onerror = function () {
            window.handleImageError(this, getGoogleFaviconUrl(urlToUse, emp.nome), getUiAvatarUrl(emp.nome));
        };
        img.alt = emp.nome;
        img.title = "Abrir " + emp.nome;

        img.onclick = () => {
            if (urlToUse) {
                abrirIframeFullScreen(urlToUse, emp.nome, emp.id);
            } else {
                mostrarToast("Este atalho não possui URL cadastrada.", "error");
            }
        };

        topbarPins.appendChild(img);
    });
}

// ==========================================
// FUNÇÕES DE CRUD E LOCAL STORAGE
// ==========================================
function getUserPrefix() {
    return localStorage.getItem('nexus_user') || 'default';
}

/**
 * Helper Universal para chamadas de API (Serverless no Vercel)
 */
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'x-user-prefix': getUserPrefix()
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`/api/${endpoint}`, options);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.warn(`Fallback: Erro ao acessar API central (${endpoint}). Verifique se o banco está conectado.`);
        return null;
    }
}

async function carregarDados() {
    // 1. Tentar carregar Integrações (Empresas) da Nuvem
    const dEmpresas = await fetchAPI('empresas');
    if (dEmpresas && Array.isArray(dEmpresas)) {
        empresas = dEmpresas;
    } else {
        const prefix = getUserPrefix();
        const dLocal = localStorage.getItem('nexus_empresas_' + prefix);
        if (dLocal) empresas = JSON.parse(dLocal);
    }
    
    // 2. Tentar carregar Lojistas (Mapa) da Nuvem
    const dClientes = await fetchAPI('clientes');
    if (dClientes && Array.isArray(dClientes)) {
        locaisLojistas = dClientes;
    } else {
        const prefix = getUserPrefix();
        const dLocalMap = localStorage.getItem('nexus_map_pins_' + prefix);
        if (dLocalMap) locaisLojistas = JSON.parse(dLocalMap);
    }

    renderizarViews();
    atualizarDashboard();
    renderizarSidebarLogos();
    renderizarPinosTopbar();
    if (pinsLayer) renderizarPinosNoMapa(); // Atualiza mapa se carregado
}

async function salvarDados(forceCloud = true) {
    const prefix = getUserPrefix();
    // Sempre salva um backup no LocalStorage por segurança
    localStorage.setItem('nexus_empresas_' + prefix, JSON.stringify(empresas));
    
    // Tenta salvar na nuvem se solicitado
    if (forceCloud) {
        // Nota: O salvamento individual é feito na salvarEmpresa
        // mas aqui podemos disparar um sync se necessário futuramente.
    }
    
    atualizarDashboard();
    renderizarSidebarLogos();
    renderizarPinosTopbar();
}

function togglePin(id) {
    const empresa = empresas.find(emp => emp.id === id);
    if (empresa) {
        empresa.isPinned = !empresa.isPinned;
        salvarDados();
        renderizarViews();
    }
}

window.togglePin = togglePin;
window.abrirIframeFullScreen = abrirIframeFullScreen;
window.prepararEdicao = prepararEdicao;
window.deletarEmpresa = deletarEmpresa;

async function salvarEmpresa(e) {
    if (e) e.preventDefault();

    const nomeEmpresa = document.getElementById('nomeEmpresa')?.value.trim() || "";
    const cnpjEmpresa = document.getElementById('cnpjEmpresa')?.value.trim() || "-";
    const nomeContato = document.getElementById('nomeContato')?.value.trim() || "-";
    const telefone = document.getElementById('telefone')?.value.trim() || "-";
    const tipoItem = document.getElementById('tipoItem')?.value || "sistema";
    const status = document.getElementById('status')?.value || "ativo";
    const siteUrl = document.getElementById('siteUrl')?.value.trim() || "";
    const loginCofre = document.getElementById('loginCofre')?.value.trim() || "";
    const senhaCofre = document.getElementById('senhaCofre')?.value.trim() || "";

    if (!nomeEmpresa || !tipoItem) {
        mostrarToast("Preencha o Nome e o Tipo para continuar!", "error");
        return;
    }

    const editandoTarget = empresas.find(emp => emp.id === editandoId);

    const dadosEmpresa = {
        id: editandoId,
        nome: nomeEmpresa,
        siteUrl: siteUrl,
        tipo: tipoItem,
        status: status,
        nomeContato: nomeContato,
        telefone: telefone,
        loginCofre: loginCofre,
        senhaCofre: senhaCofre,
        notas: editandoTarget ? editandoTarget.notas : ""
    };

    // UI Feedback
    const btnSalvar = document.getElementById('btnSalvar');
    const btnTextOriginal = btnSalvar ? btnSalvar.innerText : "Salvar";
    if (btnSalvar) {
        btnSalvar.innerText = "Sincronizando...";
        btnSalvar.disabled = true;
    }

    // 1. Sincronizar com a Nuvem (Postgres)
    const result = await fetchAPI('empresas', 'POST', dadosEmpresa);

    if (result && (result.success || result.id)) {
        if (!editandoId && result.id) dadosEmpresa.id = result.id;
        
        if (editandoId) {
            const index = empresas.findIndex(emp => emp.id === editandoId);
            if (index !== -1) empresas[index] = { ...empresas[index], ...dadosEmpresa };
        } else {
            empresas.unshift(dadosEmpresa);
        }
        
        mostrarToast(editandoId ? "Atualizado na Nuvem!" : "Cadastrado na Nuvem!", "success");
        salvarDados(false); // Backup local
        fecharModal();
        renderizarViews();
    } else {
        // Fallback Local
        mostrarToast("Erro de rede. Salve localmente por enquanto.", "warning");
        const novaLocal = { ...dadosEmpresa, id: editandoId || Date.now().toString() };
        if (editandoId) {
            const index = empresas.findIndex(emp => emp.id === editandoId);
            if (index !== -1) empresas[index] = novaLocal;
        } else {
            empresas.unshift(novaLocal);
        }
        salvarDados(false);
        fecharModal();
        renderizarViews();
    }
    
    if (btnSalvar) {
        btnSalvar.innerText = btnTextOriginal;
        btnSalvar.disabled = false;
    }
}

async function deletarEmpresa(id) {
    if (confirm("Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.")) {
        // 1. Deletar na Nuvem
        const result = await fetchAPI('empresas', 'DELETE', { id });
        
        if (result && result.success) {
            mostrarToast("Excluído da Nuvem!", "info");
        } else {
            mostrarToast("Excluído apenas localmente (sem conexão).", "warning");
        }

        empresas = empresas.filter(emp => emp.id !== id);
        salvarDados(false);
        renderizarViews();
        mostrarPainel();
    }
}

function prepararEdicao(id) {
    const empresa = empresas.find(emp => emp.id === id);
    if (empresa) {
        editandoId = id;
        document.getElementById('modalTitle').innerText = "Editar Cadastro / Integração";
        document.getElementById('empresaId').value = empresa.id || '';
        document.getElementById('nomeEmpresa').value = empresa.nome || '';
        if (document.getElementById('cnpjEmpresa')) document.getElementById('cnpjEmpresa').value = (empresa.cnpj && empresa.cnpj !== "-") ? empresa.cnpj : "";
        document.getElementById('nomeContato').value = (empresa.nomeContato && empresa.nomeContato !== "-") ? empresa.nomeContato : "";
        document.getElementById('telefone').value = (empresa.telefone && empresa.telefone !== "-") ? empresa.telefone : "";

        const dropDownTipo = empresa.tipo === 'site' ? 'sistema' : (empresa.tipo || 'sistema');
        document.getElementById('tipoItem').value = dropDownTipo;
        document.getElementById('status').value = empresa.status || 'ativo';
        document.getElementById('siteUrl').value = empresa.siteUrl || '';
        if (document.getElementById('loginCofre')) document.getElementById('loginCofre').value = empresa.loginCofre || '';
        if (document.getElementById('senhaCofre')) document.getElementById('senhaCofre').value = empresa.senhaCofre || '';

        document.getElementById('btnSalvar').innerText = "Atualizar Cadastro";
        modal.classList.add('active');
    }
}

// ==========================================
// FUNÇÕES DE UI E RENDERIZAÇÃO
// ==========================================
function abrirModal() {
    editandoId = null;
    form.reset();
    document.getElementById('modalTitle').innerText = "Novo Cadastro / Integração";
    document.getElementById('btnSalvar').innerText = "Concluir Cadastro";
    document.getElementById('empresaId').value = '';
    modal.classList.add('active');
}

function fecharModal() {
    modal.classList.remove('active');
    setTimeout(() => {
        form.reset();
        editandoId = null;
    }, 300);
}

function formatarTipo(tipo) {
    const mapa = {
        'sistema': 'Sistema / Site',
        'site': 'Sistema / Site',
        'app': 'Aplicativo Mobile',
        'planilha': 'Planilha',
        'empresa': 'Empresa Cliente',
        'outro': 'Outro / Dashboard',
    };
    return mapa[tipo] || tipo;
}

function formatarStatus(status) {
    const mapa = {
        'novo': 'NOVO',
        'ativo': 'ATIVO',
        'manutencao': 'MANUTENÇÃO',
        'arquivado': 'INATIVO',
        'em_contato': 'CONTATO',
        'ganho': 'ATIVO',
        'proposta': 'ALERTA',
        'perdido': 'INATIVO'
    };
    return mapa[status] || status.toUpperCase();
}

function getStatusClass(status) {
    const mapa = {
        'novo': 'novo',
        'ativo': 'ganho',
        'manutencao': 'em_contato',
        'arquivado': 'perdido',
        'ganho': 'ganho',
        'perdido': 'perdido',
        'em_contato': 'em_contato',
        'proposta': 'proposta'
    };
    return mapa[status] || 'novo';
}

function renderizarViews(dados = null) {
    const lista = dados || empresas;

    if (lista.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (tableContainer) tableContainer.classList.add('hidden');
        if (gridEmpresas) gridEmpresas.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    if (currentViewMode === 'table') {
        if (gridEmpresas) gridEmpresas.classList.add('hidden');
        if (tableContainer) {
            tableContainer.classList.remove('hidden');
            tabelaBody.innerHTML = '';
            lista.forEach(emp => {
                const urlValue = emp.siteUrl || '';
                const cssStatusReal = getStatusClass(emp.status);
                const tipoView = emp.tipo || emp.origem;
                const disableLinkClass = !urlValue ? 'opacity: 0.3; cursor: not-allowed;' : '';

                const tr = document.createElement('tr');

                const tdNome = document.createElement('td');
                const divContainer = document.createElement('div');
                divContainer.style.display = 'flex';
                divContainer.style.alignItems = 'center';
                divContainer.style.gap = '10px';

                const imgLogo = document.createElement('img');
                imgLogo.src = getClearbitLogoUrl(urlValue, emp.nome);
                imgLogo.style.width = '20px';
                imgLogo.style.height = '20px';
                imgLogo.style.objectFit = 'contain';
                imgLogo.style.borderRadius = '4px';
                imgLogo.onerror = function () {
                    window.handleImageError(this, getGoogleFaviconUrl(urlValue, emp.nome), getUiAvatarUrl(emp.nome));
                };

                const bNome = document.createElement('strong');
                bNome.innerText = emp.nome;

                divContainer.appendChild(imgLogo);
                divContainer.appendChild(bNome);
                tdNome.appendChild(divContainer);

                const tdPin = document.createElement('td');
                const btnPin = document.createElement('button');
                btnPin.className = "star-btn " + (emp.isPinned ? "pinned" : "");
                btnPin.title = "Fixar na Topbar";
                btnPin.onclick = () => window.togglePin(emp.id);
                const iPin = document.createElement('i');
                iPin.className = "bx " + (emp.isPinned ? "bxs-star" : "bx-star");
                btnPin.appendChild(iPin);
                tdPin.appendChild(btnPin);

                const tdTipo = document.createElement('td');
                tdTipo.innerText = formatarTipo(tipoView);

                const tdStatus = document.createElement('td');
                const spanStatus = document.createElement('span');
                spanStatus.className = "status-badge status-" + cssStatusReal;
                spanStatus.innerText = formatarStatus(emp.status);
                tdStatus.appendChild(spanStatus);

                const tdActionOpen = document.createElement('td');
                const btnAbrir = document.createElement('button');
                btnAbrir.className = "action-btn";
                btnAbrir.title = "Acessar";
                btnAbrir.style.cssText = "color: var(--primary-color); font-size: 14px; background: var(--primary-light); padding: 5px 10px; border-radius: 6px; " + disableLinkClass;
                btnAbrir.innerHTML = "<i class='bx bx-window-alt' style='vertical-align: middle;'></i> Abrir";
                btnAbrir.onclick = () => window.abrirIframeFullScreen(urlValue, emp.nome, emp.id);

                const btnCofre = document.createElement('button');
                btnCofre.className = "action-btn cofre-btn";
                btnCofre.title = "Ver Credenciais de Acesso";
                btnCofre.style.cssText = "color: #333; font-size: 14px; background: #e2e8f0; padding: 5px 10px; border-radius: 6px; margin-left:5px;";
                btnCofre.innerHTML = "<i class='bx bx-lock-alt' style='vertical-align: middle;'></i>";
                btnCofre.onclick = () => {
                    const l = emp.loginCofre || "Não cadastrado";
                    const s = emp.senhaCofre || "Não cadastrada";
                    alert(`🔐 CRENDENCIAIS DO COFRE\n\nLogin: ${l}\nSenha: ${s}`);
                };

                tdActionOpen.appendChild(btnAbrir);
                tdActionOpen.appendChild(btnCofre);

                const tdActionEdit = document.createElement('td');

                const btnDocs = document.createElement('button');
                btnDocs.className = "action-btn";
                btnDocs.title = "Documentos e Arquivos";
                btnDocs.innerHTML = "<i class='bx bx-folder'></i>";
                btnDocs.onclick = () => window.abrirPerfilCliente(emp.id);
                btnDocs.style.color = "var(--text-accent)";

                const btnEdit = document.createElement('button');
                btnEdit.className = "action-btn edit";
                btnEdit.title = "Editar";
                btnEdit.innerHTML = "<i class='bx bx-edit'></i>";
                btnEdit.onclick = () => window.prepararEdicao(emp.id);

                const btnDelete = document.createElement('button');
                btnDelete.className = "action-btn delete";
                btnDelete.title = "Excluir";
                btnDelete.innerHTML = "<i class='bx bx-trash'></i>";
                btnDelete.onclick = () => window.deletarEmpresa(emp.id);

                tdActionEdit.appendChild(btnDocs);
                tdActionEdit.appendChild(btnEdit);
                tdActionEdit.appendChild(btnDelete);

                tr.appendChild(tdNome);
                tr.appendChild(tdPin);
                tr.appendChild(tdTipo);
                tr.appendChild(tdStatus);
                tr.appendChild(tdActionOpen);
                tr.appendChild(tdActionEdit);

                tabelaBody.appendChild(tr);
            });
        }
    } else {
        if (tableContainer) tableContainer.classList.add('hidden');
        if (gridEmpresas) {
            gridEmpresas.classList.remove('hidden');
            gridEmpresas.style.display = 'grid'; // Grid precisa de display: grid
            gridEmpresas.innerHTML = '';
            lista.forEach(emp => {
                const card = document.createElement('div');
                card.className = "grid-card";
                const urlValue = emp.siteUrl || '';
                const cssStatusReal = getStatusClass(emp.status);
                const tipoView = formatarTipo(emp.tipo || emp.origem);

                card.onclick = () => {
                    if (urlValue) window.abrirIframeFullScreen(urlValue, emp.nome, emp.id);
                };

                const imgLogo = document.createElement('img');
                imgLogo.src = getClearbitLogoUrl(urlValue, emp.nome);
                imgLogo.className = 'grid-card-icon';
                imgLogo.onerror = function () {
                    window.handleImageError(this, getGoogleFaviconUrl(urlValue, emp.nome), getUiAvatarUrl(emp.nome));
                };

                const titleDiv = document.createElement('div');
                titleDiv.className = 'grid-card-title';
                titleDiv.innerText = emp.nome;

                const subtitleDiv = document.createElement('div');
                subtitleDiv.className = 'grid-card-subtitle';
                subtitleDiv.innerText = tipoView;

                const badgeDiv = document.createElement('div');
                badgeDiv.className = "grid-card-badge status-" + cssStatusReal + " status-badge";
                badgeDiv.innerText = formatarStatus(emp.status);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'grid-card-actions';

                const btnPin = document.createElement('button');
                btnPin.className = "star-btn " + (emp.isPinned ? "pinned" : "");
                btnPin.title = "Fixar na Topbar";
                btnPin.onclick = (e) => { e.stopPropagation(); window.togglePin(emp.id); };
                btnPin.innerHTML = "<i class='bx " + (emp.isPinned ? "bxs-star" : "bx-star") + "'></i>";

                const btnCofre = document.createElement('button');
                btnCofre.className = "action-btn";
                btnCofre.title = "Acessos do Cofre";
                btnCofre.onclick = (e) => {
                    e.stopPropagation();
                    const l = emp.loginCofre || "N/A";
                    const s = emp.senhaCofre || "N/A";
                    alert(`🔐 COFRE\nLogin: ${l}\nSenha: ${s}`);
                };
                btnCofre.innerHTML = "<i class='bx bx-lock-alt' style='color: #888;'></i>";

                const btnDocs = document.createElement('button');
                btnDocs.className = "action-btn";
                btnDocs.title = "Documentos e Arquivos";
                btnDocs.onclick = (e) => { e.stopPropagation(); window.abrirPerfilCliente(emp.id); };
                btnDocs.innerHTML = "<i class='bx bx-folder' style='color: var(--primary-color)'></i>";

                const btnEdit = document.createElement('button');
                btnEdit.className = "action-btn edit";
                btnEdit.title = "Editar";
                btnEdit.onclick = (e) => { e.stopPropagation(); window.prepararEdicao(emp.id); };
                btnEdit.innerHTML = "<i class='bx bx-edit'></i>";

                const btnDelete = document.createElement('button');
                btnDelete.className = "action-btn delete";
                btnDelete.title = "Excluir";
                btnDelete.onclick = (e) => { e.stopPropagation(); window.deletarEmpresa(emp.id); };
                btnDelete.innerHTML = "<i class='bx bx-trash'></i>";

                actionsDiv.appendChild(btnPin);
                actionsDiv.appendChild(btnCofre);
                actionsDiv.appendChild(btnDocs);
                actionsDiv.appendChild(btnEdit);
                actionsDiv.appendChild(btnDelete);

                const btnAcessar = document.createElement('button');
                btnAcessar.className = "btn btn-primary btn-sm btn-acessar";
                btnAcessar.innerHTML = "<i class='bx bx-window-alt'></i> Acessar Sistema";
                btnAcessar.onclick = (e) => {
                    e.stopPropagation();
                    if (urlValue) window.abrirIframeFullScreen(urlValue, emp.nome, emp.id);
                };

                card.appendChild(imgLogo);
                card.appendChild(titleDiv);
                card.appendChild(subtitleDiv);
                card.appendChild(badgeDiv);
                card.appendChild(btnAcessar); // Botão principal
                card.appendChild(actionsDiv); // Ações secundárias

                gridEmpresas.appendChild(card);
            });
        }
    }
}

function renderizarTabela() {
    renderizarViews();
}

function atualizarDashboard() {
    const totalSistemas = document.getElementById('countSistemas');
    if (totalSistemas) totalSistemas.innerText = empresas.length;

    const totalAlertas = document.getElementById('countAlertas');
    if (totalAlertas) {
        // Exemplo de cálculo: tipos 'urgente' ou 'alerta'
        const alertas = empresas.filter(e => e.status === 'alerta' || e.status === 'urgente').length;
        totalAlertas.innerText = alertas;
    }

    // Atualização de badges da sidebar
    const updateBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = count;
            if (count === 0) el.classList.add('zero');
            else el.classList.remove('zero');
        }
    };

    const count25 = empresas.filter(e => e.status === 'alerta').length;
    const count35 = empresas.filter(e => e.status === 'urgente').length;

    updateBadge('badgeAlertas', count25); 
    updateBadge('badgeAlertas35', count35);
    updateBadge('badgeAlertas45', 0);
}

function filtrarEmpresas(e) {
    const termo = e.target.value.toLowerCase();
    if (!termo) {
        renderizarViews();
        return;
    }
    const filtradas = empresas.filter(emp =>
        emp.nome.toLowerCase().includes(termo) ||
        (emp.contato && emp.contato.toLowerCase().includes(termo)) ||
        (emp.telefone && emp.telefone.includes(termo)) ||
        (emp.cnpj && emp.cnpj.includes(termo))
    );
    renderizarViews(filtradas);
}

// ==========================================
// SISTEMA DE NOTIFICAÇÕES (TOAST)
// ==========================================
function mostrarToast(mensagem, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = "toast toast-" + tipo;

    const icone = tipo === 'success' ? 'bx-check-circle' : tipo === 'info' ? 'bx-info-circle' : 'bx-error-circle';

    toast.innerHTML = `<i class='bx ${icone}'></i><div class='toast-content'><p>${mensagem}</p></div>`;

    if (toastContainer) {
        toastContainer.appendChild(toast);
    } else {
        const container = document.getElementById('toastContainer');
        if (container) container.appendChild(toast);
    }

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function fazerLogout() {
    localStorage.removeItem('nexus_auth');
    localStorage.removeItem('nexus_user');
    window.location.href = 'login.html';
}

// ==========================================
// MÓDULO DE MAPA DO BRASIL (LEAFLET)
// ==========================================
let map;
let pinsLayer;
let locaisLojistas = [];
let editandoPinId = null;

const pinModal = document.getElementById("pinModal");
const pinForm = document.getElementById("pinForm");

document.addEventListener('DOMContentLoaded', () => {
    carregarPinos();
    if (pinForm) {
        pinForm.addEventListener('submit', salvarLojistaLocal);
    }
    if (pinCnpjInput) {
        pinCnpjInput.addEventListener('blur', buscarCnpjNoMapa);
    }
});

function carregarPinos() {
    const prefix = getUserPrefix();
    const dadosMap = localStorage.getItem('nexus_map_pins_' + prefix);
    if (dadosMap) {
        locaisLojistas = JSON.parse(dadosMap);
    } else {
        const oldData = localStorage.getItem('nexus_map_pins');
        if (oldData) {
            locaisLojistas = JSON.parse(oldData);
            localStorage.setItem('nexus_map_pins_' + prefix, oldData);
            localStorage.removeItem('nexus_map_pins');
        }
    }
}

function salvarPinosLocais() {
    const prefix = getUserPrefix();
    localStorage.setItem('nexus_map_pins_' + prefix, JSON.stringify(locaisLojistas));
    if (pinsLayer) {
        renderizarPinosNoMapa();
    }
}

function initMap() {
    if (map) return;
    map = L.map('map', {
        doubleClickZoom: false
    }).setView([-14.235, -51.925], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    pinsLayer = L.layerGroup().addTo(map);

    function onMapClick(e) {
        abrirModalPin(e.latlng.lat, e.latlng.lng);
    }

    map.on('contextmenu', onMapClick);
    map.on('dblclick', onMapClick);
    renderizarPinosNoMapa();
}

function obterIconePin(status) {
    let color = status === 'ativo' ? '#FF4D00' : status === 'prospect' ? '#f39c12' : '#e74c3c';
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style='background-color:${color}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5);'></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function renderizarPinosNoMapa() {
    if (!pinsLayer) return;
    pinsLayer.clearLayers();
    locaisLojistas.forEach(local => {
        const marker = L.marker([local.lat, local.lng], { icon: obterIconePin(local.status) });
        marker.bindPopup(`
            <div class="map-popup-content">
                <h4>${local.nome}</h4>
                <p><strong>Situação:</strong> ${local.status.toUpperCase()}</p>
                ${local.contato ? `<p class="popup-contact"><i class='bx bx-phone'></i> ${local.contato}</p>` : ''}
                ${local.obs ? `<div class="popup-obs">${local.obs}</div>` : ''}
                <div class="popup-actions">
                    <button class="btn-secondary" style="font-size:10px; padding:4px 8px;" onclick="prepararEdicaoPin('${local.id}'); return false;">
                        Editar / Excluir
                    </button>
                    <button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-left: 5px;" onclick="window.abrirPerfilCliente('${local.id}', 'lojista'); return false;">
                        Arquivos
                    </button>
                </div>
            </div>
        `);
        pinsLayer.addLayer(marker);
    });
}

function mostrarMapa() {
    mainColumn.classList.add('hidden');
    iframeColumn.classList.add('hidden');
    if (clientesColumn) clientesColumn.classList.add('hidden');
    mapColumn.classList.remove('hidden');

    document.getElementById("dashboardTitle").innerText = "Mapa de Lojistas e Clientes";
    document.querySelectorAll(".nav-links li").forEach(li => li.classList.remove("active"));
    if (liMapa) liMapa.classList.add("active");
    initMap();
    setTimeout(() => { if(map) map.invalidateSize(); }, 300);
}

function abrirModalPin(lat, lng) {
    editandoPinId = null;
    if (pinForm) pinForm.reset();
    document.getElementById("pinLat").value = lat;
    document.getElementById("pinLng").value = lng;
    document.getElementById('pinModalTitle').innerText = "Novo Local: Lojista/Prospect";
    document.getElementById('btnSalvarPin').innerText = "Salvar Localização";
    document.getElementById('btnDeletePinContainer').style.display = 'none';
    pinModal.classList.add("active");
}

function fecharModalPin() {
    pinModal.classList.remove("active");
}

async function salvarLojistaLocal(e) {
    if (e) e.preventDefault();
    const nome = document.getElementById("pinNome").value.trim();
    if (!nome) return;

    const latStr = document.getElementById("pinLat").value;
    const lngStr = document.getElementById("pinLng").value;

    const oldPin = editandoPinId ? locaisLojistas.find(l => l.id === editandoPinId) : null;

    const novoPin = {
        id: editandoPinId,
        nome: nome,
        contato: document.getElementById("pinContato").value.trim(),
        status: document.getElementById("pinStatus").value,
        obs: document.getElementById("pinObs").value.trim(),
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
        arquivos: oldPin ? (oldPin.arquivos || []) : []
    };

    // UI Feedback
    const btnSalvar = document.getElementById('btnSalvarPin');
    const btnTextOriginal = btnSalvar.innerText;
    btnSalvar.innerText = "Sincronizando...";
    btnSalvar.disabled = true;

    // 1. Salvar na Nuvem (Postgres)
    const result = await fetchAPI('clientes', 'POST', novoPin);

    if (result && (result.success || result.id)) {
        if (!editandoPinId && result.id) novoPin.id = result.id;
        
        if (editandoPinId) {
            const index = locaisLojistas.findIndex(l => l.id === editandoPinId);
            if (index > -1) locaisLojistas[index] = { ...locaisLojistas[index], ...novoPin };
        } else {
            locaisLojistas.push(novoPin);
        }
        mostrarToast(editandoPinId ? "Local atualizado na nuvem!" : "Lojista salvo na nuvem!", "success");
    } else {
        mostrarToast("Erro de rede. Salvo localmente.", "warning");
        const pinLocal = { ...novoPin, id: editandoPinId || Date.now().toString() };
        if (editandoPinId) {
            const index = locaisLojistas.findIndex(l => l.id === editandoPinId);
            if (index > -1) locaisLojistas[index] = pinLocal;
        } else {
            locaisLojistas.push(pinLocal);
        }
    }

    salvarPinosLocais(); // Backup local + renderizarPinosNoMapa
    fecharModalPin();
    if(map) map.closePopup();
    
    btnSalvar.innerText = btnTextOriginal;
    btnSalvar.disabled = false;
}

function prepararEdicaoPin(id) {
    const local = locaisLojistas.find(l => l.id === id);
    if (!local) return;
    if(map) map.closePopup();
    editandoPinId = id;
    document.getElementById("pinLat").value = local.lat;
    document.getElementById("pinLng").value = local.lng;
    document.getElementById("pinNome").value = local.nome;
    document.getElementById("pinContato").value = local.contato || '';
    document.getElementById("pinStatus").value = local.status || 'ativo';
    document.getElementById("pinObs").value = local.obs || '';
    document.getElementById('pinModalTitle').innerText = "Editar Local (Lojista)";
    document.getElementById('btnSalvarPin').innerText = "Atualizar";
    document.getElementById('btnDeletePinContainer').style.display = 'block';
    pinModal.classList.add("active");
}

async function deletarPinSelecionado() {
    if (!editandoPinId) return;
    if (confirm("Remover este local do mapa? Esta ação será sincronizada com a nuvem.")) {
        // 1. Deletar na Nuvem
        const result = await fetchAPI('clientes', 'DELETE', { id: editandoPinId });
        
        if (result && result.success) {
            mostrarToast("Local removido da Nuvem!", "info");
        } else {
            mostrarToast("Local removido localmente.", "warning");
        }

        locaisLojistas = locaisLojistas.filter(l => l.id !== editandoPinId);
        salvarPinosLocais();
        fecharModalPin();
        if(map) map.closePopup();
    }
}

function resetarVisaoMapa() {
    if (map) {
        map.setView([-14.235, -51.925], 4);
        mostrarToast("Visão geral restaurada", "info");
    }
}

window.mostrarMapa = mostrarMapa;
window.mostrarClientes = mostrarClientes;
window.fecharModalPin = fecharModalPin;
window.prepararEdicaoPin = prepararEdicaoPin;
window.deletarPinSelecionado = deletarPinSelecionado;
window.resetarVisaoMapa = resetarVisaoMapa;
window.abrirModalNovoClienteMapa = () => {
    // Abre o mapa primeiro e depois o modal
    mostrarMapa();
    setTimeout(() => {
        abrirModalPin(-15.7942, -47.8822); // Centro de Brasília como fallback
    }, 500);
};

// ==========================================
// LÓGICA DE CLIENTES E CNPJ
// ==========================================

async function buscarCnpjNoMapa() {
    const cnpj = pinCnpjInput.value.replace(/\D/g, '');
    if (cnpj.length !== 14) return;

    mostrarToast("Buscando dados do CNPJ...", "info");
    
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) throw new Error("CNPJ não encontrado.");
        
        const data = await response.json();
        
        document.getElementById("pinNome").value = data.razao_social || data.nome_fantasia;
        document.getElementById("pinObs").value = `Endereço: ${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`;
        
        // Geocodificação via Nominatim (Free)
        const enderecoBusca = `${data.logradouro}, ${data.numero}, ${data.municipio}, ${data.uf}, Brasil`;
        mostrarToast("Localizando no mapa...", "info");
        
        const geoResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBusca)}`);
        const geoData = await geoResp.json();
        
        if (geoData && geoData.length > 0) {
            const { lat, lon } = geoData[0];
            const latNum = parseFloat(lat);
            const lonNum = parseFloat(lon);
            
            document.getElementById("pinLat").value = latNum;
            document.getElementById("pinLng").value = lonNum;
            
            if (map) {
                map.setView([latNum, lonNum], 16);
                
                // Adiciona um marcador temporário para feedback visual imediato
                if (pinsLayer) {
                    // Limpamos e renderizamos os existentes + o novo temporário
                    pinsLayer.clearLayers();
                    renderizarPinosNoMapa(); 
                    
                    L.marker([latNum, lonNum], { 
                        icon: obterIconePin('ativo') 
                    })
                    .addTo(pinsLayer)
                    .bindPopup(`<b>${data.razao_social || data.nome_fantasia}</b><br>Localização encontrada pelo CNPJ.`)
                    .openPopup();
                }
            }
            mostrarToast("Dados e localização encontrados!");
        } else {
            mostrarToast("Dados encontrados, mas localização geográfica não precisada.", "info");
        }
        
    } catch (err) {
        console.error("Erro CNPJ:", err);
        mostrarToast("Erro ao buscar CNPJ. Verifique os dados.", "error");
    }
}

function renderizarTabelaClientes() {
    const container = document.getElementById('listaLojistasLateral');
    if (!container) return;

    if (locaisLojistas.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; color: var(--text-muted);">
                <i class='bx bx-user-x' style='font-size: 48px; margin-bottom: 16px; display: block;'></i>
                <p>Nenhum cliente cadastrado no mapa.</p>
                <button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="window.abrirModalNovoClienteMapa()">Adicionar CNPJ no Mapa</button>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Cliente / Lojista</th>
                    <th>Status</th>
                    <th>Contato</th>
                    <th style="text-align: right;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    locaisLojistas.forEach(local => {
        html += `
            <tr>
                <td>
                    <strong>${local.nome}</strong><br>
                    <small style="color: var(--text-muted); font-size: 10px;">${local.id}</small>
                </td>
                <td>
                    <span class="status-badge status-${local.status === 'ativo' ? 'ganho' : 'proposta'}">
                        ${local.status.toUpperCase()}
                    </span>
                </td>
                <td>${local.contato || '-'}</td>
                <td style="text-align: right;">
                    <button class="action-btn" onclick="window.abrirPerfilCliente('${local.id}', 'lojista')">
                        <i class='bx bx-folder'></i>
                    </button>
                    <button class="action-btn edit" onclick="window.prepararEdicaoPin('${local.id}')">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="action-btn delete" onclick="window.deletarPinSelecionadoParaID('${local.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.deletarPinSelecionadoParaID = (id) => {
    editandoPinId = id;
    deletarPinSelecionado();
    renderizarTabelaClientes();
};

// ==========================================
// MÓDULO DE PERFIL / ARQUIVOS
// ==========================================
let clientePerfilId = null;
let clientePerfilTipo = 'empresa'; // 'empresa' ou 'lojista'

function obterClienteContexto() {
    if (clientePerfilTipo === 'lojista') {
        return locaisLojistas.find(l => l.id === clientePerfilId);
    }
    return empresas.find(e => e.id === clientePerfilId);
}

function abrirPerfilCliente(id, tipoContexto = 'empresa') {
    clientePerfilId = id;
    clientePerfilTipo = tipoContexto;

    const cliente = obterClienteContexto();
    if (!cliente) return;

    const perfilModal = document.getElementById('perfilModal');
    if (!perfilModal) return;

    document.getElementById('perfilNome').innerText = cliente.nome;
    document.getElementById('perfilCNPJ').innerText = (cliente.cnpj && cliente.cnpj !== '-') ? 'CNPJ: ' + cliente.cnpj : 'Arquivos do Lojista / Cliente';

    if (!cliente.arquivos) cliente.arquivos = [];

    renderizarArquivosCliente();
    perfilModal.classList.add('active');
}

function fecharPerfil() {
    const perfilModal = document.getElementById('perfilModal');
    if (perfilModal) perfilModal.classList.remove('active');
    clientePerfilId = null;
    document.getElementById('fileUploadInput').value = '';
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!clientePerfilId) return;

    if (file.size > 1.5 * 1024 * 1024) {
        mostrarToast('Selecione um arquivo de até 1.5MB.', 'error');
        document.getElementById('fileUploadInput').value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Data = e.target.result;
        const cliente = obterClienteContexto();
        if (!cliente) return;
        if (!cliente.arquivos) cliente.arquivos = [];

        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image');
        const icon = isPdf ? 'bx-file-pdf' : (isImage ? 'bx-image' : 'bx-file-blank');

        cliente.arquivos.push({
            id: Date.now().toString(),
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            type: file.type,
            icon: icon,
            dataUrl: base64Data,
            date: new Date().toLocaleDateString('pt-BR')
        });

        try {
            if (clientePerfilTipo === 'lojista') {
                salvarPinosLocais();
            } else {
                salvarDados();
            }
            renderizarArquivosCliente();
            mostrarToast('Upload concluído!', 'success');
        } catch (error) {
            mostrarToast('Memória cheia! Exclua outros arquivos.', 'error');
            cliente.arquivos.pop();
            if (clientePerfilTipo === 'lojista') salvarPinosLocais(); else salvarDados();
        }
    };
    reader.onerror = function () {
        mostrarToast('Erro na leitura do arquivo.', 'error');
    };
    reader.readAsDataURL(file);
}

function renderizarArquivosCliente() {
    const container = document.getElementById('listaArquivosContainer');
    if (!container) return;
    container.innerHTML = '';

    const cliente = obterClienteContexto();
    if (!cliente || !cliente.arquivos || cliente.arquivos.length === 0) {
        container.innerHTML = '<p style="color:#999; font-size:13px; text-align:center; padding:10px;">Nenhum arquivo adicionado.</p>';
        return;
    }

    cliente.arquivos.forEach(arq => {
        const div = document.createElement("div");
        div.className = "file-item-card";
        const typeColor = arq.icon === 'bx-file-pdf' ? 'var(--danger)' : (arq.icon === 'bx-image' ? 'var(--info)' : 'var(--text-muted)');

        div.innerHTML = `
            <div class="file-item-info">
                <i class='bx ${arq.icon}' style='font-size:24px; color:${typeColor}'></i>
                <div class="file-item-text">
                    <h5>${arq.name}</h5>
                    <p>${arq.size} - ${arq.date}</p>
                </div>
            </div>
            <div class="file-item-actions">
                <button title="Baixar / Visualizar" class="action-btn" onclick="visualizarArquivo('${arq.id}')"><i class='bx bx-cloud-download'></i></button>
                <button title="Excluir Arquivo" class="action-btn delete" onclick="deletarArquivo('${arq.id}')"><i class='bx bx-trash'></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function visualizarArquivo(idArq) {
    const cliente = obterClienteContexto();
    if (!cliente || !cliente.arquivos) return;
    const arq = cliente.arquivos.find(a => a.id === idArq);
    if (!arq) return;

    fetch(arq.dataUrl)
        .then(res => res.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = arq.name;
            link.click();
            window.URL.revokeObjectURL(link.href);
            mostrarToast('Iniciando download...', 'info');
        });
}

function deletarArquivo(idArq) {
    if (!confirm('Certeza que quer apagar definitivamente este arquivo?')) return;
    const cliente = obterClienteContexto();
    if (!cliente || !cliente.arquivos) return;
    cliente.arquivos = cliente.arquivos.filter(a => a.id !== idArq);
    if (clientePerfilTipo === 'lojista') {
        salvarPinosLocais();
    } else {
        salvarDados();
    }
    renderizarArquivosCliente();
    mostrarToast('Arquivo excluído!', 'success');
}

window.abrirPerfilCliente = abrirPerfilCliente;
window.fecharPerfil = fecharPerfil;
window.handleFileUpload = handleFileUpload;
window.visualizarArquivo = visualizarArquivo;
window.deletarArquivo = deletarArquivo;

// ==========================================
// MÓDULO DE CONFIGURAÇÕES / TEMA
// ==========================================
function abrirConfiguracoes() {
    const docModal = document.getElementById('configModal');
    if(docModal) docModal.classList.add('active');
    
    // Preencher dados do perfil
    const nome = localStorage.getItem('nexus_name') || '';
    const email = localStorage.getItem('nexus_user') || '';
    
    const inputNome = document.getElementById('configNome');
    const inputEmail = document.getElementById('configEmail');
    
    if(inputNome) inputNome.value = nome;
    if(inputEmail) inputEmail.value = email;

    const currentTheme = localStorage.getItem('nexus_theme') || 'light';
    const select = document.getElementById('themeSelect');
    if(select) select.value = currentTheme;
}

function switchConfigTab(tabId, el) {
    document.querySelectorAll('#configModal .modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#configModal .tab-content').forEach(c => c.classList.remove('active'));
    
    el.classList.add('active');
    const content = document.getElementById(tabId);
    if(content) content.classList.add('active');
}

async function salvarPerfil() {
    const novoNome = document.getElementById('configNome').value.trim();
    if(!novoNome) return mostrarToast('Nome é obrigatório', 'error');
    
    localStorage.setItem('nexus_name', novoNome);
    
    // Atualizar UI
    const nameDisplay = document.querySelector('.user-info .name');
    if(nameDisplay) nameDisplay.innerText = novoNome;
    
    // Sincronizar na lista de usuários (localStorage simulation)
    const email = localStorage.getItem('nexus_user');
    const usuarios = JSON.parse(localStorage.getItem('nexus_usuarios') || '[]');
    const uIdx = usuarios.findIndex(u => u.email === email);
    if(uIdx !== -1) {
        usuarios[uIdx].nome = novoNome;
        localStorage.setItem('nexus_usuarios', JSON.stringify(usuarios));
    }

    mostrarToast('Perfil atualizado com sucesso!', 'success');
}

function trocarSenha() {
    const atual = document.getElementById('senhaAtual').value;
    const nova = document.getElementById('novaSenha').value;
    const confirma = document.getElementById('confirmarNovaSenha').value;
    
    if(!atual || !nova || !confirma) return mostrarToast('Preencha os campos de senha', 'error');
    if(nova !== confirma) return mostrarToast('As senhas não coincidem', 'error');
    if(nova.length < 4) return mostrarToast('Mínimo 4 caracteres', 'error');
    
    const email = localStorage.getItem('nexus_user');
    const usuarios = JSON.parse(localStorage.getItem('nexus_usuarios') || '[]');
    const uIdx = usuarios.findIndex(u => u.email === email);
    
    if(uIdx === -1) return mostrarToast('Usuário não encontrado', 'error');
    
    if(usuarios[uIdx].senha !== atual) {
        return mostrarToast('Senha atual incorreta', 'error');
    }
    
    usuarios[uIdx].senha = nova;
    localStorage.setItem('nexus_usuarios', JSON.stringify(usuarios));
    
    // Limpar campos
    document.getElementById('senhaAtual').value = '';
    document.getElementById('novaSenha').value = '';
    document.getElementById('confirmarNovaSenha').value = '';
    
    mostrarToast('Senha alterada com sucesso!', 'success');
}

function fecharConfiguracoes() {
    const docModal = document.getElementById('configModal');
    if(docModal) docModal.classList.remove('active');
}

function aplicarTema(theme) {
    if(theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function mudarTema() {
    const select = document.getElementById('themeSelect');
    if(select) {
        const theme = select.value;
        localStorage.setItem('nexus_theme', theme);
        aplicarTema(theme);
        mostrarToast("Tema alterado!", "info");
    }
}

window.mostrarPainel = mostrarPainel;
window.mostrarMapa = mostrarMapa;
window.mostrarClientes = mostrarClientes;
window.abrirIframeFullScreen = abrirIframeFullScreen;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.abrirModalPin = abrirModalPin;
window.fecharModalPin = fecharModalPin;
window.salvarEmpresa = salvarEmpresa;
window.salvarLojistaLocal = salvarLojistaLocal;
window.prepararEdicao = prepararEdicao;
window.deletarEmpresa = deletarEmpresa;
window.abrirPerfilCliente = abrirPerfilCliente;
window.fecharPerfil = fecharPerfil;
window.handleFileUpload = handleFileUpload;
window.visualizarArquivo = visualizarArquivo;
window.deletarArquivo = deletarArquivo;
window.abrirConfiguracoes = abrirConfiguracoes;
window.fecharConfiguracoes = fecharConfiguracoes;
window.switchConfigTab = switchConfigTab;
window.salvarPerfil = salvarPerfil;
window.trocarSenha = trocarSenha;
window.mudarTema = mudarTema;
window.toggleNotesPanel = () => {
    const p = document.getElementById('iframeNotesPanel');
    if(p) p.classList.toggle('hidden');
};
window.fazerLogout = () => {
    localStorage.removeItem('nexus_auth');
    window.location.href = 'login.html';
};

const themeOnLoad = localStorage.getItem('nexus_theme') || 'light';
aplicarTema(themeOnLoad);