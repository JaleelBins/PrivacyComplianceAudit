// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import FHEVM library for Fully Homomorphic Encryption
import "@fhenixprotocol/contracts/FHE.sol";

contract PrivacyComplianceAudit {
    using FHE for euint8;

    struct ComplianceAudit {
        string auditType;
        address auditor;
        uint256 timestamp;
        euint8 encryptedResult; // FHE encrypted boolean result
        bool isActive;
    }

    struct ConfidentialNote {
        string encryptedContent;
        address author;
        uint256 timestamp;
        bool isActive;
    }

    mapping(uint256 => ComplianceAudit) public audits;
    mapping(address => uint256[]) public auditorHistory;
    mapping(uint256 => ConfidentialNote) public confidentialNotes;

    uint256 private auditCounter;
    uint256 private notesCounter;

    // Events
    event AuditSubmitted(
        uint256 indexed auditId,
        address indexed auditor,
        string auditType,
        uint256 timestamp
    );

    event ConfidentialNotesSaved(
        uint256 indexed noteId,
        address indexed author,
        uint256 timestamp
    );

    event AuditResultRetrieved(
        uint256 indexed auditId,
        address indexed requester
    );

    constructor() {}

    /**
     * @dev Submit a compliance audit with FHE encryption
     * @param auditType The type of compliance audit being performed
     * @param _vote The plaintext boolean vote (true = compliant, false = non-compliant)
     * @return auditId The unique ID of the submitted audit
     */
    function submitComplianceAudit(
        string memory auditType,
        bool _vote
    ) external returns (uint256) {
        require(bytes(auditType).length > 0, "Audit type cannot be empty");

        auditCounter++;

        // Convert plaintext boolean to FHE encrypted value
        euint8 encryptedVote = FHE.asBool(_vote);

        // Store the audit with encrypted result
        audits[auditCounter] = ComplianceAudit({
            auditType: auditType,
            auditor: msg.sender,
            timestamp: block.timestamp,
            encryptedResult: encryptedVote,
            isActive: true
        });

        // Add to auditor's history
        auditorHistory[msg.sender].push(auditCounter);

        emit AuditSubmitted(
            auditCounter,
            msg.sender,
            auditType,
            block.timestamp
        );

        return auditCounter;
    }

    /**
     * @dev Get audit result - returns public info and encrypted result
     * @param auditId The ID of the audit to retrieve
     * @return auditType The type of audit
     * @return auditor The address of the auditor
     * @return timestamp When the audit was submitted
     * @return isEncrypted Whether the result is encrypted (always true for FHE)
     */
    function getAuditResult(uint256 auditId)
        external
        view
        returns (
            string memory auditType,
            address auditor,
            uint256 timestamp,
            bool isEncrypted
        )
    {
        require(audits[auditId].isActive, "Audit not found or inactive");

        ComplianceAudit memory audit = audits[auditId];

        emit AuditResultRetrieved(auditId, msg.sender);

        return (
            audit.auditType,
            audit.auditor,
            audit.timestamp,
            true // Always encrypted with FHE
        );
    }

    /**
     * @dev Get decrypted audit result - only accessible by original auditor
     * @param auditId The ID of the audit to decrypt
     * @return The decrypted compliance result
     */
    function getDecryptedAuditResult(uint256 auditId) external view returns (bool) {
        require(audits[auditId].isActive, "Audit not found or inactive");
        require(
            audits[auditId].auditor == msg.sender,
            "Only auditor can decrypt their own results"
        );

        // Decrypt the FHE encrypted result
        return FHE.decrypt(audits[auditId].encryptedResult);
    }

    /**
     * @dev Get list of audit IDs for a specific auditor
     * @param auditor The address of the auditor
     * @return Array of audit IDs
     */
    function getAuditorHistory(address auditor)
        external
        view
        returns (uint256[] memory)
    {
        return auditorHistory[auditor];
    }

    /**
     * @dev Save confidential compliance notes
     * @param encryptedNotes The encrypted notes content
     * @return noteId The unique ID of the saved notes
     */
    function saveConfidentialNotes(string memory encryptedNotes)
        external
        returns (uint256)
    {
        require(bytes(encryptedNotes).length > 0, "Notes cannot be empty");

        notesCounter++;

        confidentialNotes[notesCounter] = ConfidentialNote({
            encryptedContent: encryptedNotes,
            author: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        emit ConfidentialNotesSaved(
            notesCounter,
            msg.sender,
            block.timestamp
        );

        return notesCounter;
    }

    /**
     * @dev Retrieve confidential notes
     * @param noteId The ID of the notes to retrieve
     * @return encryptedContent The encrypted notes content
     * @return author The address of the notes author
     * @return timestamp When the notes were saved
     */
    function getConfidentialNotes(uint256 noteId)
        external
        view
        returns (
            string memory encryptedContent,
            address author,
            uint256 timestamp
        )
    {
        require(confidentialNotes[noteId].isActive, "Notes not found or inactive");
        require(
            confidentialNotes[noteId].author == msg.sender,
            "Only author can access their confidential notes"
        );

        ConfidentialNote memory notes = confidentialNotes[noteId];

        return (
            notes.encryptedContent,
            notes.author,
            notes.timestamp
        );
    }

    /**
     * @dev Get the total number of audits submitted
     * @return The total audit count
     */
    function getTotalAuditsCount() external view returns (uint256) {
        return auditCounter;
    }

    /**
     * @dev Get the total number of confidential notes saved
     * @return The total notes count
     */
    function getTotalNotesCount() external view returns (uint256) {
        return notesCounter;
    }

    /**
     * @dev Check if an audit exists and is active
     * @param auditId The ID of the audit to check
     * @return Whether the audit exists and is active
     */
    function auditExists(uint256 auditId) external view returns (bool) {
        return audits[auditId].isActive;
    }

    /**
     * @dev Get compliance statistics for an auditor
     * @param auditor The address of the auditor
     * @return totalAudits The total number of audits by this auditor
     * @return activeAudits The number of active audits
     */
    function getAuditorStats(address auditor)
        external
        view
        returns (uint256 totalAudits, uint256 activeAudits)
    {
        uint256[] memory auditIds = auditorHistory[auditor];
        totalAudits = auditIds.length;
        activeAudits = 0;

        for (uint256 i = 0; i < auditIds.length; i++) {
            if (audits[auditIds[i]].isActive) {
                activeAudits++;
            }
        }

        return (totalAudits, activeAudits);
    }

    /**
     * @dev Emergency function to deactivate an audit (only by auditor)
     * @param auditId The ID of the audit to deactivate
     */
    function deactivateAudit(uint256 auditId) external {
        require(audits[auditId].isActive, "Audit not found or already inactive");
        require(
            audits[auditId].auditor == msg.sender,
            "Only auditor can deactivate their own audit"
        );

        audits[auditId].isActive = false;
    }

    /**
     * @dev Emergency function to deactivate confidential notes (only by author)
     * @param noteId The ID of the notes to deactivate
     */
    function deactivateConfidentialNotes(uint256 noteId) external {
        require(
            confidentialNotes[noteId].isActive,
            "Notes not found or already inactive"
        );
        require(
            confidentialNotes[noteId].author == msg.sender,
            "Only author can deactivate their own notes"
        );

        confidentialNotes[noteId].isActive = false;
    }
}