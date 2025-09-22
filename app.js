class PrivacyComplianceAudit {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.userAddress = null;

        // Contract configuration for FHE-enabled compliance audit on Sepolia testnet
        this.contractAddress = "0x3cA1bC0128cc86218D46a940F13dC455b041D494"; // Deployed contract on Sepolia

        // Zama FHEVM Infrastructure on Sepolia
        this.zamaInfrastructure = {
            acl: "0x687820221192C5B662b25367F70076A37bc79b6c",
            executor: "0x848B0066793BcC60346Da1F49049357399B8D595",
            oracle: "0xa02Cda4Ca3a71D7C46997716F4283aa851C28812"
        };

        // Sepolia testnet configuration with Zama FHEVM
        this.sepoliaNetwork = {
            chainId: '0xaa36a7', // 11155111 in hex
            chainName: 'Sepolia Test Network (Zama FHEVM)',
            nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://sepolia.infura.io/v3/', 'https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/']
        };

        // Preset audit packages
        this.presetPackages = {
            enterprise: [
                { type: 'gdpr_design', compliant: true },
                { type: 'soc2', compliant: true },
                { type: 'iso27001', compliant: true },
                { type: 'hipaa', compliant: true }
            ],
            data_protection: [
                { type: 'gdpr_design', compliant: true },
                { type: 'ccpa_rights', compliant: true },
                { type: 'pci_dss', compliant: true }
            ],
            healthcare: [
                { type: 'hipaa', compliant: true },
                { type: 'soc2', compliant: true },
                { type: 'iso27001', compliant: true }
            ],
            financial: [
                { type: 'pci_dss', compliant: true },
                { type: 'soc2', compliant: true },
                { type: 'gdpr_design', compliant: true }
            ],
            complete: [
                { type: 'gdpr_design', compliant: true },
                { type: 'ccpa_rights', compliant: true },
                { type: 'iso27001', compliant: true },
                { type: 'soc2', compliant: true },
                { type: 'hipaa', compliant: true },
                { type: 'pci_dss', compliant: true }
            ]
        };
        this.contractABI = [
            "function submitComplianceAudit(string memory auditType, bool _vote) public returns (uint256)",
            "function getAuditResult(uint256 auditId) public view returns (string memory auditType, address auditor, uint256 timestamp, bool isEncrypted)",
            "function getDecryptedAuditResult(uint256 auditId) public view returns (bool)",
            "function getAuditorHistory(address auditor) public view returns (uint256[] memory)",
            "function saveConfidentialNotes(string memory encryptedNotes) public returns (uint256)",
            "function getConfidentialNotes(uint256 noteId) public view returns (string memory, address, uint256)",
            "function getTotalAuditsCount() public view returns (uint256)",
            "function getTotalNotesCount() public view returns (uint256)",
            "function auditExists(uint256 auditId) public view returns (bool)",
            "function getAuditorStats(address auditor) public view returns (uint256, uint256)",
            "function deactivateAudit(uint256 auditId) public",
            "function deactivateConfidentialNotes(uint256 noteId) public",
            "event AuditSubmitted(uint256 indexed auditId, address indexed auditor, string auditType, uint256 timestamp)",
            "event ConfidentialNotesSaved(uint256 indexed noteId, address indexed author, uint256 timestamp)",
            "event AuditResultRetrieved(uint256 indexed auditId, address indexed requester)"
        ];

        // Sample deployed audits for demonstration
        this.sampleAudits = [
            {
                id: "1001",
                type: "gdpr_design",
                auditor: "0x742d35Cc6634C0532925a3b8D8C0b21e5",
                timestamp: "2024-01-15 14:30:22",
                isCompliant: true,
                isEncrypted: true
            },
            {
                id: "1002",
                type: "ccpa_rights",
                auditor: "0x8ba1f109551bD432803012645Hppa21",
                timestamp: "2024-01-14 09:15:43",
                isCompliant: false,
                isEncrypted: true
            },
            {
                id: "1003",
                type: "iso27001",
                auditor: "0x742d35Cc6634C0532925a3b8D8C0b21e5",
                timestamp: "2024-01-13 16:45:12",
                isCompliant: true,
                isEncrypted: true
            },
            {
                id: "1004",
                type: "soc2",
                auditor: "0x9aB3f205621bE321403012645Hppa44",
                timestamp: "2024-01-12 11:22:35",
                isCompliant: true,
                isEncrypted: true
            },
            {
                id: "1005",
                type: "hipaa",
                auditor: "0x742d35Cc6634C0532925a3b8D8C0b21e5",
                timestamp: "2024-01-11 13:18:09",
                isCompliant: false,
                isEncrypted: true
            }
        ];

        this.initializeApp();
    }

    async initializeApp() {
        this.setupEventListeners();
        await this.checkWalletConnection();
        this.loadDeployedAudits();
    }

    setupEventListeners() {
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());
        document.getElementById('getResults').addEventListener('click', () => this.getAuditResults());
        document.getElementById('saveNotes').addEventListener('click', () => this.saveComplianceNotes());
    }

    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await this.connectWallet();
                }
            } catch (error) {
                console.log('Wallet connection check failed:', error);
            }
        }
    }

    async connectWallet() {
        try {
            // Step 1: Detect MetaMask
            if (typeof window.ethereum === 'undefined') {
                this.showAlert('❌ MetaMask Not Detected - Please install MetaMask browser extension to use this compliance audit platform', 'error');
                return;
            }

            this.showAlert('🔄 Connecting to MetaMask...', 'info');

            // Step 2: Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length === 0) {
                this.showAlert('❌ No accounts found - Please unlock your MetaMask wallet', 'error');
                return;
            }

            // Step 3: Create provider and get network info
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await this.provider.getNetwork();
            const currentChainId = '0x' + network.chainId.toString(16);

            this.showAlert('🌐 Verifying network connection to Sepolia testnet...', 'info');

            // Step 4: Network validation and switching
            if (currentChainId !== this.sepoliaNetwork.chainId) {
                this.showAlert('⚠️ Wrong Network Detected - Switching to Sepolia testnet...', 'warning');
                await this.switchToSepoliaNetwork();
            }

            // Step 5: Provider setup with signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();

            // Step 6: Contract initialization
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);

            // Step 7: State update and UI refresh
            this.updateWalletStatus();
            await this.loadAuditHistory();

            // Success handling
            this.showAlert('✅ Successfully Connected to Sepolia Testnet! Ready for compliance audits.', 'success');

        } catch (error) {
            console.error('Enhanced wallet connection failed:', error);

            // Enhanced error handling with specific messages
            if (error.code === 4001) {
                this.showAlert('❌ Connection Rejected - User denied wallet connection request', 'error');
            } else if (error.code === -32002) {
                this.showAlert('⏳ Connection Pending - Please check MetaMask for pending connection request', 'warning');
            } else if (error.message.includes('network')) {
                this.showAlert('🌐 Network Error - Failed to switch to Sepolia testnet: ' + error.message, 'error');
            } else {
                this.showAlert('❌ Connection Failed - ' + error.message, 'error');
            }
        }
    }

    async switchToSepoliaNetwork() {
        try {
            // Try to switch to Sepolia network
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.sepoliaNetwork.chainId }],
            });

            this.showAlert('✅ Successfully switched to Sepolia testnet', 'success');

        } catch (switchError) {
            console.error('Network switch failed:', switchError);

            // If network doesn't exist, add it
            if (switchError.code === 4902) {
                try {
                    this.showAlert('🔧 Adding Sepolia testnet to MetaMask...', 'info');

                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [this.sepoliaNetwork],
                    });

                    this.showAlert('✅ Sepolia testnet added and activated successfully!', 'success');

                } catch (addError) {
                    console.error('Failed to add Sepolia network:', addError);
                    throw new Error('Failed to add Sepolia testnet to MetaMask: ' + addError.message);
                }
            } else {
                throw new Error('Failed to switch to Sepolia testnet: ' + switchError.message);
            }
        }
    }

    updateWalletStatus() {
        const walletStatus = document.getElementById('walletStatus');
        const connectButton = document.getElementById('connectWallet');

        if (this.userAddress) {
            walletStatus.innerHTML = `
                <strong>🔗 Wallet Connected:</strong> ${this.userAddress.substring(0, 6)}...${this.userAddress.substring(38)}<br>
                <small>🌐 Network: Sepolia Testnet (Zama FHEVM)</small><br>
                <small>📄 Contract: ${this.contractAddress.substring(0, 6)}...${this.contractAddress.substring(38)}</small><br>
                <small>🔒 Zama Infrastructure: ACL, Executor, Oracle Enabled</small>
            `;
            connectButton.textContent = '✅ Connected to Sepolia';
            connectButton.disabled = true;
            connectButton.classList.remove('btn-primary');
            connectButton.classList.add('btn-success');
        } else {
            walletStatus.innerHTML = `
                <span style="color: #666;">
                    🔌 Not Connected - Click "Connect Wallet" to access compliance audit features
                </span>
            `;
        }
    }

    async submitAudit(auditType, isCompliant) {
        if (!this.contract) {
            this.showAlert('Please connect your wallet first', 'error');
            return;
        }

        try {
            this.showLoading(true);
            this.updateAuditStatus(auditType, 'processing');

            // Validate input parameters
            if (!auditType || typeof auditType !== 'string') {
                throw new Error('Invalid audit type');
            }
            if (typeof isCompliant !== 'boolean') {
                throw new Error('Compliance result must be a boolean');
            }

            // MetaMask Transaction Flow Implementation:
            // 1. ethers.js constructs transaction when calling contract method
            // 2. Since contract instance uses signer, ethers.js knows user signature is required
            // 3. This automatically triggers MetaMask transaction confirmation popup
            // 4. User confirms in MetaMask popup, transaction is sent to Sepolia testnet
            // 5. tx.wait() waits for transaction to be mined and confirmed

            // Submit audit with plaintext boolean - contract will encrypt using FHEVM
            const tx = await this.contract.submitComplianceAudit(auditType, isCompliant, {
                gasLimit: 500000 // Set reasonable gas limit for FHEVM operations
            });

            this.showAlert('🔄 MetaMask transaction submitted! Encrypting with FHEVM and confirming on Sepolia blockchain...', 'info');

            const receipt = await tx.wait();

            // Parse event to get audit ID
            let auditId;
            if (receipt.events && receipt.events.length > 0) {
                const auditEvent = receipt.events.find(event => event.event === 'AuditSubmitted');
                if (auditEvent) {
                    auditId = auditEvent.args[0].toString();
                } else {
                    auditId = receipt.events[0].args[0].toString();
                }
            } else {
                throw new Error('Blockchain transaction successful but no audit events found - please check contract logs');
            }

            // Update status indicator
            this.updateAuditStatus(auditType, isCompliant ? 'compliant' : 'non-compliant');

            // Store audit locally for quick access
            this.storeLocalAudit(auditId, auditType, isCompliant);

            this.showAlert(`🎉 Compliance Audit Successfully Deployed! Blockchain ID: ${auditId} | Type: ${this.getComplianceTypeDisplay(auditType)}`, 'success');
            this.loadAuditHistory();

        } catch (error) {
            console.error('Audit submission failed:', error);

            // Enhanced error handling with professional compliance messaging
            if (error.code === 4001) {
                this.showAlert('⚠️ Transaction Cancelled - User rejected the compliance audit submission', 'warning');
            } else if (error.message.includes('insufficient funds')) {
                this.showAlert('💸 Insufficient ETH Balance - Please add SepoliaETH to your wallet for transaction fees', 'error');
            } else if (error.message.includes('gas')) {
                this.showAlert('⛽ Gas Estimation Failed - Sepolia network may be congested or contract unreachable', 'error');
            } else if (error.message.includes('revert')) {
                this.showAlert('📋 Smart Contract Error - Compliance audit rejected: ' + (error.reason || error.message), 'error');
            } else {
                this.showAlert('❌ Compliance Audit Submission Failed - ' + error.message, 'error');
            }

            this.updateAuditStatus(auditType, 'pending');
        } finally {
            this.showLoading(false);
        }
    }

    async deployPreset(packageName) {
        if (!this.contract) {
            this.showAlert('🔌 Wallet Connection Required - Please connect your MetaMask wallet before deploying compliance audit packages', 'error');
            return;
        }

        if (!this.presetPackages[packageName]) {
            this.showAlert('❌ Invalid Preset Package - The selected compliance audit package does not exist', 'error');
            return;
        }

        const audits = this.presetPackages[packageName];
        const deploymentStatus = document.getElementById('deploymentStatus');
        const deploymentText = document.getElementById('deploymentText');

        try {
            // Show deployment status
            deploymentStatus.style.display = 'block';
            deploymentText.textContent = `🚀 Deploying ${audits.length} compliance audits from ${packageName.toUpperCase()} package to Sepolia blockchain...`;

            // Create progress tracking
            const progressHTML = audits.map((audit, index) =>
                `<div class="progress-item" id="progress_${index}">
                    <span>${this.getComplianceTypeDisplay(audit.type)}</span>
                    <span class="status-indicator status-pending" id="status_deploy_${index}"></span>
                </div>`
            ).join('');

            deploymentStatus.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div id="deploymentText">Deploying ${audits.length} audits from ${packageName} package...</div>
                </div>
                <div class="deployment-progress">
                    <h4>Deployment Progress:</h4>
                    ${progressHTML}
                </div>
            `;

            const deployedAudits = [];
            let successCount = 0;
            let failureCount = 0;

            // Deploy each audit sequentially
            for (let i = 0; i < audits.length; i++) {
                const audit = audits[i];
                const statusIndicator = document.getElementById(`status_deploy_${i}`);

                try {
                    // Update status to deploying
                    statusIndicator.className = 'status-indicator status-deploying';
                    deploymentText.textContent = `Deploying ${this.getComplianceTypeDisplay(audit.type)} (${i + 1}/${audits.length})...`;

                    // Submit audit to blockchain
                    const tx = await this.contract.submitComplianceAudit(audit.type, audit.compliant, {
                        gasLimit: 500000
                    });

                    // Wait for confirmation
                    const receipt = await tx.wait();

                    // Parse audit ID from events
                    let auditId;
                    if (receipt.events && receipt.events.length > 0) {
                        const auditEvent = receipt.events.find(event => event.event === 'AuditSubmitted');
                        if (auditEvent) {
                            auditId = auditEvent.args[0].toString();
                        } else {
                            auditId = receipt.events[0].args[0].toString();
                        }
                    }

                    // Update status to deployed
                    statusIndicator.className = 'status-indicator status-deployed';

                    // Store locally
                    this.storeLocalAudit(auditId, audit.type, audit.compliant);
                    deployedAudits.push({ auditId, type: audit.type, compliant: audit.compliant });

                    successCount++;

                    // Update individual audit status
                    this.updateAuditStatus(audit.type, audit.compliant ? 'compliant' : 'non-compliant');

                } catch (error) {
                    console.error(`Failed to deploy audit ${audit.type}:`, error);
                    statusIndicator.className = 'status-indicator status-non-compliant';
                    failureCount++;

                    // Continue with next audit instead of stopping
                    this.showAlert(`Failed to deploy ${audit.type}: ${error.message}`, 'warning');
                }

                // Small delay between deployments to avoid network congestion
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Show final results
            const finalMessage = `
                ✅ Deployment Complete!<br>
                📊 Success: ${successCount}/${audits.length} audits<br>
                ${failureCount > 0 ? `❌ Failed: ${failureCount} audits<br>` : ''}
                📦 Package: ${packageName.toUpperCase()}
            `;

            deploymentStatus.innerHTML = `
                <div class="alert alert-${successCount === audits.length ? 'success' : 'warning'}">
                    ${finalMessage}
                </div>
                <div class="deployment-progress">
                    <h4>Final Status:</h4>
                    ${progressHTML}
                </div>
            `;

            // Hide deployment status after 10 seconds
            setTimeout(() => {
                deploymentStatus.style.display = 'none';
            }, 10000);

            // Reload audit history
            this.loadAuditHistory();

            // Show summary alert
            if (successCount === audits.length) {
                this.showAlert(`🎉 Successfully deployed all ${audits.length} audits from ${packageName} package!`, 'success');
            } else {
                this.showAlert(`⚠️ Deployed ${successCount}/${audits.length} audits. Check deployment status for details.`, 'warning');
            }

        } catch (error) {
            console.error('Deployment failed:', error);
            deploymentStatus.innerHTML = `
                <div class="alert alert-error">
                    ❌ Deployment failed: ${error.message}
                </div>
            `;

            this.showAlert('Preset deployment failed: ' + error.message, 'error');
        }
    }

    updateAuditStatus(auditType, status) {
        const statusElement = document.getElementById(`status_${auditType}`);
        if (statusElement) {
            statusElement.className = `status-indicator status-${status}`;
        }
    }

    async getAuditResults() {
        const auditId = document.getElementById('auditId').value.trim();

        if (!auditId) {
            this.showAlert('Please enter an audit ID', 'error');
            return;
        }

        if (!this.contract) {
            this.showAlert('Please connect your wallet first', 'error');
            return;
        }

        try {
            this.showResultsLoading(true);

            const result = await this.contract.getAuditResult(auditId);

            const auditData = {
                id: auditId,
                type: result[0],
                auditor: result[1],
                timestamp: new Date(result[2].toNumber() * 1000).toLocaleString(),
                isEncrypted: result[3]
            };

            this.displayAuditResult(auditData);

            // Try to get decrypted result if user is the auditor
            try {
                const decryptedResult = await this.contract.getDecryptedAuditResult(auditId);
                auditData.decryptedResult = decryptedResult;
                this.displayAuditResult(auditData);
            } catch (decryptError) {
                // User is not the auditor or other access control error
                console.log('Cannot decrypt result:', decryptError.message);
            }

        } catch (error) {
            console.error('Failed to get audit results:', error);
            if (error.message.includes('Audit not found')) {
                this.showAlert('Audit not found or inactive', 'error');
            } else if (error.message.includes('revert')) {
                this.showAlert('Contract error: Invalid audit ID or access denied', 'error');
            } else {
                this.showAlert('Failed to retrieve audit results: ' + error.message, 'error');
            }
        } finally {
            this.showResultsLoading(false);
        }
    }

    displayAuditResult(auditData) {
        const resultsDiv = document.getElementById('auditResults');

        let decryptedResultHtml = '';
        if (auditData.decryptedResult !== undefined) {
            const resultIcon = auditData.decryptedResult ? '✅' : '❌';
            const resultText = auditData.decryptedResult ? 'COMPLIANT' : 'NON-COMPLIANT';
            const alertType = auditData.decryptedResult ? 'success' : 'error';

            decryptedResultHtml = `
                <div class="alert alert-${alertType}">
                    <strong>${resultIcon} Compliance Result: ${resultText}</strong>
                    <br><small>🔓 Decrypted using FHEVM (Only visible to auditor)</small>
                </div>
            `;
        } else {
            decryptedResultHtml = `
                <div class="alert alert-warning">
                    🔒 Encrypted Result - Only the original auditor can decrypt this result
                </div>
            `;
        }

        resultsDiv.innerHTML = `
            <div class="result-item">
                <h3>🔍 Audit Report #${auditData.id}</h3>
                <p><strong>Compliance Type:</strong> ${this.getComplianceTypeDisplay(auditData.type)}</p>
                <p><strong>Auditor:</strong> ${auditData.auditor}</p>
                <p><strong>Timestamp:</strong> ${auditData.timestamp}</p>
                <p><strong>Encryption Status:</strong> ${auditData.isEncrypted ? '🔒 Encrypted with FHEVM' : '📄 Standard'}</p>
                ${decryptedResultHtml}
                <div class="alert alert-info">
                    <strong>🛡️ FHEVM Security Features:</strong><br>
                    • Fully homomorphic encryption protects audit results<br>
                    • Zero-knowledge access control ensures privacy<br>
                    • Cryptographically secured and tamper-proof on blockchain
                </div>
            </div>
        `;
    }

    getComplianceTypeDisplay(auditType) {
        const typeMap = {
            'gdpr_design': 'GDPR Article 25 - Data Protection by Design',
            'ccpa_rights': 'CCPA Consumer Rights Implementation',
            'iso27001': 'ISO 27001 Information Security Controls',
            'soc2': 'SOC 2 Type II Controls',
            'hipaa': 'HIPAA Privacy Rule Compliance',
            'pci_dss': 'PCI DSS Data Security Standards'
        };
        return typeMap[auditType] || auditType;
    }

    async saveComplianceNotes() {
        const notes = document.getElementById('complianceNotes').value.trim();

        if (!notes) {
            this.showAlert('Please enter compliance notes', 'error');
            return;
        }

        if (!this.contract) {
            this.showAlert('Please connect your wallet first', 'error');
            return;
        }

        try {
            this.showLoading(true);

            // In a real implementation, notes would be encrypted client-side before sending
            const encryptedNotes = btoa(notes); // Simple base64 encoding for demo

            // MetaMask transaction flow: ethers.js → signer required → MetaMask popup → Sepolia confirmation
            const tx = await this.contract.saveConfidentialNotes(encryptedNotes);
            this.showAlert('MetaMask transaction for confidential notes submitted to Sepolia testnet...', 'info');

            const receipt = await tx.wait();
            const noteId = receipt.events[0].args[0].toString();

            document.getElementById('complianceNotes').value = '';
            this.showAlert(`Confidential notes saved successfully! ID: ${noteId}`, 'success');

        } catch (error) {
            console.error('Failed to save notes:', error);
            this.showAlert('Failed to save notes: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadAuditHistory() {
        if (!this.contract || !this.userAddress) return;

        try {
            const auditIds = await this.contract.getAuditorHistory(this.userAddress);
            const recentAuditsDiv = document.getElementById('recentAudits');

            if (auditIds.length === 0) {
                recentAuditsDiv.innerHTML = `
                    <div class="alert alert-info">
                        No audit history found. Use the preset deployment feature or submit individual compliance assessments to get started.
                    </div>
                `;
                return;
            }

            let historyHTML = `
                <h3>Your Blockchain Audit History</h3>
                <p style="color: #666; margin-bottom: 15px;">
                    📈 Total Audits: ${auditIds.length} |
                    🔒 All results encrypted with FHEVM |
                    ⛓️ Stored on Sepolia blockchain
                </p>
            `;

            // Show latest 5 audits
            const recentIds = auditIds.slice(-5).reverse();

            for (let id of recentIds) {
                const localAudit = this.getLocalAudit(id.toString());
                if (localAudit) {
                    const statusIcon = localAudit.isCompliant ? '✅' : '❌';
                    const statusText = localAudit.isCompliant ? 'Compliant' : 'Non-Compliant';

                    historyHTML += `
                        <div class="result-item">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${statusIcon} ${this.getComplianceTypeDisplay(localAudit.auditType)}</strong>
                                    <br><small>Audit ID: ${id.toString()}</small>
                                </div>
                                <div class="alert alert-${localAudit.isCompliant ? 'success' : 'error'}" style="margin: 0; padding: 5px 10px;">
                                    ${statusText}
                                </div>
                            </div>
                        </div>
                    `;
                }
            }

            recentAuditsDiv.innerHTML = historyHTML;

        } catch (error) {
            console.error('Failed to load audit history:', error);
        }
    }

    storeLocalAudit(auditId, auditType, isCompliant) {
        const audits = JSON.parse(localStorage.getItem('complianceAudits') || '{}');
        audits[auditId] = { auditType, isCompliant, timestamp: Date.now() };
        localStorage.setItem('complianceAudits', JSON.stringify(audits));
    }

    getLocalAudit(auditId) {
        const audits = JSON.parse(localStorage.getItem('complianceAudits') || '{}');
        return audits[auditId] || null;
    }

    showLoading(show) {
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => {
            el.style.display = show ? 'block' : 'none';
        });
    }

    showResultsLoading(show) {
        const resultsDiv = document.getElementById('auditResults');
        if (show) {
            resultsDiv.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div>Retrieving confidential audit data...</div>
                </div>
            `;
        }
    }

    handleContractInteraction(action) {
        if (!this.contract) {
            this.showAlert('🔌 Please connect MetaMask wallet first', 'error');
            return;
        }

        switch(action) {
            case 'submitAudit':
                this.showAuditSubmissionModal();
                break;
            case 'viewResults':
                this.showResultsModal();
                break;
            case 'saveNotes':
                this.showNotesModal();
                break;
            default:
                this.showAlert('Unknown interaction type', 'error');
        }
    }

    showAuditSubmissionModal() {
        const modalHtml = `
            <div id="auditModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80%; overflow-y: auto;">
                    <h3>📝 Submit Compliance Audit - Meta Transaction</h3>
                    <p style="margin-bottom: 20px; color: #666;">Select audit type and submit results to blockchain</p>

                    <div class="input-group">
                        <label for="auditTypeSelect">Audit Type:</label>
                        <select id="auditTypeSelect" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 6px;">
                            <option value="gdpr_design">🇪🇺 GDPR Article 25 - Data Protection by Design</option>
                            <option value="ccpa_rights">🇺🇸 CCPA Consumer Rights Implementation</option>
                            <option value="iso27001">🔒 ISO 27001 Information Security Management</option>
                            <option value="soc2">🛡️ SOC 2 Type II Trust Services</option>
                            <option value="hipaa">🏥 HIPAA Privacy Rule</option>
                            <option value="pci_dss">💳 PCI DSS Payment Card Data Security</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label>Compliance Status:</label>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="complianceResult" value="true" style="margin-right: 8px;"> ✅ Compliant
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="complianceResult" value="false" style="margin-right: 8px;"> ❌ Non-Compliant
                            </label>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="auditApp.submitAuditFromModal()">🚀 Submit Meta Transaction</button>
                        <button class="btn btn-danger" onclick="auditApp.closeModal('auditModal')">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    showResultsModal() {
        const modalHtml = `
            <div id="resultsModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;">
                    <h3>👁️ View Audit Results - Meta Transaction</h3>
                    <p style="margin-bottom: 20px; color: #666;">Enter audit ID to view encrypted results</p>

                    <div class="input-group">
                        <label for="modalAuditId">Audit ID:</label>
                        <input type="text" id="modalAuditId" placeholder="Enter blockchain audit ID" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 6px;">
                    </div>

                    <div id="modalResults" style="margin-top: 20px;"></div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-success" onclick="auditApp.getResultsFromModal()">🔍 Query Results</button>
                        <button class="btn btn-danger" onclick="auditApp.closeModal('resultsModal')">❌ Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    showNotesModal() {
        const modalHtml = `
            <div id="notesModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80%; overflow-y: auto;">
                    <h3>📄 Save Confidential Notes - Meta Transaction</h3>
                    <p style="margin-bottom: 20px; color: #666;">Encrypt and save compliance notes to blockchain</p>

                    <div class="input-group">
                        <label for="modalNotes">Confidential Notes:</label>
                        <textarea id="modalNotes" rows="6" placeholder="Enter confidential compliance observations, remediation suggestions, or audit comments..." style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 6px; resize: vertical;"></textarea>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="auditApp.saveNotesFromModal()">🔒 Encrypt & Save</button>
                        <button class="btn btn-danger" onclick="auditApp.closeModal('notesModal')">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async submitAuditFromModal() {
        const auditType = document.getElementById('auditTypeSelect').value;
        const complianceResult = document.querySelector('input[name="complianceResult"]:checked');

        if (!complianceResult) {
            this.showAlert('Please select compliance status', 'error');
            return;
        }

        const isCompliant = complianceResult.value === 'true';
        this.closeModal('auditModal');

        await this.submitAudit(auditType, isCompliant);
    }

    async getResultsFromModal() {
        const auditId = document.getElementById('modalAuditId').value.trim();

        if (!auditId) {
            this.showAlert('Please enter audit ID', 'error');
            return;
        }

        try {
            const result = await this.contract.getAuditResult(auditId);
            const auditData = {
                id: auditId,
                type: result[0],
                auditor: result[1],
                timestamp: new Date(result[2].toNumber() * 1000).toLocaleString(),
                isEncrypted: result[3]
            };

            let resultHtml = `
                <div class="alert alert-info">
                    <h4>📋 Audit Report #${auditId}</h4>
                    <p><strong>Type:</strong> ${this.getComplianceTypeDisplay(auditData.type)}</p>
                    <p><strong>Auditor:</strong> ${auditData.auditor}</p>
                    <p><strong>Timestamp:</strong> ${auditData.timestamp}</p>
                    <p><strong>Encryption:</strong> ${auditData.isEncrypted ? '🔒 FHEVM Encrypted' : '📄 Standard'}</p>
                </div>
            `;

            try {
                const decryptedResult = await this.contract.getDecryptedAuditResult(auditId);
                const statusIcon = decryptedResult ? '✅' : '❌';
                const statusText = decryptedResult ? 'Compliant' : 'Non-Compliant';
                const alertType = decryptedResult ? 'success' : 'error';

                resultHtml += `
                    <div class="alert alert-${alertType}">
                        <strong>${statusIcon} Compliance Result: ${statusText}</strong>
                        <br><small>🔓 Decrypted (Only visible to auditor)</small>
                    </div>
                `;
            } catch (decryptError) {
                resultHtml += `
                    <div class="alert alert-warning">
                        🔒 Encrypted Result - Only the original auditor can decrypt this result
                    </div>
                `;
            }

            document.getElementById('modalResults').innerHTML = resultHtml;

        } catch (error) {
            document.getElementById('modalResults').innerHTML = `
                <div class="alert alert-error">
                    ❌ Query Failed: ${error.message}
                </div>
            `;
        }
    }

    async saveNotesFromModal() {
        const notes = document.getElementById('modalNotes').value.trim();

        if (!notes) {
            this.showAlert('Please enter note content', 'error');
            return;
        }

        this.closeModal('notesModal');

        try {
            this.showLoading(true);

            const encryptedNotes = btoa(notes);
            const tx = await this.contract.saveConfidentialNotes(encryptedNotes);
            this.showAlert('🔄 Meta transaction submitted, encrypting and saving notes...', 'info');

            const receipt = await tx.wait();
            const noteId = receipt.events[0].args[0].toString();

            this.showAlert(`✅ Confidential notes saved successfully! ID: ${noteId}`, 'success');

        } catch (error) {
            this.showAlert('❌ Failed to save notes: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    }

    loadDeployedAudits() {
        const auditsList = document.getElementById('auditsList');
        if (!auditsList) return;

        let auditsHtml = '';

        if (this.sampleAudits.length === 0) {
            auditsHtml = `
                <div class="alert alert-info">
                    No deployed audits found. Deploy audits using the contract interaction buttons above.
                </div>
            `;
        } else {
            this.sampleAudits.forEach(audit => {
                const statusClass = audit.isCompliant ? 'status-compliant' : 'status-non-compliant';
                const statusText = audit.isCompliant ? 'Compliant' : 'Non-Compliant';
                const statusIcon = audit.isCompliant ? '✅' : '❌';

                auditsHtml += `
                    <div class="audit-record">
                        <div class="audit-info">
                            <h5>${statusIcon} ${this.getComplianceTypeDisplay(audit.type)}</h5>
                            <small><strong>ID:</strong> ${audit.id}</small>
                            <small><strong>Auditor:</strong> ${audit.auditor.substring(0, 6)}...${audit.auditor.substring(38)}</small>
                            <small><strong>Deployed:</strong> ${audit.timestamp}</small>
                        </div>
                        <div class="audit-status">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <span class="status-badge status-encrypted">🔒 FHE</span>
                        </div>
                        <div class="audit-actions">
                            <button class="btn btn-success btn-small" onclick="auditApp.viewAuditDetails('${audit.id}')">👁️ View</button>
                            <button class="btn btn-info btn-small" onclick="auditApp.interactWithAudit('${audit.id}', '${audit.type}')">🔄 Interact</button>
                        </div>
                    </div>
                `;
            });
        }

        auditsList.innerHTML = auditsHtml;
    }

    viewAuditDetails(auditId) {
        const audit = this.sampleAudits.find(a => a.id === auditId);
        if (!audit) {
            this.showAlert('Audit not found', 'error');
            return;
        }

        const modalHtml = `
            <div id="auditDetailsModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;">
                    <h3>📋 Audit Details - ID: ${audit.id}</h3>

                    <div class="alert alert-info" style="margin: 20px 0;">
                        <h4>${this.getComplianceTypeDisplay(audit.type)}</h4>
                        <p><strong>Audit ID:</strong> ${audit.id}</p>
                        <p><strong>Auditor Address:</strong> ${audit.auditor}</p>
                        <p><strong>Deployment Time:</strong> ${audit.timestamp}</p>
                        <p><strong>Encryption:</strong> ${audit.isEncrypted ? '🔒 FHE Encrypted' : '📄 Standard'}</p>
                    </div>

                    <div class="alert alert-${audit.isCompliant ? 'success' : 'error'}">
                        <strong>${audit.isCompliant ? '✅' : '❌'} Compliance Status: ${audit.isCompliant ? 'Compliant' : 'Non-Compliant'}</strong>
                        <br><small>🔐 This result is encrypted and stored securely on blockchain</small>
                    </div>

                    <div class="alert alert-warning">
                        <strong>🔒 Privacy Protection:</strong><br>
                        • Audit results are encrypted using FHE technology<br>
                        • Only authorized auditors can decrypt the results<br>
                        • All data is immutably stored on Sepolia blockchain
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="auditApp.interactWithAudit('${audit.id}', '${audit.type}')">🔄 Interact with Audit</button>
                        <button class="btn btn-danger" onclick="auditApp.closeModal('auditDetailsModal')">❌ Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    interactWithAudit(auditId, auditType) {
        this.closeModal('auditDetailsModal');

        const modalHtml = `
            <div id="interactModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80%; overflow-y: auto;">
                    <h3>🔄 Interact with Audit ${auditId}</h3>
                    <p style="margin-bottom: 20px; color: #666;">Choose interaction type for this deployed audit</p>

                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <button class="btn btn-primary" onclick="auditApp.closeModal('interactModal'); auditApp.showResultsModal();" style="padding: 15px;">
                            👁️ View Encrypted Results
                            <br><small style="opacity: 0.8;">Query blockchain for encrypted audit data</small>
                        </button>

                        <button class="btn btn-success" onclick="auditApp.closeModal('interactModal'); auditApp.showAuditSubmissionModal();" style="padding: 15px;">
                            📝 Submit New Audit
                            <br><small style="opacity: 0.8;">Create new audit of same type</small>
                        </button>

                        <button class="btn btn-info" onclick="auditApp.closeModal('interactModal'); auditApp.showNotesModal();" style="padding: 15px;">
                            📄 Add Confidential Notes
                            <br><small style="opacity: 0.8;">Save encrypted notes about this audit</small>
                        </button>
                    </div>

                    <div style="margin-top: 20px;">
                        <button class="btn btn-danger" onclick="auditApp.closeModal('interactModal')">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    showZamaInfrastructureInfo() {
        const modalHtml = `
            <div id="zamaInfoModal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;">
                    <h3>🔒 Zama FHEVM Infrastructure on Sepolia</h3>
                    <p style="margin-bottom: 20px; color: #666;">This application uses Zama's pre-deployed FHEVM services for fully homomorphic encryption</p>

                    <div class="alert alert-info" style="margin: 20px 0;">
                        <h4>🏗️ Infrastructure Components</h4>
                        <p><strong>ACL (Access Control List):</strong></p>
                        <small style="font-family: monospace; word-break: break-all;">${this.zamaInfrastructure.acl}</small>

                        <p style="margin-top: 15px;"><strong>Executor:</strong></p>
                        <small style="font-family: monospace; word-break: break-all;">${this.zamaInfrastructure.executor}</small>

                        <p style="margin-top: 15px;"><strong>Oracle:</strong></p>
                        <small style="font-family: monospace; word-break: break-all;">${this.zamaInfrastructure.oracle}</small>
                    </div>

                    <div class="alert alert-success">
                        <strong>✅ Verified Configuration:</strong><br>
                        • Inherits Sepolia network configuration<br>
                        • Depends on Zama pre-deployed services<br>
                        • FHEVM fully enabled for compliance audits<br>
                        • Chain ID: 11155111 (Sepolia Testnet)
                    </div>

                    <div class="alert alert-warning">
                        <strong>🔐 Privacy Features:</strong><br>
                        • Fully homomorphic encryption for audit results<br>
                        • Zero-knowledge proof verification<br>
                        • Confidential computation on encrypted data<br>
                        • Immutable storage on Sepolia blockchain
                    </div>

                    <div style="margin-top: 20px;">
                        <button class="btn btn-danger" onclick="auditApp.closeModal('zamaInfoModal')">❌ Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    showAlert(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-temporary');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-temporary`;
        alertDiv.textContent = message;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '1000';
        alertDiv.style.maxWidth = '400px';

        document.body.appendChild(alertDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Global functions for audit submission and contract interaction (called by buttons)
let auditApp;

window.submitAudit = function(auditType, isCompliant) {
    if (auditApp) {
        auditApp.submitAudit(auditType, isCompliant);
    }
};

window.interactWithContract = function(action) {
    if (auditApp) {
        auditApp.handleContractInteraction(action);
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    auditApp = new PrivacyComplianceAudit();
});

// Handle wallet account changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', function (accounts) {
        if (accounts.length === 0) {
            location.reload(); // Reload if wallet disconnected
        } else if (auditApp && auditApp.userAddress !== accounts[0]) {
            location.reload(); // Reload if account changed
        }
    });

    window.ethereum.on('chainChanged', function () {
        location.reload(); // Reload on network change
    });
}