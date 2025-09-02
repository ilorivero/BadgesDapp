document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SELEÇÃO DOS ELEMENTOS DO DOM ---
    // Controles da carteira
    const connectButton = document.getElementById('connectButton');
    const disconnectButton = document.getElementById('disconnectButton');
    const walletInfoEl = document.getElementById('wallet-info');
    const walletAddressEl = document.getElementById('walletAddress');

    // Formulário de Registro
    const registerForm = document.getElementById('registerForm');
    const registerSection = document.getElementById('register-section');

    // Formulário de Consulta
    const queryButton = document.getElementById('queryButton');
    const queryAddressInput = document.getElementById('queryAddress');
    const badgeResultEl = document.getElementById('badgeResult');
    
    // Modal de Status
    const statusModal = document.getElementById('status-modal');
    const statusMessageEl = document.getElementById('status-message');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // --- 2. VARIÁVEIS DE ESTADO GLOBAL ---
    let provider;
    let signer;
    let contract;
    let contractInfo;
    const badgeTypeMap = ["Curso", "Projeto", "Evento", "Contribuição"];

    // --- 3. FUNÇÕES AUXILIARES ---

    const showStatus = (message) => {
        statusMessageEl.textContent = message;
        statusModal.classList.remove('modal-hidden');
    };
    
    const hideStatus = () => {
        statusModal.classList.add('modal-hidden');
    };

    /**
     * Atualiza a interface para o estado "Conectado".
     * @param {string} address - O endereço da carteira conectada.
     */
    const updateUIConnected = (address) => {
        walletAddressEl.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        connectButton.classList.add('hidden');
        walletInfoEl.classList.remove('hidden');
    };

    /**
     * Atualiza a interface para o estado "Desconectado".
     */
    const updateUIDisconnected = () => {
        walletAddressEl.textContent = '';
        connectButton.classList.remove('hidden');
        walletInfoEl.classList.add('hidden');
        registerSection.style.display = 'block'; // Mostra a seção de registro por padrão
    };


    // --- 4. FUNÇÕES PRINCIPAIS ---

    const init = async () => {
        try {
            const response = await fetch('/api/contract');
            if (!response.ok) throw new Error(`Falha ao buscar dados do contrato: ${response.statusText}`);
            contractInfo = await response.json();
            
            if (!contractInfo.address || contractInfo.address.startsWith("0x123")) {
                 showStatus("ERRO: Endereço do contrato não encontrado. Verifique seu arquivo .env no servidor e reinicie-o.");
                 return;
            }
            hideStatus(); 
        } catch (error) {
            console.error("Erro na inicialização:", error);
            showStatus(`Erro crítico na inicialização: ${error.message}. Verifique se o servidor está rodando.`);
        }
    };

    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') {
            return showStatus('MetaMask não está instalado! Por favor, instale a extensão para usar este DApp.');
        }
        
        try {
            showStatus('Conectando carteira...');
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            const walletAddress = await signer.getAddress();
            
            updateUIConnected(walletAddress);
            
            contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
            
            const owner = await contract.owner();
            if (walletAddress.toLowerCase() === owner.toLowerCase()) {
                registerSection.style.display = 'block';
            } else {
                registerSection.style.display = 'none';
            }
            hideStatus();
        } catch (error) {
            console.error("Erro ao conectar carteira:", error);
            showStatus(`Erro ao conectar: ${error.message}`);
        }
    };
    
    /**
     * Desconecta a carteira, limpando o estado da aplicação.
     */
    const disconnectWallet = () => {
        provider = null;
        signer = null;
        contract = null;
        updateUIDisconnected();
    };

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();
        if (!contract) return showStatus("Por favor, conecte sua carteira primeiro.");

        const recipient = document.getElementById('recipientAddress').value;
        const title = document.getElementById('badgeTitle').value;
        const description = document.getElementById('badgeDescription').value;
        const issuer = document.getElementById('issuerName').value;
        const evidenceUrl = document.getElementById('evidenceUrl').value;
        const badgeType = document.getElementById('badgeType').value;
        const expiry = document.getElementById('expiryDate').value || '0';

        if (!ethers.utils.isAddress(recipient)) {
            return showStatus("Endereço do recebedor é inválido.");
        }
        
        try {
            showStatus('Abra sua MetaMask para aprovar a transação...');
            const tx = await contract.registrarBadge(recipient, title, description, issuer, expiry, evidenceUrl, badgeType);
            showStatus('Aguardando a mineração da transação... Isso pode levar um momento.');
            await tx.wait();
            showStatus('Badge registrada com sucesso!');
            registerForm.reset();
        } catch (error) {
            console.error("Erro ao registrar badge:", error);
            const errorMessage = error.reason || (error.data ? error.data.message : error.message);
            showStatus(`Falha ao registrar: ${errorMessage}`);
        }
    };

    const handleQueryBadge = async () => {
        const reader = contract || (provider && new ethers.Contract(contractInfo.address, contractInfo.abi, provider));
        if (!reader) return showStatus("Por favor, conecte sua carteira ou recarregue a página se houver um erro.");

        const addressToQuery = queryAddressInput.value;
        if (!ethers.utils.isAddress(addressToQuery)) {
            badgeResultEl.innerHTML = '<p style="color: red;">Endereço inválido. Por favor, verifique.</p>';
            return;
        }

        try {
            badgeResultEl.innerHTML = '<p>Buscando badges...</p>';
            
            const titulos = await reader.getTitulosDasBadgesDoUsuario(addressToQuery);
            if (titulos.length === 0) {
                badgeResultEl.innerHTML = '<p style="color: orange;">Nenhuma badge foi encontrada para este endereço.</p>';
                return;
            }

            let htmlResult = `<h3>Encontrada(s) ${titulos.length} badge(s):</h3>`;

            for (const titulo of titulos) {
                const badge = await reader.getBadgePorTitulo(addressToQuery, titulo);
                const issueDate = new Date(badge.dataEmissao.toNumber() * 1000).toLocaleDateString('pt-BR');
                const expiryDate = badge.dataValidade.isZero()
                    ? 'Nunca expira'
                    : new Date(badge.dataValidade.toNumber() * 1000).toLocaleDateString('pt-BR');
                
                htmlResult += `
                    <div class="badge-item">
                        <h4>${badge.titulo}</h4>
                        <p><strong>Descrição:</strong> ${badge.descricao}</p>
                        <p><strong>Emitido por:</strong> ${badge.nomeEmissor}</p>
                        <p><strong>Tipo:</strong> ${badgeTypeMap[badge.tipoDeBadge]}</p>
                        <p><strong>Data de Emissão:</strong> ${issueDate}</p>
                        <p><strong>Validade:</strong> ${expiryDate}</p>
                        <p><strong>Evidência:</strong> <a href="${badge.urlEvidencia}" target="_blank" rel="noopener noreferrer">Ver Evidência</a></p>
                    </div>
                `;
            }
            badgeResultEl.innerHTML = htmlResult;
        } catch (error) {
            console.error("Erro ao consultar badges:", error);
            badgeResultEl.innerHTML = '<p style="color: red;">Ocorreu um erro ao buscar as badges. Verifique o console para mais detalhes.</p>';
        }
    };

    // --- 5. EVENT LISTENERS ---
    connectButton.addEventListener('click', connectWallet);
    disconnectButton.addEventListener('click', disconnectWallet);
    registerForm.addEventListener('submit', handleRegisterSubmit);
    queryButton.addEventListener('click', handleQueryBadge);
    closeModalBtn.addEventListener('click', hideStatus);

    // --- 6. INICIALIZAÇÃO DA APLICAÇÃO ---
    init();
});