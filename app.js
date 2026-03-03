window.addEventListener('error', function (event) {
    if (typeof mostrarToast === 'function') {
        mostrarToast('Erro interno: ' + event.message, 'error');
    }
});
// ==========================================
// ESTADO E VARIÃVEIS GLOBAIS
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

const sistemaIframe = document.getElementById("sistemaIframe");
const iframeTitle = document.getElementById("iframeTitle");
const iframeIcon = document.getElementById("iframeIcon");
const iframeFallbackIcon = document.getElementById("iframeFallbackIcon");
const openExternalBtn = document.getElementById("openExternalBtn");
const dashboardTitle = document.getElementById("dashboardTitle");
const iframeAlert = document.getElementById("iframeAlert");

const subMenuEmpresas = document.getElementById("subMenuEmpresas");
const arrowEmpresas = document.getElementById("arrowEmpresas");
const linkPainel = document.getElementById("linkPainel");
const btnToggleView = document.getElementById("btnToggleView");

// ==========================================
// INICIALIZAÃ‡ÃƒO E EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('nexus_auth') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const userEmail = localStorage.getItem('nexus_user');
    if (userEmail) {
        const username = userEmail.split('@')[0];
        document.querySelector('.admin_name').innerText = username.charAt(0).toUpperCase() + username.slice(1);
    }

    sidebarBtn.onclick = function () {
        sidebar.classList.toggle("active");
    }

    if (btnToggleView) {
        atualizarIconeToggle();
        btnToggleView.addEventListener('click', () => {
            currentViewMode = currentViewMode === 'table' ? 'grid' : 'table';
            localStorage.setItem('nexus_view_mode', currentViewMode);
            atualizarIconeToggle();
            renderizarViews();
            mostrarToast(currentViewMode === 'table' ? "visão em Lista ativada." : "visão em Grid ativada.", "info");
        });
    }

    const siteUrlField = document.getElementById('siteUrl');
    if (siteUrlField) {
        siteUrlField.addEventListener('blur', applyMagicAutoFill);
    }

    carregarDados();

    if (form) form.addEventListener('submit', salvarEmpresa);

    const cnpjEmpresaField = document.getElementById('cnpjEmpresa');
    if (cnpjEmpresaField) {
        cnpjEmpresaField.addEventListener('blur', applyCNPJAutoFill);
    }

    // Auto fill para pinos de Lojistas no mapa
    const pinCnpjField = document.getElementById('pinCnpj');
    if (pinCnpjField) {
        pinCnpjField.addEventListener('blur', applyMapCNPJAutoFill);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', filtrarEmpresas);
});

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

async function applyCNPJAutoFill(e) {
    let rawValue = e.target.value.trim();
    let cnpj = rawValue.replace(/\D/g, '');
    if (cnpj.length !== 14) return;

    mostrarToast("Buscando dados da Receita e IBGE...", "info");

    try {
        let response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) throw new Error("CNPJ não encontrado na base");
        let data = await response.json();

        let nomeField = document.getElementById('nomeEmpresa');
        if (!nomeField.value) nomeField.value = data.nome_fantasia || data.razao_social;

        let telefoneField = document.getElementById('telefone');
        if (!telefoneField.value && data.ddd_telefone_1) {
            telefoneField.value = data.ddd_telefone_1;
        }

        let tipoField = document.getElementById('tipoItem');
        if (!tipoField.value) tipoField.value = 'empresa';

        let localidadeInfo = "";
        let endereco = "";
        if (data.logradouro) {
            endereco = `${data.logradouro}, ${data.numero}, ${data.municipio}, ${data.uf}`;
            localidadeInfo = endereco;
        } else {
            endereco = `${data.municipio}, ${data.uf}`;
            localidadeInfo = endereco;
        }

        if (endereco) {
            let geocodeResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`);
            let geoData = await geocodeResp.json();

            if (geoData && geoData.length > 0) {
                e.target.dataset.lat = geoData[0].lat;
                e.target.dataset.lng = geoData[0].lon;
                e.target.dataset.endereco = localidadeInfo;
            }
        }

        mostrarToast("Cadastro Empresarial e Localização puxados via API!", "success");
    } catch (err) {
        mostrarToast(err.message, "error");
    }
}

async function applyMapCNPJAutoFill(e) {
    let rawValue = e.target.value.trim();
    let cnpj = rawValue.replace(/\D/g, '');
    if (cnpj.length !== 14) return;

    mostrarToast("Buscando dados no Mapa...", "info");

    try {
        let response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) throw new Error("CNPJ não encontrado");
        let data = await response.json();

        let nomeField = document.getElementById('pinNome');
        if (!nomeField.value) nomeField.value = data.nome_fantasia || data.razao_social;

        let telefoneField = document.getElementById('pinContato');
        if (!telefoneField.value && data.ddd_telefone_1) {
            telefoneField.value = data.ddd_telefone_1;
        }

        let addressField = document.getElementById('pinObs');
        let endereco = "";

        if (data.logradouro) {
            endereco = `${data.logradouro}, ${data.numero}, ${data.municipio}, ${data.uf}`;
        } else {
            endereco = `${data.municipio}, ${data.uf}`;
        }

        if (!addressField.value) addressField.value = "Endereço: " + endereco;

        if (endereco) {
            let geocodeResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`);
            let geoData = await geocodeResp.json();

            if (geoData && geoData.length > 0) {
                document.getElementById("pinLat").value = geoData[0].lat;
                document.getElementById("pinLng").value = geoData[0].lon;
                mostrarToast("Localização encontrada com sucesso!", "success");
            } else {
                mostrarToast("Preenchido! Mas Endereço não mapeável via Satélite. Clique no mapa manualmente.", "error");
            }
        }
    } catch (err) {
        mostrarToast(err.message, "error");
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
// NAVEGAÃ‡ÃƒO / VIEWS (PAINEL vs IFRAME)
// ==========================================
function mostrarPainel() {
    mainColumn.style.display = 'block';
    iframeColumn.style.display = 'none';
    if (mapColumn) mapColumn.style.display = 'none';

    dashboardTitle.innerText = "Painel de Controle";

    setTimeout(() => {
        if (sistemaIframe) sistemaIframe.src = '';
    }, 300);

    document.querySelectorAll(".nav-links a").forEach(l => l.classList.remove("active"));
    linkPainel.classList.add("active");
}

function abrirIframeFullScreen(url, nomeEmpresa, empresaId) {
    if (!url || url === 'undefined') {
        mostrarToast("Este item não possui um link cadastrado.", "error");
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    mainColumn.style.display = 'none';
    if (mapColumn) mapColumn.style.display = 'none';
    iframeColumn.style.display = 'flex';

    if (url.includes("docs.google.com/spreadsheets") || url.includes("excel")) {
        iframeAlert.style.display = 'block';
    } else {
        iframeAlert.style.display = 'none';
    }

    dashboardTitle.innerText = "Visualização: " + nomeEmpresa;

    iframeTitle.innerText = nomeEmpresa;
    iframeIcon.src = getClearbitLogoUrl(url, nomeEmpresa);
    iframeIcon.onerror = function () {
        window.handleImageError(this, getGoogleFaviconUrl(url, nomeEmpresa), getUiAvatarUrl(nomeEmpresa));
    };
    iframeIcon.style.display = 'inline-block';
    iframeFallbackIcon.style.display = 'none';

    // NOTAS DO IFRAME
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

    openExternalBtn.href = url;

    mostrarToast("Abrindo... Dica: Se ficar branco, use o botão de 'Abrir em nova aba'", "success");
    sistemaIframe.src = url;

    document.querySelectorAll(".nav-links a").forEach(l => l.classList.remove("active"));
}

function toggleNotesPanel() {
    const panel = document.getElementById('iframeNotesPanel');
    if (panel) {
        if (panel.style.width === '0px' || panel.style.width === '0') {
            panel.style.width = '250px';
        } else {
            panel.style.width = '0px';
        }
    }
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
        subMenuEmpresas.innerHTML = "<li style='padding-left:15px; font-size:12px; color:var(--text-secondary);'>Nenhum item cadastrado</li>";
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
// FUNÃ‡Ã•ES DE CRUD E LOCAL STORAGE
// ==========================================
function getUserPrefix() {
    return localStorage.getItem('nexus_user') || 'default';
}

function carregarDados() {
    const prefix = getUserPrefix();
    const dadosSalvos = localStorage.getItem('nexus_empresas_' + prefix);
    if (dadosSalvos) {
        empresas = JSON.parse(dadosSalvos);
    } else {
        // Fallback p/ n perder dados no sistema anterior sem user logado
        const oldData = localStorage.getItem('nexus_empresas');
        if (oldData) {
            empresas = JSON.parse(oldData);
            // Salva no novo pra migrar
            localStorage.setItem('nexus_empresas_' + prefix, oldData);
            localStorage.removeItem('nexus_empresas'); // Migration completa
        }
    }
    renderizarViews();
    atualizarDashboard();
    renderizarSidebarLogos();
    renderizarPinosTopbar();
}

function salvarDados() {
    const prefix = getUserPrefix();
    localStorage.setItem('nexus_empresas_' + prefix, JSON.stringify(empresas));
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

function salvarEmpresa(e) {
    e.preventDefault();

    const nomeEmpresa = document.getElementById('nomeEmpresa').value.trim();
    const cnpjEmpresa = document.getElementById('cnpjEmpresa') ? document.getElementById('cnpjEmpresa').value.trim() : "";
    const nomeContato = document.getElementById('nomeContato').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const tipoItem = document.getElementById('tipoItem').value;
    const status = document.getElementById('status').value;
    const siteUrl = document.getElementById('siteUrl').value.trim();


    if (!nomeEmpresa || !tipoItem) {
        mostrarToast("Preencha o Nome e o Tipo para continuar!", "error");
        return;
    }

    const editandoTarget = empresas.find(emp => emp.id === editandoId);

    const novaEmpresa = {
        id: editandoId || Date.now().toString(),
        nome: nomeEmpresa,
        cnpj: cnpjEmpresa || "-",
        contato: nomeContato || "-",
        telefone: telefone || "-",
        tipo: tipoItem,
        origem: tipoItem,
        status: status,
        siteUrl: siteUrl,
        notas: editandoTarget ? editandoTarget.notas : "",
        arquivos: editandoTarget && editandoTarget.arquivos ? editandoTarget.arquivos : [],
        isPinned: editandoTarget ? editandoTarget.isPinned : false,
        dataCadastro: editandoTarget ? editandoTarget.dataCadastro : new Date().toISOString()
    };

    let cnpjField = document.getElementById('cnpjEmpresa');
    if (cnpjField && cnpjField.dataset.lat && cnpjField.dataset.lng && !editandoId) {
        const novoPin = {
            id: novaEmpresa.id,
            nome: novaEmpresa.nome,
            contato: novaEmpresa.telefone !== "-" ? novaEmpresa.telefone : "",
            status: 'ativo',
            obs: "Adicionado Automaticamente.\nEndereço: " + cnpjField.dataset.endereco,
            lat: parseFloat(cnpjField.dataset.lat),
            lng: parseFloat(cnpjField.dataset.lng),
            data: new Date().toISOString()
        };

        if (typeof locaisLojistas !== 'undefined' && typeof salvarPinosLocais === 'function') {
            locaisLojistas.push(novoPin);
            salvarPinosLocais();
        }

        delete cnpjField.dataset.lat;
        delete cnpjField.dataset.lng;
        delete cnpjField.dataset.endereco;
    }

    if (editandoId) {
        const index = empresas.findIndex(emp => emp.id === editandoId);
        empresas[index] = novaEmpresa;
        mostrarToast("Cadastro atualizado com sucesso!");
    } else {
        empresas.unshift(novaEmpresa);
        mostrarToast("Cadastrado com sucesso!");
    }

    salvarDados();
    renderizarViews();
    fecharModal();
}

function deletarEmpresa(id) {
    if (confirm("Tem certeza que deseja excluir este registro? Esta Ação nÃ£o pode ser desfeita.")) {
        empresas = empresas.filter(emp => emp.id !== id);
        salvarDados();
        renderizarViews();
        mostrarPainel();
        mostrarToast("Registro Excluído com sucesso!", "success");
    }
}

function prepararEdicao(id) {
    const empresa = empresas.find(emp => emp.id === id);
    if (empresa) {
        editandoId = id;

        document.getElementById('modalTitle').innerText = "Editar Cadastro / Integração";
        document.getElementById('empresaId').value = empresa.id;
        document.getElementById('nomeEmpresa').value = empresa.nome;
        if (document.getElementById('cnpjEmpresa')) document.getElementById('cnpjEmpresa').value = (empresa.cnpj && empresa.cnpj !== "-") ? empresa.cnpj : "";
        document.getElementById('nomeContato').value = empresa.contato !== "-" ? empresa.contato : "";
        document.getElementById('telefone').value = empresa.telefone !== "-" ? empresa.telefone : "";

        const dropDownTipo = (empresa.tipo || empresa.origem) === 'site' ? 'sistema' : (empresa.tipo || empresa.origem);

        document.getElementById('tipoItem').value = dropDownTipo;
        document.getElementById('status').value = empresa.status;
        document.getElementById('siteUrl').value = empresa.siteUrl || '';

        document.getElementById('btnSalvar').innerText = "Atualizar Cadastro";

        modal.classList.add('active');
    }
}

// ==========================================
// FUNÃ‡Ã•ES DE UI E RENDERIZAÃ‡ÃƒO
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
        'manutencao': 'MANUTENÃ‡ÃƒO',
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
        emptyState.classList.add('show');
        if (tableContainer) tableContainer.style.display = 'none';
        if (gridEmpresas) gridEmpresas.style.display = 'none';
        return;
    }

    emptyState.classList.remove('show');

    if (currentViewMode === 'table') {
        if (gridEmpresas) gridEmpresas.style.display = 'none';
        if (tableContainer) {
            tableContainer.style.display = 'block';
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



                const tdActionEdit = document.createElement('td');

                const btnDocs = document.createElement('button');
                btnDocs.className = "action-btn";
                btnDocs.title = "Documentos e Arquivos";
                btnDocs.innerHTML = "<i class='bx bx-folder'></i>";
                btnDocs.onclick = () => window.abrirPerfilCliente(emp.id);
                btnDocs.style.color = "var(--primary-color)";

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
        if (tableContainer) tableContainer.style.display = 'none';
        if (gridEmpresas) {
            gridEmpresas.style.display = 'grid';
            gridEmpresas.innerHTML = '';
            lista.forEach(emp => {
                const card = document.createElement('div');
                card.className = "grid-card";
                const urlValue = emp.siteUrl || '';
                const cssStatusReal = getStatusClass(emp.status);
                const tipoView = formatarTipo(emp.tipo || emp.origem);

                card.ondblclick = () => {
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
                actionsDiv.appendChild(btnDocs);
                actionsDiv.appendChild(btnEdit);
                actionsDiv.appendChild(btnDelete);

                card.appendChild(imgLogo);
                card.appendChild(titleDiv);
                card.appendChild(subtitleDiv);
                card.appendChild(badgeDiv);
                card.appendChild(actionsDiv);

                gridEmpresas.appendChild(card);
            });
        }
    }
}

function renderizarTabela() {
    renderizarViews();
}

function atualizarDashboard() {
    const elTotalEmpresas = document.getElementById('totalEmpresas');
    if (elTotalEmpresas) elTotalEmpresas.innerText = empresas.length;

    const viaSistema = empresas.filter(emp => (emp.tipo === 'sistema' || emp.origem === 'sistema' || emp.origem === 'site')).length;
    const elSistemas = document.getElementById('totalSistemas');
    if (elSistemas) elSistemas.innerText = viaSistema;

    const viaApp = empresas.filter(emp => (emp.tipo === 'app' || emp.origem === 'app')).length;
    const elApps = document.getElementById('totalApps');
    if (elApps) elApps.innerText = viaApp;

    const viaPlanilhas = empresas.filter(emp => (emp.tipo === 'planilha' || emp.origem === 'planilha')).length;
    const elPlanilhas = document.getElementById('totalPlanilhas');
    if (elPlanilhas) elPlanilhas.innerText = viaPlanilhas;
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
// SISTEMA DE NOTIFICAÃ‡Ã•ES (TOAST)
// ==========================================
function mostrarToast(mensagem, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = "toast toast-" + tipo;

    const icone = tipo === 'success' ? 'bx-check-circle' : tipo === 'info' ? 'bx-info-circle' : 'bx-error-circle';

    toast.innerHTML = "<i class='bx " + icone + "'></i><div class='toast-content'><p>" + mensagem + "</p></div>";

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function fazerLogout() {
    localStorage.removeItem('nexus_auth');
    localStorage.removeItem('nexus_user');
    window.location.href = 'login.html';
}

// ==========================================
// MÃ“DULO DE MAPA DO BRASIL (LEAFLET)
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

function abrirModalNovoClienteMapa() {
    abrirModalPin('', '');
    mostrarToast("Digite o CNPJ para buscar os dados automaticamente!", "info");
}
window.abrirModalNovoClienteMapa = abrirModalNovoClienteMapa;

function obterIconePin(status) {
    let color = status === 'ativo' ? '#2ecc71' : status === 'prospect' ? '#f39c12' : '#e74c3c';
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
            <div style="min-width: 180px; padding: 5px; font-family: 'Inter', sans-serif;">
                <h4 style="margin:0 0 5px 0; color:#333; font-size:14px;">${local.nome}</h4>
                <p style="margin:0; font-size:12px; color:#666;"><strong>Situação:</strong> ${local.status.toUpperCase()}</p>
                ${local.contato ? `<p style="margin:5px 0 0 0; font-size:12px; font-weight:bold; color:var(--primary-color);"><i class='bx bx-phone'></i> ${local.contato}</p>` : ''}
                ${local.obs ? `<p style="margin:8px 0 0 0; font-size:11px; border-top:1px solid #eee; padding-top:5px; color:#555;">${local.obs}</p>` : ''}
                <div style="margin-top: 10px; display:flex; flex-direction:column; gap:6px;">
                    <button class="btn-primary" style="font-size:12px; padding:6px 8px; border-radius:4px; cursor:pointer; width: 100%; display:flex; align-items:center; justify-content:center; gap:5px;" onclick="abrirPerfilCliente('${local.id}', 'lojista'); return false;">
                        <i class='bx bx-folder-open'></i> Abrir Arquivos
                    </button>
                    <button class="btn-secondary" style="font-size:11px; padding:4px 8px; border-radius:4px; cursor:pointer; width: 100%; text-align:center;" onclick="prepararEdicaoPin('${local.id}'); return false;">
                        Editar / Excluir
                    </button>
                </div>
            </div>
        `);
        pinsLayer.addLayer(marker);
    });
}

function mostrarMapa() {
    mainColumn.style.display = 'none';
    iframeColumn.style.display = 'none';
    mapColumn.style.display = 'block';

    document.getElementById("dashboardTitle").innerText = "Mapa de Lojistas e Clientes";

    const allLinks = document.querySelectorAll(".nav-links a");
    allLinks.forEach(l => l.classList.remove("active"));
    const linkMapa = document.getElementById("linkMapa");
    if (linkMapa) linkMapa.classList.add("active");

    initMap();
    setTimeout(() => { map.invalidateSize(); }, 300);
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

function salvarLojistaLocal(e) {
    e.preventDefault();
    const nome = document.getElementById("pinNome").value.trim();
    if (!nome) return;

    const latStr = document.getElementById("pinLat").value;
    const lngStr = document.getElementById("pinLng").value;
    const pinCnpj = document.getElementById("pinCnpj") ? document.getElementById("pinCnpj").value : "";

    if (!latStr || !lngStr) {
        mostrarToast("Endereço não localizado pelo CNPJ e nenhum ponto no mapa foi clicado!", "error");
        return;
    }

    const novoPin = {
        id: editandoPinId || Date.now().toString(),
        nome: nome,
        contato: document.getElementById("pinContato").value.trim(),
        status: document.getElementById("pinStatus").value,
        obs: document.getElementById("pinObs").value.trim() + (pinCnpj ? "\nCNPJ: " + pinCnpj : ""),
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
        data: new Date().toISOString()
    };

    if (editandoPinId) {
        const index = locaisLojistas.findIndex(l => l.id === editandoPinId);
        if (index > -1) {
            locaisLojistas[index] = novoPin;
        }
        mostrarToast("Local atualizado com sucesso!", "success");
    } else {
        locaisLojistas.push(novoPin);
        mostrarToast("Lojista adicionado no mapa!", "success");
    }

    salvarPinosLocais();
    fecharModalPin();
    map.closePopup();
}

function prepararEdicaoPin(id) {
    const local = locaisLojistas.find(l => l.id === id);
    if (!local) return;

    map.closePopup();
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

function deletarPinSelecionado() {
    if (!editandoPinId) return;
    if (confirm("Remover este local do mapa?")) {
        locaisLojistas = locaisLojistas.filter(l => l.id !== editandoPinId);
        salvarPinosLocais();
        fecharModalPin();
        mostrarToast("Local removido!", "info");
    }
}

window.mostrarMapa = mostrarMapa;
window.fecharModalPin = fecharModalPin;
window.prepararEdicaoPin = prepararEdicaoPin;
window.deletarPinSelecionado = deletarPinSelecionado;

// ==========================================
// MÃ“DULO DE PERFIL / ARQUIVOS
// ==========================================
// MÓDULO DE PERFIL / ARQUIVOS

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

    const perfilModal = document.getElementById("perfilModal");
    if (!perfilModal) return;

    document.getElementById("perfilNome").innerText = cliente.nome;
    document.getElementById("perfilCNPJ").innerText = (cliente.cnpj && cliente.cnpj !== "-") ? "CNPJ: " + cliente.cnpj : "Arquivos do Lojista / Cliente";

    if (!cliente.arquivos) cliente.arquivos = [];

    renderizarArquivosCliente();
    perfilModal.classList.add("active");
}

function fecharPerfil() {
    const perfilModal = document.getElementById("perfilModal");
    if (perfilModal) perfilModal.classList.remove("active");
    clientePerfilId = null;
    document.getElementById('fileUploadInput').value = '';
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!clientePerfilId) return;

    if (file.size > 1.5 * 1024 * 1024) {
        mostrarToast("Selecione um arquivo de até 1.5MB.", "error");
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
            mostrarToast("Upload concluido!", "success");
        } catch (error) {
            mostrarToast("Memória cheia! Exclua outros arquivos.", "error");
            cliente.arquivos.pop();
            if (clientePerfilTipo === 'lojista') salvarPinosLocais(); else salvarDados();
        }
    };
    reader.onerror = function () {
        mostrarToast("Erro na leitura do arquivo.", "error");
    };
    reader.readAsDataURL(file);
}

function renderizarArquivosCliente() {
    const container = document.getElementById("listaArquivosContainer");
    if (!container) return;
    container.innerHTML = "";

    const cliente = obterClienteContexto();
    if (!cliente || !cliente.arquivos || cliente.arquivos.length === 0) {
        container.innerHTML = "<p style='color:#999; font-size:13px; text-align:center; padding:10px;'>Nenhum arquivo adicionado.</p>";
        return;
    }

    cliente.arquivos.forEach(arq => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        div.style.padding = "10px";
        div.style.border = "1px solid #ddd";
        div.style.borderRadius = "8px";
        div.style.marginBottom = "8px";
        div.style.backgroundColor = "#fff";

        const typeColor = arq.icon === 'bx-file-pdf' ? '#e74c3c' : (arq.icon === 'bx-image' ? '#3498db' : '#95a5a6');

        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; width:75%;">
                <i class='bx ${arq.icon}' style='font-size:24px; color:${typeColor}'></i>
                <div style="max-width:90%">
                    <h5 style="margin:0; font-size:13px; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${arq.name}</h5>
                    <p style="margin:0; font-size:11px; color:#888;">${arq.size} - ${arq.date}</p>
                </div>
            </div>
            <div style="display:flex; gap: 8px;">
                <button title="Baixar / Visualizar" class="action-btn" onclick="visualizarArquivo('${arq.id}')" style="color:var(--primary-color)"><i class='bx bx-cloud-download'></i></button>
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
            mostrarToast("Iniciando download...", "info");
        });
}

function deletarArquivo(idArq) {
    if (!confirm("Certeza que quer apagar definitivamente este arquivo?")) return;

    const cliente = obterClienteContexto();
    if (!cliente || !cliente.arquivos) return;

    cliente.arquivos = cliente.arquivos.filter(a => a.id !== idArq);
    if (clientePerfilTipo === 'lojista') {
        salvarPinosLocais();
    } else {
        salvarDados();
    }
    renderizarArquivosCliente();
    mostrarToast("Arquivo excluido!", "success");
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
    if (docModal) docModal.classList.add('active');
    const currentTheme = localStorage.getItem('nexus_theme') || 'light';
    const select = document.getElementById('themeSelect');
    if (select) select.value = currentTheme;
}

function fecharConfiguracoes() {
    const docModal = document.getElementById('configModal');
    if (docModal) docModal.classList.remove('active');
}

function aplicarTema(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function mudarTema() {
    const select = document.getElementById('themeSelect');
    if (select) {
        const theme = select.value;
        localStorage.setItem('nexus_theme', theme);
        aplicarTema(theme);
    }
}

window.abrirConfiguracoes = abrirConfiguracoes;
window.fecharConfiguracoes = fecharConfiguracoes;
window.mudarTema = mudarTema;

const themeOnLoad = localStorage.getItem('nexus_theme') || 'dark';
aplicarTema(themeOnLoad);

// ==========================================
// ALTERAR LOGIN (EMAIL/SENHA) NAS CONFIGURAÇÕES
// ==========================================
function salvarNovoLogin() {
    const novoEmail = document.getElementById('configNovoEmail') ? document.getElementById('configNovoEmail').value.trim() : '';
    const novaSenha = document.getElementById('configNovaSenha') ? document.getElementById('configNovaSenha').value : '';
    const confirmarSenha = document.getElementById('configConfirmarSenha') ? document.getElementById('configConfirmarSenha').value : '';

    if (!novoEmail && !novaSenha) {
        mostrarToast('Preencha ao menos um campo para alterar.', 'error');
        return;
    }

    if (novaSenha && novaSenha !== confirmarSenha) {
        mostrarToast('As senhas não coincidem!', 'error');
        return;
    }

    if (novaSenha && novaSenha.length < 4) {
        mostrarToast('A senha precisa ter pelo menos 4 caracteres.', 'error');
        return;
    }

    const emailAtual = localStorage.getItem('nexus_user');
    const usuariosStr = localStorage.getItem('nexus_usuarios');
    let usuarios = usuariosStr ? JSON.parse(usuariosStr) : [];
    const idx = usuarios.findIndex(u => u.email === emailAtual);

    if (idx === -1) {
        mostrarToast('Usuário não encontrado no sistema.', 'error');
        return;
    }

    if (novoEmail && novoEmail !== emailAtual) {
        const emailJaExiste = usuarios.find(u => u.email === novoEmail && novoEmail !== emailAtual);
        if (emailJaExiste) {
            mostrarToast('Este e-mail já está cadastrado.', 'error');
            return;
        }
        // Migrar dados do usuário para o novo email
        const dadosAntigos = localStorage.getItem('nexus_empresas_' + emailAtual);
        const pinsAntigos = localStorage.getItem('nexus_map_pins_' + emailAtual);
        if (dadosAntigos) {
            localStorage.setItem('nexus_empresas_' + novoEmail, dadosAntigos);
            localStorage.removeItem('nexus_empresas_' + emailAtual);
        }
        if (pinsAntigos) {
            localStorage.setItem('nexus_map_pins_' + novoEmail, pinsAntigos);
            localStorage.removeItem('nexus_map_pins_' + emailAtual);
        }
        usuarios[idx].email = novoEmail;
        localStorage.setItem('nexus_user', novoEmail);
        const adminName = document.querySelector('.admin_name');
        if (adminName) {
            const username = novoEmail.split('@')[0];
            adminName.innerText = username.charAt(0).toUpperCase() + username.slice(1);
        }
    }

    if (novaSenha) {
        usuarios[idx].senha = novaSenha;
    }

    localStorage.setItem('nexus_usuarios', JSON.stringify(usuarios));
    mostrarToast('Dados de acesso atualizados com sucesso!', 'success');

    if (document.getElementById('configNovoEmail')) document.getElementById('configNovoEmail').value = '';
    if (document.getElementById('configNovaSenha')) document.getElementById('configNovaSenha').value = '';
    if (document.getElementById('configConfirmarSenha')) document.getElementById('configConfirmarSenha').value = '';
}

window.salvarNovoLogin = salvarNovoLogin;

// ==========================================
// EXPOR FUNÇÕES GLOBALMENTE (type="module" fix)
// ==========================================
window.mostrarPainel = mostrarPainel;
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.toggleSubMenuEmpresas = toggleSubMenuEmpresas;
window.toggleNotesPanel = toggleNotesPanel;
window.filtrarEmpresas = filtrarEmpresas;
window.mostrarToast = mostrarToast;
window.fazerLogout = fazerLogout;
