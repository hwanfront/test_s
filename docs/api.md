# Core AI Analysis MVP - API Documentation

**Version:** 1.0.0  
**Last Updated:** 2024-12-19  
**Base URL:** `https://your-app-domain.com/api`

## Overview

The Core AI Analysis MVP provides REST API endpoints for analyzing legal documents and terms of service using AI-powered risk assessment. The API is designed with privacy-first principles and follows GDPR/CCPA compliance standards.

## Authentication

All API endpoints require authentication using NextAuth.js session-based authentication.

### Headers
```
Authorization: Bearer <session-token>
Content-Type: application/json
```

### Authentication Flow
1. Sign in through OAuth2 providers (Google, Naver)
2. Receive session token
3. Include token in all API requests

## Rate Limiting

- **Analysis endpoints:** 10 requests per hour per user
- **Privacy endpoints:** 5 requests per hour per user  
- **Other endpoints:** 100 requests per hour per user

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error context",
    "timestamp": "2024-12-19T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Core Endpoints

### Analysis Endpoints

#### POST /api/analysis/submit
Submit text content for AI analysis.

**Request Body:**
```json
{
  "content": "Terms of service text to analyze...",
  "options": {
    "priority": "standard",
    "includeRiskScore": true,
    "analysisDepth": "comprehensive"
  },
  "metadata": {
    "source": "upload",
    "filename": "terms.txt"
  }
}
```

**Response:**
```json
{
  "sessionId": "session_abc123",
  "status": "queued",
  "estimatedTimeMs": 30000,
  "expiresAt": "2024-12-20T10:30:00Z",
  "message": "Analysis request submitted successfully"
}
```

#### GET /api/analysis/status/{sessionId}
Get the current status of an analysis session.

**Response:**
```json
{
  "sessionId": "session_abc123",
  "status": "processing",
  "progress": 65,
  "estimatedTimeRemaining": 15000,
  "message": "Analyzing document structure..."
}
```

#### GET /api/analysis/results/{sessionId}
Retrieve analysis results for a completed session.

**Response:**
```json
{
  "session": {
    "id": "session_abc123",
    "status": "completed",
    "riskLevel": "medium",
    "riskScore": 75,
    "confidenceScore": 87,
    "processingTimeMs": 28500,
    "totalRisks": 12,
    "createdAt": "2024-12-19T10:30:00Z",
    "completedAt": "2024-12-19T10:30:28Z",
    "expiresAt": "2024-12-20T10:30:00Z"
  },
  "summary": {
    "overallRisk": "medium",
    "totalRisks": 12,
    "riskDistribution": {
      "critical": 1,
      "high": 3,
      "medium": 5,
      "low": 3
    },
    "mainConcerns": [
      "Data collection practices",
      "User liability clauses",
      "Termination conditions"
    ]
  },
  "risks": [
    {
      "id": "risk_001",
      "type": "data_collection",
      "severity": "high",
      "title": "Excessive Data Collection",
      "description": "The terms allow collection of sensitive personal data without clear justification",
      "quote": "We may collect any information you provide...",
      "explanation": "This clause is overly broad and may violate privacy regulations",
      "confidence_score": 0.92,
      "suggestions": [
        "Limit data collection to necessary purposes only",
        "Provide clear justification for each data type"
      ],
      "position": {
        "start": 1250,
        "end": 1380
      }
    }
  ]
}
```

#### DELETE /api/analysis/{sessionId}
Delete an analysis session and all associated data.

**Response:**
```json
{
  "message": "Analysis session deleted successfully",
  "sessionId": "session_abc123",
  "deletedAt": "2024-12-19T10:35:00Z"
}
```

### Authentication Endpoints

#### GET /api/auth/session
Get current user session information.

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://example.com/avatar.jpg",
    "provider": "google"
  },
  "expires": "2024-12-20T10:30:00Z",
  "quota": {
    "dailyLimit": 10,
    "used": 3,
    "remaining": 7,
    "resetsAt": "2024-12-20T00:00:00Z"
  }
}
```

#### POST /api/auth/signout
Sign out the current user.

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

### Quota Management Endpoints

#### GET /api/quota/current
Get current quota usage for the authenticated user.

**Response:**
```json
{
  "userId": "user_123",
  "dailyLimit": 10,
  "used": 3,
  "remaining": 7,
  "resetTime": "2024-12-20T00:00:00Z",
  "quotaType": "free",
  "upgradeAvailable": true
}
```

#### GET /api/quota/history
Get quota usage history.

**Query Parameters:**
- `days` (optional): Number of days to retrieve (default: 30, max: 90)

**Response:**
```json
{
  "usage": [
    {
      "date": "2024-12-19",
      "used": 5,
      "limit": 10,
      "analysisCount": 3
    }
  ],
  "totalDays": 30,
  "averageDaily": 4.2
}
```

## Privacy & Compliance Endpoints

### Privacy Audit

#### GET /api/privacy/audit
Get privacy compliance audit status.

**Response:**
```json
{
  "auditId": "audit_123",
  "status": "completed",
  "complianceScore": 95,
  "lastAuditDate": "2024-12-19T10:00:00Z",
  "findings": [
    {
      "category": "data_retention",
      "status": "compliant",
      "details": "Data retention policies properly implemented"
    }
  ],
  "recommendations": []
}
```

#### POST /api/privacy/audit
Request a new privacy compliance audit.

**Request Body:**
```json
{
  "auditType": "full",
  "includeSensitiveData": false
}
```

**Response:**
```json
{
  "auditId": "audit_124",
  "status": "queued",
  "estimatedCompletionTime": "2024-12-19T10:45:00Z",
  "message": "Privacy audit initiated successfully"
}
```

### Data Export

#### POST /api/privacy/export
Request export of user data.

**Request Body:**
```json
{
  "format": "json",
  "includeAnalysisHistory": true,
  "includePersonalData": true,
  "deliveryMethod": "download"
}
```

**Response:**
```json
{
  "exportId": "export_123",
  "status": "queued",
  "estimatedCompletionTime": "2024-12-19T10:35:00Z",
  "format": "json",
  "downloadUrl": null
}
```

#### GET /api/privacy/export/{exportId}
Get status of a data export request.

**Response:**
```json
{
  "exportId": "export_123",
  "status": "completed",
  "format": "json",
  "fileSize": 2048576,
  "downloadUrl": "https://secure-storage.com/exports/export_123.json",
  "expiresAt": "2024-12-26T10:35:00Z",
  "createdAt": "2024-12-19T10:30:00Z"
}
```

### Data Deletion

#### POST /api/privacy/delete
Request deletion of user data.

**Request Body:**
```json
{
  "deleteType": "complete",
  "retainLegalRequirements": true,
  "confirmationToken": "confirm_abc123"
}
```

**Response:**
```json
{
  "deletionId": "deletion_123",
  "status": "queued",
  "estimatedCompletionTime": "2024-12-19T11:00:00Z",
  "recoveryPeriodDays": 30,
  "message": "Data deletion request submitted successfully"
}
```

#### GET /api/privacy/delete/{deletionId}
Get status of a data deletion request.

**Response:**
```json
{
  "deletionId": "deletion_123",
  "status": "completed",
  "completedAt": "2024-12-19T10:45:00Z",
  "deletedDataTypes": [
    "analysis_sessions",
    "user_preferences",
    "quota_history"
  ],
  "retainedDataTypes": [
    "audit_logs"
  ],
  "recoveryDeadline": "2024-01-18T10:45:00Z"
}
```

## Content Validation Endpoints

#### POST /api/content-validation/analyze
Validate content before analysis.

**Request Body:**
```json
{
  "content": "Content to validate...",
  "validationType": "terms_of_service"
}
```

**Response:**
```json
{
  "isValid": true,
  "contentType": "terms_of_service",
  "language": "en",
  "wordCount": 1250,
  "estimatedAnalysisTime": 30000,
  "warnings": [],
  "recommendations": [
    "Content appears to be well-structured for analysis"
  ]
}
```

## Text Preprocessing Endpoints

#### POST /api/preprocessing/clean
Clean and preprocess text content.

**Request Body:**
```json
{
  "content": "Raw text content...",
  "options": {
    "removeFormatting": true,
    "normalizeWhitespace": true,
    "preserveStructure": true
  }
}
```

**Response:**
```json
{
  "originalLength": 5000,
  "processedLength": 4850,
  "processedContent": "Cleaned text content...",
  "appliedTransformations": [
    "whitespace_normalization",
    "formatting_removal"
  ],
  "warnings": []
}
```

## Data Retention Policies

#### GET /api/data-retention/policies
Get current data retention policies.

**Response:**
```json
{
  "policies": [
    {
      "dataType": "analysis_sessions",
      "retentionPeriod": "24 hours",
      "autoDeleteEnabled": true,
      "complianceRequirement": "GDPR Article 5"
    }
  ],
  "defaultRetentionPeriod": "24 hours",
  "lastUpdated": "2024-12-19T10:00:00Z"
}
```

## WebSocket Events (Real-time Updates)

### Connection
```javascript
const ws = new WebSocket('wss://your-app-domain.com/api/ws')
```

### Events

#### analysis_progress
Real-time analysis progress updates.

```json
{
  "event": "analysis_progress",
  "sessionId": "session_abc123",
  "progress": 65,
  "stage": "risk_assessment",
  "estimatedTimeRemaining": 15000
}
```

#### analysis_complete
Analysis completion notification.

```json
{
  "event": "analysis_complete",
  "sessionId": "session_abc123",
  "status": "completed",
  "riskLevel": "medium",
  "totalRisks": 12
}
```

#### quota_warning
Quota usage warnings.

```json
{
  "event": "quota_warning",
  "userId": "user_123",
  "remaining": 2,
  "threshold": "80%",
  "resetsAt": "2024-12-20T00:00:00Z"
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { CoreAIAnalysisClient } from '@core-ai-analysis/client'

const client = new CoreAIAnalysisClient({
  baseUrl: 'https://your-app-domain.com/api',
  authToken: 'your-session-token'
})

// Submit analysis
const analysis = await client.analysis.submit({
  content: 'Terms of service text...',
  options: { priority: 'standard' }
})

// Get results
const results = await client.analysis.getResults(analysis.sessionId)
```

### Python
```python
from core_ai_analysis import Client

client = Client(
    base_url='https://your-app-domain.com/api',
    auth_token='your-session-token'
)

# Submit analysis
analysis = client.analysis.submit(
    content='Terms of service text...',
    options={'priority': 'standard'}
)

# Get results
results = client.analysis.get_results(analysis['sessionId'])
```

## Testing

### Test Environment
- **Base URL:** `https://test.your-app-domain.com/api`
- **Rate Limits:** 1000 requests per hour
- **Data Retention:** 1 hour (auto-delete)

### Test Accounts
```json
{
  "testUser1": {
    "email": "test1@example.com",
    "quota": 100,
    "features": ["full_analysis", "privacy_features"]
  }
}
```

## Changelog

### v1.0.0 (2024-12-19)
- Initial API release
- Core analysis functionality
- Privacy compliance features
- Authentication and quota management

## Support

- **Documentation:** [https://docs.your-app-domain.com](https://docs.your-app-domain.com)
- **Issues:** [https://github.com/your-org/core-ai-analysis/issues](https://github.com/your-org/core-ai-analysis/issues)
- **Email:** api-support@your-app-domain.com

## Legal

This API is provided under the MIT License. See [LICENSE](LICENSE) for details.

Privacy policy: [https://your-app-domain.com/privacy](https://your-app-domain.com/privacy)
Terms of service: [https://your-app-domain.com/terms](https://your-app-domain.com/terms)