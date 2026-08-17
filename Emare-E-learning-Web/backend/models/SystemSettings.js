const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    // 1. General Settings
    websiteName: { type: String, default: 'Emare E-Learning' },
    siteLogo: { type: String, default: '' },
    favicon: { type: String, default: '' },
    theme: { type: String, default: 'light', enum: ['light', 'dark', 'system'] },
    timezone: { type: String, default: 'Africa/Addis_Ababa' },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'ETB' },

    // 2. Authentication & Login
    requireEmailVerification: { type: Boolean, default: false },
    requireMfa: { type: Boolean, default: false },
    passwordComplexityStrict: { type: Boolean, default: true },
    maxLoginAttempts: { type: Number, default: 5 },
    sessionTimeoutMinutes: { type: Number, default: 60 },
    socialOAuthEnabled: { type: Boolean, default: true },

    // 3. User Registration
    allowRegistration: { type: Boolean, default: true },
    autoAssignStudentRole: { type: Boolean, default: true },
    requireAdminApproval: { type: Boolean, default: false },
    sendWelcomeEmail: { type: Boolean, default: true },
    domainWhitelistEnabled: { type: Boolean, default: false },
    domainWhitelist: { type: String, default: '' },

    // 4. Role & Permission Settings
    rbacEnforced: { type: Boolean, default: true },
    allowCustomRoles: { type: Boolean, default: true },
    allowGranularOverrides: { type: Boolean, default: false },
    strictAdminMode: { type: Boolean, default: true },

    // 5. Course Settings
    autoApproveCourses: { type: Boolean, default: false },
    allowPublicPreviews: { type: Boolean, default: true },
    maxUploadSizeMB: { type: Number, default: 25 },
    allowedUploadTypes: { type: String, default: 'jpg,jpeg,png,pdf,doc,docx,ppt,pptx,zip' },
    maxVideoSizeMB: { type: Number, default: 500 },
    videoFormat: { type: String, default: 'mp4' },
    videoTranscodingEnabled: { type: Boolean, default: true },
    courseForumsEnabled: { type: Boolean, default: true },

    // 6. Assessment & Certificate Settings
    autoGenerateCertificates: { type: Boolean, default: true },
    certificateVerificationPortal: { type: Boolean, default: true },
    passingScoreThreshold: { type: Number, default: 70 },
    proctoringEnforcement: { type: Boolean, default: false },
    quizRetakeLimit: { type: Number, default: 3 },

    // 7. Communication & Notifications
    announcementBannerActive: { type: Boolean, default: true },
    announcementBannerText: { type: String, default: 'Welcome to Emare E-Learning Platform!' },
    automaticEmailNotifs: { type: Boolean, default: true },
    pushNotifsEnabled: { type: Boolean, default: true },
    smsAlertsEnabled: { type: Boolean, default: false },
    digestFrequency: { type: String, default: 'daily' },

    // 8. Payment Settings
    paymentGatewayActive: { type: Boolean, default: true },
    multiCurrencySupport: { type: Boolean, default: true },
    autoRefundsEnabled: { type: Boolean, default: false },
    invoiceGeneration: { type: Boolean, default: true },
    taxCalculationEnabled: { type: Boolean, default: true },

    // 9. Security Settings
    ipWhitelistingEnabled: { type: Boolean, default: false },
    sslStrictEnabled: { type: Boolean, default: true },
    rateLimitingEnabled: { type: Boolean, default: true },
    cspHeaderEnabled: { type: Boolean, default: true },
    corsStrictEnforcement: { type: Boolean, default: true },

    // 10. Backup & Recovery
    backupEnabled: { type: Boolean, default: true },
    backupFrequency: { type: String, default: 'daily' },
    backupRetentionDays: { type: Number, default: 30 },
    backupLocation: { type: String, default: 'local' },
    remoteCloudSync: { type: Boolean, default: true },
    oneClickRestoreEnabled: { type: Boolean, default: true },

    // 11. API & Integrations
    publicRestApiEnabled: { type: Boolean, default: true },
    webhooksEnabled: { type: Boolean, default: true },
    rateLimitHeadersEnabled: { type: Boolean, default: true },
    cloudinaryActive: { type: Boolean, default: true },
    storageProvider: { type: String, default: 'cloudinary' },
    storageBucket: { type: String, default: '' },
    thirdPartyLmsSync: { type: Boolean, default: false },

    // 12. Email & SMS Configuration
    smtpEnabled: { type: Boolean, default: true },
    contactEmail: { type: String, default: 'support@emareicthub.com' },
    emailFromName: { type: String, default: 'Emare E-Learning' },
    emailFromAddress: { type: String, default: 'support@emareicthub.com' },
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpUsername: { type: String, default: '' },
    smtpPassword: { type: String, default: '' },
    smtpSecure: { type: Boolean, default: true },
    smsProviderActive: { type: Boolean, default: false },

    // 13. Maintenance Mode
    maintenanceMode: { type: Boolean, default: false },
    maintenanceBannerText: { type: String, default: 'System is undergoing scheduled maintenance. Please check back soon.' },
    ipExclusionList: { type: String, default: '127.0.0.1' },
    scheduledMaintenanceEnabled: { type: Boolean, default: false },

    // 14. Audit Logs & Monitoring
    auditLoggingActive: { type: Boolean, default: true },
    telemetryEnabled: { type: Boolean, default: true },
    crashReportingEnabled: { type: Boolean, default: true },
    dbHealthMonitorActive: { type: Boolean, default: true },
    autoFlushCache: { type: Boolean, default: false },

    // Metadata history per setting
    settingLogs: [{
        key: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        updatedBy: { type: String, default: 'Admin User' },
        updatedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now }
    }],
    settingMeta: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
