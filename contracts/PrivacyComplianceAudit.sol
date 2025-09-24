// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint16, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivacyComplianceAudit is SepoliaConfig {

    address public owner;
    address public auditor;
    uint32 public totalAudits;

    // Compliance levels: 0-100 (encrypted)
    enum ComplianceType {
        GDPR,           // General Data Protection Regulation
        CCPA,           // California Consumer Privacy Act
        HIPAA,          // Health Insurance Portability and Accountability Act
        SOX,            // Sarbanes-Oxley Act
        PCI_DSS,        // Payment Card Industry Data Security Standard
        ISO27001        // Information Security Management
    }

    struct ComplianceRecord {
        euint32 complianceScore;     // Encrypted score (0-100)
        euint8 riskLevel;           // Encrypted risk level (1-5: Low to Critical)
        ebool isCompliant;          // Encrypted compliance status
        uint256 auditTimestamp;
        ComplianceType complianceType;
        bool auditCompleted;
        bytes32 reportHash;         // Hash of detailed report (stored off-chain)
        address auditedEntity;
        uint256 validUntil;         // Compliance validity period
    }

    struct AuditRequest {
        address requestor;
        ComplianceType complianceType;
        uint256 requestTimestamp;
        bool isProcessed;
        euint32 expectedScore;      // Encrypted expected compliance score
        bytes32 dataHash;          // Hash of sensitive data to be audited
    }

    mapping(uint32 => ComplianceRecord) public complianceRecords;
    mapping(address => uint32[]) public entityAudits;
    mapping(uint32 => AuditRequest) public auditRequests;
    mapping(address => mapping(ComplianceType => uint32)) public latestAudit;

    // Access control for viewing encrypted data
    mapping(uint32 => mapping(address => bool)) public auditViewAccess;

    event AuditRequested(uint32 indexed auditId, address indexed requestor, ComplianceType complianceType);
    event AuditCompleted(uint32 indexed auditId, address indexed auditedEntity, ComplianceType complianceType);
    event ComplianceScoreUpdated(uint32 indexed auditId, uint256 timestamp);
    event AccessGranted(uint32 indexed auditId, address indexed grantedTo);
    event AuditorChanged(address indexed oldAuditor, address indexed newAuditor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAuditor() {
        require(msg.sender == auditor, "Only auditor can perform this action");
        _;
    }

    modifier onlyAuthorized(uint32 auditId) {
        require(
            msg.sender == owner ||
            msg.sender == auditor ||
            msg.sender == complianceRecords[auditId].auditedEntity ||
            auditViewAccess[auditId][msg.sender],
            "Not authorized to access this audit"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        auditor = msg.sender;  // Initially owner is also auditor
        totalAudits = 0;
    }

    function setAuditor(address _newAuditor) external onlyOwner {
        require(_newAuditor != address(0), "Invalid auditor address");
        address oldAuditor = auditor;
        auditor = _newAuditor;
        emit AuditorChanged(oldAuditor, _newAuditor);
    }

    // Submit audit request with encrypted expected score
    function requestAudit(
        ComplianceType _complianceType,
        uint32 _expectedScore,
        bytes32 _dataHash
    ) external returns (uint32 auditId) {
        require(_expectedScore <= 100, "Expected score must be between 0-100");

        auditId = ++totalAudits;

        // Encrypt the expected score
        euint32 encryptedExpectedScore = FHE.asEuint32(_expectedScore);

        auditRequests[auditId] = AuditRequest({
            requestor: msg.sender,
            complianceType: _complianceType,
            requestTimestamp: block.timestamp,
            isProcessed: false,
            expectedScore: encryptedExpectedScore,
            dataHash: _dataHash
        });

        // Grant access permissions
        FHE.allowThis(encryptedExpectedScore);
        FHE.allow(encryptedExpectedScore, msg.sender);
        FHE.allow(encryptedExpectedScore, auditor);

        emit AuditRequested(auditId, msg.sender, _complianceType);
        return auditId;
    }

    // Auditor processes the audit and submits encrypted results
    function submitAuditResults(
        uint32 _auditId,
        uint32 _complianceScore,
        uint8 _riskLevel,
        bool _isCompliant,
        bytes32 _reportHash,
        uint256 _validityPeriod
    ) external onlyAuditor {
        require(_auditId <= totalAudits && _auditId > 0, "Invalid audit ID");
        require(!auditRequests[_auditId].isProcessed, "Audit already processed");
        require(_complianceScore <= 100, "Compliance score must be between 0-100");
        require(_riskLevel >= 1 && _riskLevel <= 5, "Risk level must be between 1-5");

        AuditRequest storage request = auditRequests[_auditId];

        // Encrypt the audit results
        euint32 encryptedScore = FHE.asEuint32(_complianceScore);
        euint8 encryptedRiskLevel = FHE.asEuint8(_riskLevel);
        ebool encryptedCompliance = FHE.asEbool(_isCompliant);

        complianceRecords[_auditId] = ComplianceRecord({
            complianceScore: encryptedScore,
            riskLevel: encryptedRiskLevel,
            isCompliant: encryptedCompliance,
            auditTimestamp: block.timestamp,
            complianceType: request.complianceType,
            auditCompleted: true,
            reportHash: _reportHash,
            auditedEntity: request.requestor,
            validUntil: block.timestamp + _validityPeriod
        });

        // Set up access control
        FHE.allowThis(encryptedScore);
        FHE.allowThis(encryptedRiskLevel);
        FHE.allowThis(encryptedCompliance);

        // Grant access to relevant parties
        FHE.allow(encryptedScore, request.requestor);
        FHE.allow(encryptedRiskLevel, request.requestor);
        FHE.allow(encryptedCompliance, request.requestor);

        // Update mappings
        entityAudits[request.requestor].push(_auditId);
        latestAudit[request.requestor][request.complianceType] = _auditId;
        request.isProcessed = true;

        emit AuditCompleted(_auditId, request.requestor, request.complianceType);
        emit ComplianceScoreUpdated(_auditId, block.timestamp);
    }

    // Grant access to view encrypted audit data
    function grantAuditAccess(uint32 _auditId, address _grantTo) external {
        require(_auditId <= totalAudits && _auditId > 0, "Invalid audit ID");
        require(
            msg.sender == owner ||
            msg.sender == complianceRecords[_auditId].auditedEntity,
            "Not authorized to grant access"
        );

        auditViewAccess[_auditId][_grantTo] = true;

        ComplianceRecord storage record = complianceRecords[_auditId];
        if (record.auditCompleted) {
            // Grant access to encrypted data
            FHE.allow(record.complianceScore, _grantTo);
            FHE.allow(record.riskLevel, _grantTo);
            FHE.allow(record.isCompliant, _grantTo);
        }

        emit AccessGranted(_auditId, _grantTo);
    }

    // Check if compliance is still valid
    function isComplianceValid(uint32 _auditId) external view returns (bool) {
        require(_auditId <= totalAudits && _auditId > 0, "Invalid audit ID");
        ComplianceRecord storage record = complianceRecords[_auditId];
        return record.auditCompleted && block.timestamp <= record.validUntil;
    }

    // Get audit basic information (non-encrypted data)
    function getAuditInfo(uint32 _auditId) external view onlyAuthorized(_auditId) returns (
        address auditedEntity,
        ComplianceType complianceType,
        uint256 auditTimestamp,
        bool auditCompleted,
        bytes32 reportHash,
        uint256 validUntil,
        bool isValid
    ) {
        require(_auditId <= totalAudits && _auditId > 0, "Invalid audit ID");
        ComplianceRecord storage record = complianceRecords[_auditId];

        return (
            record.auditedEntity,
            record.complianceType,
            record.auditTimestamp,
            record.auditCompleted,
            record.reportHash,
            record.validUntil,
            block.timestamp <= record.validUntil
        );
    }

    // Get entity's audit history (audit IDs only)
    function getEntityAudits(address _entity) external view returns (uint32[] memory) {
        return entityAudits[_entity];
    }

    // Get latest audit ID for specific compliance type
    function getLatestAuditId(address _entity, ComplianceType _complianceType) external view returns (uint32) {
        return latestAudit[_entity][_complianceType];
    }

    // Compare two compliance scores (returns encrypted result)
    function compareComplianceScores(uint32 _auditId1, uint32 _auditId2)
        external
        onlyAuthorized(_auditId1)
        returns (ebool)
    {
        require(_auditId1 <= totalAudits && _auditId1 > 0, "Invalid audit ID 1");
        require(_auditId2 <= totalAudits && _auditId2 > 0, "Invalid audit ID 2");
        require(auditViewAccess[_auditId2][msg.sender] ||
                msg.sender == owner ||
                msg.sender == auditor, "No access to second audit");

        ComplianceRecord storage record1 = complianceRecords[_auditId1];
        ComplianceRecord storage record2 = complianceRecords[_auditId2];

        // Return encrypted boolean: true if audit1 score >= audit2 score
        return FHE.ge(record1.complianceScore, record2.complianceScore);
    }

    // Emergency function to revoke audit validity
    function revokeAudit(uint32 _auditId, string calldata _reason) external onlyAuditor {
        require(_auditId <= totalAudits && _auditId > 0, "Invalid audit ID");
        require(complianceRecords[_auditId].auditCompleted, "Audit not completed");

        // Set validity to expired
        complianceRecords[_auditId].validUntil = block.timestamp - 1;

        emit ComplianceScoreUpdated(_auditId, block.timestamp);
    }

    // Get total number of audits for statistics
    function getTotalAudits() external view returns (uint32) {
        return totalAudits;
    }
}